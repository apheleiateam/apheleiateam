import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { brandAtlas, createFlame, loadModel, normalize, restyle } from './models.js'

/*
  3D models that live in the page background, each pinned to a section anchor
  (same screen → world mapping as the particles) and loaded only when that
  section gets close:

    · Principles  — a marble column carrying the eternal green flame
    · Contact     — a ringed planet and a lime-veined lava planet orbiting the portal
    · Team        — an astronaut drifting along the galaxy orbit, waving hello

  Models render in their own pass (crisp, not bloomed); the flame renders in the
  bloom pass so it glows.
*/

const MARBLE = { color: '#e7efe3', roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: '#dcebd6' }

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

export function createModelLayer(gl, bloomScene) {
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(gl)
  const room = new RoomEnvironment()
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.8
  const hemi = new THREE.HemisphereLight('#ffffff', '#1c2a1e', 1.1)
  const key = new THREE.DirectionalLight('#ffffff', 2.2)
  key.position.set(3, 5, 6)
  const rim = new THREE.DirectionalLight('#bcfa03', 1.6)
  rim.position.set(-5, 2, -4)
  const flameLight = new THREE.PointLight('#9cf06b', 0, 6, 1.6)
  scene.add(hemi, key, rim, flameLight)

  const flame = createFlame()
  bloomScene.add(flame.mesh)

  const slots = {
    column: { anchor: '.principles__stage', url: '/models/column.glb', obj: null, loading: false },
    ringed: { anchor: '.cta', url: '/models/planet-ringed.glb', obj: null, loading: false },
    lava: { anchor: '.cta', url: '/models/planet-lava.glb', obj: null, loading: false },
    astronaut: { anchor: '.team__stage', url: '/models/astronaut.glb', obj: null, loading: false, mixer: null, actions: null },
  }

  const prepare = {
    column(gltf) {
      restyle(gltf.scene, {}, MARBLE)
      const o = normalize(gltf.scene, 1, { base: true })
      o.scale.y = 1.7 // a taller, more classical proportion
      return o
    },
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
    astronaut(gltf, slot) {
      restyle(gltf.scene, {
        SciFi_Light_Accent: { color: '#bcfa03', roughness: 0.4, emissive: '#5f8a00', emissiveIntensity: 0.35 },
        SciFi_Light: { color: '#eef4ec', roughness: 0.5, clearcoat: 0.5 },
        SciFi_MainDark: { color: '#0d1710', roughness: 0.6 },
        SciFi_Main: { color: '#1d3324', roughness: 0.55 },
        Grey: { color: '#141c16', roughness: 0.3, metalness: 0.4, clearcoat: 1 },
      })
      const o = normalize(gltf.scene, 1)
      slot.mixer = new THREE.AnimationMixer(gltf.scene)
      const clip = (n) => gltf.animations.find((a) => a.name === n)
      slot.actions = { idle: slot.mixer.clipAction(clip('Idle')), wave: slot.mixer.clipAction(clip('Wave')) }
      slot.actions.idle.play()
      slot.waveAt = 0
      return o
    },
  }

  const ensure = (name) => {
    const slot = slots[name]
    if (slot.obj || slot.loading) return
    slot.loading = true
    loadModel(slot.url)
      .then((gltf) => {
        slot.obj = prepare[name](gltf, slot)
        slot.obj.visible = false
        scene.add(slot.obj)
      })
      .catch(() => {}) // a missing model just means no model
  }

  // How present is an anchor on screen (1 = centred, 0 = well off-screen)?
  const presence = (r, vh) => {
    const d = Math.abs(r.top + r.height / 2 - vh / 2)
    return smooth01(1 - (d - r.height * 0.35) / (vh * 0.75))
  }

  const wave = (slot, now) => {
    const { idle, wave: w } = slot.actions
    w.reset().setLoop(THREE.LoopOnce, 1)
    w.clampWhenFinished = false
    w.crossFadeFrom(idle, 0.35, false).play()
    slot.waveAt = now
    const back = () => {
      idle.reset().crossFadeFrom(w, 0.45, false).play()
      slot.mixer.removeEventListener('finished', back)
    }
    slot.mixer.addEventListener('finished', back)
  }

  let lastAnchors = {}
  const refreshAnchors = () => {
    lastAnchors = {}
    for (const [name, s] of Object.entries(slots)) lastAnchors[name] = document.querySelector(s.anchor)
  }
  refreshAnchors()

  /* per frame: ctx = { t, dt, k (world units per px), w, h, reduced } */
  const update = ({ t, dt, k, w, h, reduced }) => {
    const toWorld = (x, y) => [(x - w / 2) * k, -(y - h / 2) * k]
    for (const name of Object.keys(slots)) {
      if (!lastAnchors[name]?.isConnected) refreshAnchors()
    }

    /* column + flame */
    {
      const el = lastAnchors.column
      const slot = slots.column
      let p = 0
      if (el) {
        const r = el.getBoundingClientRect()
        if (Math.abs(r.top + r.height / 2 - h / 2) < h * 2) ensure('column')
        p = presence(r, h)
        const height = r.height * 0.62 * k
        const [x, y] = toWorld(r.left + r.width / 2, r.bottom - r.height * 0.06)
        if (slot.obj) {
          slot.obj.visible = p > 0.01
          slot.obj.position.set(x, y, 0)
          slot.obj.scale.setScalar((height / 1.7) * (0.85 + 0.15 * p))
          slot.obj.scale.y = height * (0.85 + 0.15 * p)
          slot.obj.rotation.y = reduced ? 0.4 : t * 0.15
        }
        const top = y + height * (0.85 + 0.15 * p)
        flame.mesh.position.set(x, top - height * 0.02, 0.05)
        flame.mesh.scale.set(height * 0.55, height * 0.75, 1)
        flameLight.position.set(x, top + height * 0.2, 0.6)
      }
      flame.mat.uniforms.uTime.value = reduced ? 1 : t
      flame.mat.uniforms.uAlpha.value = slot.obj ? p : 0
      flameLight.intensity = slot.obj ? 3 * p : 0
    }

    /* planets orbiting the CTA portal */
    {
      const el = lastAnchors.ringed
      if (el) {
        const r = el.getBoundingClientRect()
        if (Math.abs(r.top + r.height / 2 - h / 2) < h * 2) {
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

    /* astronaut along the galaxy orbit around the team ring */
    {
      const el = lastAnchors.astronaut
      const slot = slots.astronaut
      if (el) {
        const r = el.getBoundingClientRect()
        if (Math.abs(r.top + r.height / 2 - h / 2) < h * 1.6) ensure('astronaut')
        const p = presence(r, h)
        if (slot.obj) {
          const [cx, cy] = toWorld(r.left + r.width / 2, r.top + r.height / 2)
          const R = Math.min(r.width * 0.46, 620) * k
          const a = (reduced ? 0.6 : t * 0.07) + 0.6
          slot.obj.visible = p > 0.01
          slot.obj.position.set(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.28 + Math.sin(t * 0.8) * 0.06, Math.sin(a) * 0.6)
          slot.obj.scale.setScalar(r.height * 0.62 * k * (0.8 + 0.2 * p))
          slot.obj.rotation.set(Math.sin(t * 0.5) * 0.12, -0.5 + Math.sin(t * 0.3) * 0.4, Math.sin(t * 0.4) * 0.18 - 0.1)
          if (!reduced) slot.mixer.update(dt)
          const now = t
          if (p > 0.6 && now - slot.waveAt > 9) wave(slot, now)
        }
      }
    }
  }

  const setTheme = (palette) => {
    const dark = palette.bg === '#030503'
    flame.setTheme(dark)
    hemi.intensity = dark ? 1.0 : 1.4
    key.intensity = dark ? 2.2 : 2.6
    rim.intensity = dark ? 1.6 : 0.6
    scene.environmentIntensity = dark ? 0.7 : 1
  }

  const dispose = () => {
    scene.environment?.dispose()
    pmrem.dispose()
    bloomScene.remove(flame.mesh)
    flame.mesh.geometry.dispose()
    flame.mat.dispose()
  }

  return { scene, update, setTheme, dispose }
}
