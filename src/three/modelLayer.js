import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { rectOf } from '../layout.js'
import { buildBrandMark } from './brandMark.js'
import { COLUMN_TOP, MARBLE_URL, buildColumn } from './column.js'
import { brandAtlas, createFlame, loadModel, normalize } from './models.js'
import { whenIdle } from './utils.js'

/*
  3D objects that live in the page background, each pinned to a section anchor
  (same screen → world mapping as the particles) and created only when that
  section gets close:

    · Principles  — a detailed Ionic marble column with the eternal flame + embers
    · Contact     — a ringed planet and a lime-veined lava planet orbiting the portal
    · Team        — the Apheleia mark in 3D, orbiting the team ring

  Solid objects render in their own crisp pass; the flame and embers render in
  the bloom pass so they glow.

  Nothing is built on demand mid-scroll: prewarm() builds every object and
  compiles its shaders (in parallel, off the main thread where supported) during
  idle time right after the page loads. ensure() remains as a fallback.
*/

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/* ---------- embers rising from the flame (bloom pass) ---------- */
function createEmbers(count = 70) {
  const seeds = new Float32Array(count * 4)
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random()
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uBase: { value: new THREE.Vector3() }, uSize: { value: 1 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform float uPixelRatio; uniform vec3 uBase;
      attribute vec4 aSeed;
      varying float vA;
      void main() {
        float life = fract(uTime * (0.18 + aSeed.x * 0.22) + aSeed.y);
        vec3 p = uBase;
        p.y += life * uSize * 1.9;
        p.x += (sin(life * 9.0 + aSeed.z * 30.0) * 0.12 + (aSeed.w - 0.5) * 0.35) * uSize * (0.3 + life);
        p.z += (aSeed.z - 0.5) * 0.2 * uSize;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.5 + aSeed.w * 2.5) * uPixelRatio * (10.0 / -mv.z);
        vA = smoothstep(0.0, 0.1, life) * (1.0 - life);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * uAlpha;
        vec3 col = mix(vec3(0.74, 0.98, 0.01), vec3(1.0, 1.0, 0.85), 0.4);
        gl_FragColor = vec4(col * a * 1.6, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  })
  const points = new THREE.Points(geom, mat)
  points.frustumCulled = false
  points.renderOrder = 21
  return { points, mat, dispose: () => (geom.dispose(), mat.dispose()) }
}

export function createModelLayer(gl, bloomScene) {
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(gl)
  const room = new RoomEnvironment()
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.8
  const hemi = new THREE.HemisphereLight('#ffffff', '#1c2a1e', 1.1)
  const key = new THREE.DirectionalLight('#ffffff', 2.2)
  key.position.set(6, 3.5, 3.5) // raking from the side so flutes and mouldings read
  const rim = new THREE.DirectionalLight('#bcfa03', 1.6)
  rim.position.set(-5, 2, -4)
  const flameLight = new THREE.PointLight('#bcfa03', 0, 4, 1.4)
  scene.add(hemi, key, rim, flameLight)

  const flame = createFlame()
  const embers = createEmbers()
  embers.mat.uniforms.uPixelRatio.value = gl.getPixelRatio()
  bloomScene.add(flame.mesh, embers.points)

  const loadMarble = () =>
    new THREE.TextureLoader()
      .loadAsync(MARBLE_URL)
      .then((t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.anisotropy = 4
        gl.initTexture(t) // upload now, not on first draw
        return t
      })
      .catch(() => null)

  const prepare = {
    ringed(gltf) {
      gltf.scene.traverse((m) => {
        if (!m.isMesh || !m.material.map) return
        const { map } = brandAtlas(m.material.map)
        m.material = new THREE.MeshStandardMaterial({ map, roughness: 0.65 })
      })
      return normalize(gltf.scene, 1)
    },
    lava(gltf) {
      gltf.scene.traverse((m) => {
        if (!m.isMesh || !m.material.map) return
        const { map, emissiveMap } = brandAtlas(m.material.map)
        m.material = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: 0.8 })
      })
      return normalize(gltf.scene, 1)
    },
  }

  const slots = {
    column: { anchor: '.principles__stage', make: async () => buildColumn(await loadMarble()) },
    ringed: { anchor: '.cta', make: async () => prepare.ringed(await loadModel('/models/planet-ringed.glb')) },
    lava: { anchor: '.cta', make: async () => prepare.lava(await loadModel('/models/planet-lava.glb')) },
    mark: { anchor: '.team__stage', make: async () => buildBrandMark() },
  }
  for (const s of Object.values(slots)) Object.assign(s, { obj: null, ready: null })

  // build (or load) one object; resolves when it is in the scene
  const ensure = (name) => {
    const slot = slots[name]
    slot.ready ??= slot
      .make()
      .then((obj) => {
        obj.visible = false
        slot.obj = obj
        scene.add(obj)
      })
      .catch(() => {}) // a missing model just means no model
    return slot.ready
  }

  // Build everything in idle time, one object per idle slot, then compile all
  // shaders together — so scrolling to a section never waits on setup work.
  let disposed = false
  const prewarm = async (camera, { fast = false } = {}) => {
    const wait = () => whenIdle(fast ? 100 : 1500)
    for (const name of ['mark', 'column', 'ringed', 'lava']) {
      await wait()
      if (disposed) return
      await ensure(name)
    }
    await wait()
    if (disposed) return
    // queue the shaders now (non-blocking); they are ready long before the visitor scrolls there
    gl.compile(scene, camera)
  }

  // How present is an anchor on screen (1 = centred, 0 = well off-screen)?
  const presence = (r, vh) => {
    const d = Math.abs(r.top + r.height / 2 - vh / 2)
    return smooth01(1 - (d - r.height * 0.35) / (vh * 0.75))
  }
  const near = (r, vh, n = 2) => Math.abs(r.top + r.height / 2 - vh / 2) < vh * n

  let anchors = {}
  const refreshAnchors = () => {
    anchors = {}
    for (const [name, s] of Object.entries(slots)) anchors[name] = document.querySelector(s.anchor)
  }
  refreshAnchors()

  /* per frame: ctx = { t, dt, k (world units per px), w, h, reduced } */
  const update = ({ t, k, w, h, reduced }) => {
    const toWorld = (x, y) => [(x - w / 2) * k, -(y - h / 2) * k]
    if (!anchors.column?.isConnected || !anchors.ringed?.isConnected || !anchors.mark?.isConnected) refreshAnchors()

    /* column + flame + embers */
    {
      const el = anchors.column
      const slot = slots.column
      let p = 0
      if (el) {
        const r = rectOf(el)
        if (near(r, h)) ensure('column')
        p = presence(r, h)
        const height = r.height * 0.74 * k // world height of the column up to the bowl rim
        const s = (height / COLUMN_TOP) * (0.9 + 0.1 * p)
        const [x, y] = toWorld(r.left + r.width / 2, r.bottom - r.height * 0.04)
        if (slot.obj) {
          slot.obj.visible = p > 0.01
          slot.obj.position.set(x, y, 0)
          slot.obj.scale.setScalar(s)
          slot.obj.rotation.y = reduced ? 0.5 : 0.5 + Math.sin(t * 0.25) * 0.45
        }
        const top = y + COLUMN_TOP * s
        flame.mesh.position.set(x, top - 0.08 * s, 0.05)
        flame.mesh.scale.set(2.1 * s, 2.2 * s, 1)
        embers.mat.uniforms.uBase.value.set(x, top + 0.15 * s, 0.1)
        embers.mat.uniforms.uSize.value = s
        flameLight.position.set(x, top + 0.45 * s, 0.9 * s)
        flameLight.distance = 3.5 * s
      }
      const on = slot.obj ? p : 0
      flame.mat.uniforms.uTime.value = reduced ? 1 : t
      flame.mat.uniforms.uAlpha.value = on
      embers.mat.uniforms.uTime.value = reduced ? 0 : t
      embers.mat.uniforms.uAlpha.value = reduced ? 0 : on
      flameLight.intensity = 4 * on
    }

    /* planets orbiting the CTA portal */
    {
      const el = anchors.ringed
      if (el) {
        const r = rectOf(el)
        if (near(r, h)) {
          ensure('ringed')
          ensure('lava')
        }
        const p = presence(r, h)
        const [cx, cy] = toWorld(r.left + r.width / 2, r.top + r.height / 2)
        // an ellipse that hugs the card's edges, so the planets stay in view
        const rx = (r.width / 2 + Math.min(90, r.width * 0.06)) * k
        const ry = (r.height / 2 + 70) * k
        const orbit = (slot, phase, speed, size, spin) => {
          if (!slot.obj) return
          const a = (reduced ? 0 : t * speed) + phase
          const depth = Math.sin(a)
          slot.obj.visible = p > 0.01
          slot.obj.position.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, depth * 0.8)
          slot.obj.scale.setScalar(size * k * (0.75 + 0.25 * p) * (0.85 + 0.15 * depth))
          slot.obj.rotation.y = (reduced ? 0 : t) * spin
          slot.obj.rotation.z = 0.35
        }
        orbit(slots.ringed, 2.6, 0.1, Math.min(240, r.width * 0.19), 0.25)
        orbit(slots.lava, 5.6, 0.1, Math.min(130, r.width * 0.1), -0.4)
      }
    }

    /* the 3D mark, orbiting the team ring along the galaxy */
    {
      const el = anchors.mark
      const slot = slots.mark
      if (el) {
        const r = rectOf(el)
        if (near(r, h, 1.6)) ensure('mark')
        const p = presence(r, h)
        if (slot.obj) {
          const [cx, cy] = toWorld(r.left + r.width / 2, r.top + r.height / 2)
          const R = Math.min(r.width * 0.44, 600) * k
          const a = (reduced ? 0.4 : t * 0.09) + 0.4
          const depth = Math.sin(a)
          slot.obj.visible = p > 0.01
          slot.obj.position.set(cx + Math.cos(a) * R, cy + depth * R * 0.26 + Math.sin(t * 0.9) * 0.05, depth * 0.6)
          slot.obj.scale.setScalar(r.height * 0.42 * k * (0.8 + 0.2 * p) * (0.88 + 0.12 * depth))
          // rock rather than spin, so the A never turns edge-on
          slot.obj.rotation.set(Math.sin(t * 0.6) * 0.12, reduced ? 0.35 : 0.35 + Math.sin(t * 0.5) * 0.6, Math.sin(t * 0.45) * 0.08)
        }
      }
    }
  }

  const setTheme = (palette) => {
    const dark = palette.bg === '#030503'
    flame.setTheme(dark)
    hemi.intensity = dark ? 0.55 : 1.0
    key.intensity = dark ? 2.8 : 2.6
    rim.intensity = dark ? 1.8 : 0.7
    scene.environmentIntensity = dark ? 0.5 : 0.75
  }

  const dispose = () => {
    disposed = true
    scene.environment?.dispose()
    pmrem.dispose()
    bloomScene.remove(flame.mesh, embers.points)
    flame.mesh.geometry.dispose()
    flame.mat.dispose()
    embers.dispose()
    for (const s of Object.values(slots)) s.obj?.userData.dispose?.()
  }

  return { scene, update, setTheme, prewarm, dispose }
}
