import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { debugPrograms, dprFor, noteRenderer, quality } from '../perf.js'
import AdaptiveDpr from './AdaptiveDpr.jsx'
import Env from './Env.jsx'
import { precompile } from './precompile.js'
import { applyFlamePalette, makeFlameMaterial, makeGlass } from './glow.js'
import { loadModel, normalize, restyle } from './models.js'
import { PALETTES } from './palette.js'
import { TOP_D, TOP_W, makeBoardTexture, makeCardTexture, makeShadowTexture } from './textures.js'
import { easeOutBack, easeOutCubic, range, seeded, smooth, useInView, whenIdle } from './utils.js'

/*
  Scroll-driven story, progress p ∈ [0, 1]:
    0.00–0.25  Discover  — crosshair grid + liquid chrome sheet grows
    0.25–0.50  Design    — liquid settles into a board, scaffold cubes pop up
    0.50–0.75  Develop   — task cards fly in and land in their columns
    0.75–1.00  Launch    — camera settles isometric, cards lift, pulse rings
  Everything solid is glass (transmission) refracting an opaque flame-field floor.
*/

const BOARD_W = 5.8
const BOARD_D = 3.9
const BOARD_H = 0.24
const TOP_Y = BOARD_H / 2
const SIDEBAR_X = -1.42
const COLS = [-0.62, 0.78, 2.18]
const ROWS = [-0.62, 0.3, 1.22]
const CARD_W = 1.26
const CARD_D = 0.78
const SLOTS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [2, 1], [2, 2]]

const CAMERA_KEYS = [
  { p: 0.0, pos: [0.0, 10.5, 5.2], look: [0, 0, 0] },
  { p: 0.24, pos: [-2.2, 8.2, 8.4], look: [0, 0, 0] },
  { p: 0.5, pos: [4.6, 7.6, 7.4], look: [0.2, 0, 0.1] },
  { p: 0.76, pos: [7.4, 5.8, 5.4], look: [0.5, 0, 0.4] },
  { p: 1.0, pos: [7.0, 4.6, 4.4], look: [0.7, 0, 0.6] },
]

const DIM_ANCHORS = [[-3.4, 0, -2.4], [3.4, 0, -2.4], [3.7, 0, 0.1], [3.4, 0, 2.45], [-3.4, 0, 2.45], [-3.75, 0, -0.3]]
const DIM_BASE = [2400, 7731, 4190, 3398, 1288, 5126]
const DIM_RATE = [1240, -830, 610, 900, -420, 300]

/* ---------- progress driver: damped copy of the scroll target ---------- */
function Driver({ progress, shared }) {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1)
    shared.p = THREE.MathUtils.damp(shared.p, progress.current, 4.5, d)
    shared.t += d
  })
  return null
}

/* ---------- camera path + framing offset ---------- */
function CameraRig({ shared }) {
  const { camera, size } = useThree()
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), pos: new THREE.Vector3(), look: new THREE.Vector3() }), [])
  const last = useRef('')

  useFrame(() => {
    const p = shared.p
    let k = 0
    while (k < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[k + 1].p) k++
    const A = CAMERA_KEYS[k]
    const B = CAMERA_KEYS[k + 1]
    const t = smooth(p, A.p, B.p)
    tmp.pos.set(...A.pos).lerp(tmp.b.set(...B.pos), t)
    tmp.look.set(...A.look).lerp(tmp.a.set(...B.look), t)

    const aspect = size.width / size.height
    const pull = aspect < 0.8 ? 2.45 : aspect < 1.2 ? 1.6 : 1.3
    camera.position.copy(tmp.pos).sub(tmp.look).multiplyScalar(pull).add(tmp.look)
    camera.lookAt(tmp.look)

    const key = `${size.width}x${size.height}`
    if (last.current !== key) {
      last.current = key
      const { width: w, height: h } = size
      if (aspect < 0.8) camera.setViewOffset(w, h, 0, -h * 0.17, w, h)
      else if (w > 900) camera.setViewOffset(w, h, -w * 0.17, 0, w, h)
      else camera.clearViewOffset()
    }
    camera.updateMatrixWorld()
  })
  return null
}

/* ---------- 001 crosshair grid + technical corner brackets ---------- */
function Grid({ shared, palette }) {
  const mesh = useRef()
  const geom = useMemo(() => mergeGeometries([new THREE.BoxGeometry(0.15, 0.004, 0.014), new THREE.BoxGeometry(0.014, 0.004, 0.15)]), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), [])
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }), [])
  const points = useMemo(() => {
    const out = []
    for (let i = 0; i < 15; i++) for (let j = 0; j < 9; j++) out.push([(i - 7) * 0.55, (j - 4) * 0.55])
    return out
  }, [])
  const brackets = useMemo(() => {
    const pts = []
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx * 4.3
      const z = sz * 2.7
      pts.push(x + sx * 0.3, 0, z, x - sx * 1.7, 0, z)
      pts.push(x, 0, z + sz * 0.3, x, 0, z - sz * 1.2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    points.forEach(([x, z], i) => {
      o.position.set(x, -0.01, z)
      o.updateMatrix()
      mesh.current.setMatrixAt(i, o.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [points])

  useEffect(() => {
    mat.color.set(palette.line)
    lineMat.color.set(palette.line)
  }, [palette, mat, lineMat])

  useFrame(() => {
    const p = shared.p
    const o = smooth(p, 0, 0.05) * (1 - smooth(p, 0.46, 0.6))
    mat.opacity = o * 0.6
    lineMat.opacity = o * 0.8
    mesh.current.visible = o > 0.001
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[geom, mat, points.length]} />
      <lineSegments geometry={brackets} material={lineMat} />
    </group>
  )
}

/* ---------- 001 liquid chrome sheet ---------- */
// The waves are computed in the vertex shader (height + analytic-ish normal),
// so the sheet costs no CPU at all — it used to rewrite 6k vertices and
// recompute normals in JS every frame.
const LIQUID_GLSL = /* glsl */ `
  uniform float uLiquidT;
  uniform float uLiquidAmp;
  float liquidH(vec2 p) {
    return 0.3 * sin(1.25 * p.x + 1.1 * uLiquidT) * cos(1.05 * p.y - 0.8 * uLiquidT)
      + 0.12 * sin(1.9 * (p.x + 0.6 * p.y) + 1.4 * uLiquidT)
      + 0.05 * sin(3.2 * p.x - 2.4 * p.y + 2.1 * uLiquidT);
  }
`
function Liquid({ shared, palette }) {
  const mesh = useRef()
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(5.2, 3.4, 96, 64)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const uniforms = useMemo(() => ({ uLiquidT: { value: 0 }, uLiquidAmp: { value: 1 } }), [])
  const mat = useMemo(() => {
    const m = makeGlass({ thickness: 0.9, roughness: 0.04, ior: 1.5 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
${LIQUID_GLSL}`)
        .replace(
          '#include <beginnormal_vertex>',
          `float lh = liquidH(position.xz) * uLiquidAmp;
          const float le = 0.03;
          float ldx = (liquidH(position.xz + vec2(le, 0.0)) - liquidH(position.xz - vec2(le, 0.0))) / (2.0 * le) * uLiquidAmp;
          float ldz = (liquidH(position.xz + vec2(0.0, le)) - liquidH(position.xz - vec2(0.0, le))) / (2.0 * le) * uLiquidAmp;
          vec3 objectNormal = normalize(vec3(-ldx, 1.0, -ldz));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position.x, lh, position.z);
          #ifdef USE_ALPHAHASH
            vPosition = vec3(position);
          #endif`,
        )
    }
    m.customProgramCacheKey = () => 'liquid-sheet'
    return m
  }, [uniforms])
  useEffect(() => {
    mat.color.set(palette.liquid)
  }, [palette, mat])

  useFrame(() => {
    const { p, t } = shared
    mesh.current.visible = p < 0.47
    if (!mesh.current.visible) return
    const grow = 0.22 + 0.78 * smooth(p, 0, 0.17)
    mesh.current.scale.set(grow, 1, grow)
    mesh.current.position.y = THREE.MathUtils.lerp(0.45, TOP_Y + 0.02, smooth(p, 0.2, 0.42))
    uniforms.uLiquidT.value = t
    uniforms.uLiquidAmp.value = 1 - smooth(p, 0.2, 0.42)
  })

  return <mesh ref={mesh} geometry={geom} material={mat} />
}

/* ---------- 002 board, its UI surface and soft contact shadow ---------- */
function Board({ shared, palette, boardTex, shadowTex }) {
  const group = useRef()
  const geom = useMemo(() => new RoundedBoxGeometry(BOARD_W, BOARD_H, BOARD_D, 4, 0.12), [])
  const mat = useMemo(() => makeGlass({ thickness: 0.6, roughness: 0.24 }), [])
  const topMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }), [])
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), [])

  useEffect(() => {
    mat.color.set(palette.boardTint)
    topMat.map = boardTex
    topMat.needsUpdate = true
    shadowMat.map = shadowTex
    shadowMat.needsUpdate = true
  }, [palette, boardTex, shadowTex, mat, topMat, shadowMat])

  useFrame(() => {
    const p = shared.p
    const rise = smooth(p, 0.26, 0.44)
    group.current.visible = rise > 0.001
    group.current.position.y = THREE.MathUtils.lerp(-1.4, 0, rise)
    shadowMat.opacity = rise * 0.8
    topMat.opacity = smooth(p, 0.42, 0.54)
  })

  return (
    <group ref={group}>
      <mesh geometry={geom} material={mat} />
      <mesh position={[0, TOP_Y + 0.003, 0]} rotation-x={-Math.PI / 2} material={topMat}>
        <planeGeometry args={[TOP_W, TOP_D]} />
      </mesh>
      <mesh position={[0.25, -TOP_Y - 0.06, 0.25]} rotation-x={-Math.PI / 2} material={shadowMat}>
        <planeGeometry args={[9.5, 7]} />
      </mesh>
    </group>
  )
}

/* ---------- 002 scaffold cubes along the long edges ---------- */
function Scaffold({ shared, palette }) {
  const mesh = useRef()
  const PER = 14
  const geom = useMemo(() => new RoundedBoxGeometry(0.26, 0.26, 0.26, 2, 0.05), [])
  const mat = useMemo(() => makeGlass({ thickness: 0.3, roughness: 0.08 }), [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    mat.color.set(palette.cube)
  }, [palette, mat])

  useFrame(() => {
    const p = shared.p
    const vanish = smooth(p, 0.58, 0.68)
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < PER; i++) {
        const idx = s * PER + i
        const d = i * 0.007 + s * 0.02
        const k = easeOutBack(range(p, 0.3 + d, 0.4 + d)) * (1 - vanish)
        tmp.position.set(-2.6 + i * 0.4, TOP_Y - 0.13 + 0.26 * k, (s ? 1 : -1) * (BOARD_D / 2 + 0.3))
        tmp.scale.setScalar(Math.max(0.0001, k))
        tmp.updateMatrix()
        mesh.current.setMatrixAt(idx, tmp.matrix)
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geom, mat, PER * 2]} />
}

/* ---------- 003 task cards ---------- */
function Cards({ shared, palette, cardTexes }) {
  const refs = useRef([])
  const geom = useMemo(() => new RoundedBoxGeometry(CARD_W, 0.05, CARD_D, 2, 0.024), [])
  const plane = useMemo(() => new THREE.PlaneGeometry(CARD_W - 0.04, CARD_D - 0.04), [])
  const identity = useMemo(() => new THREE.Quaternion(), [])
  const data = useMemo(
    () =>
      SLOTS.map(([c, r], i) => {
        const rnd = seeded(i * 13 + 5)
        return {
          target: new THREE.Vector3(COLS[c], TOP_Y + 0.03, ROWS[r]),
          start: new THREE.Vector3(COLS[c] + (rnd() - 0.5) * 3.5, 5.5 + rnd() * 2.5, ROWS[r] - 2.5 - rnd() * 2),
          q0: new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4)),
          color: i % 4,
          delay: i * 0.018,
        }
      }),
    [],
  )
  const mats = useMemo(() => data.map(() => makeGlass({ thickness: 0.22, roughness: 0.16 })), [data])
  const topMats = useMemo(() => data.map(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true })), [data])

  useEffect(() => {
    data.forEach((d, i) => {
      mats[i].color.set(palette.cards[d.color].bg)
      topMats[i].map = cardTexes[i]
      topMats[i].needsUpdate = true
    })
  }, [palette, cardTexes, data, mats, topMats])

  useFrame(() => {
    const { p, t } = shared
    const lift = smooth(p, 0.8, 0.94)
    data.forEach((d, i) => {
      const g = refs.current[i]
      if (!g) return
      const k = range(p, 0.5 + d.delay, 0.62 + d.delay)
      g.visible = k > 0
      if (!g.visible) return
      const e = easeOutCubic(k)
      g.position.lerpVectors(d.start, d.target, e)
      g.position.y += Math.sin(Math.PI * e) * 0.5 + lift * (0.1 + 0.035 * Math.sin(t * 1.6 + i * 0.9))
      g.quaternion.slerpQuaternions(d.q0, identity, easeOutCubic(range(p, 0.5 + d.delay, 0.66 + d.delay)))
    })
  })

  return data.map((d, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} visible={false}>
      <mesh geometry={geom} material={mats[i]} />
      <mesh geometry={plane} material={topMats[i]} position={[0, 0.026, 0]} rotation-x={-Math.PI / 2} />
    </group>
  ))
}

/* ---------- 004 launch pulses ---------- */
function Pulse({ shared, palette }) {
  const rings = useRef([])
  const geom = useMemo(() => new THREE.RingGeometry(0.985, 1, 128), [])
  const mats = useMemo(() => [0, 1].map(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })), [])
  useEffect(() => {
    mats.forEach((m) => {
      m.color.set(palette.pulse)
      m.blending = palette.bg === '#030503' ? THREE.AdditiveBlending : THREE.NormalBlending
      m.needsUpdate = true
    })
  }, [palette, mats])

  useFrame(() => {
    const { p, t } = shared
    const on = smooth(p, 0.78, 0.88)
    rings.current.forEach((r, i) => {
      if (!r) return
      const phase = (t * 0.35 + i * 0.5) % 1
      r.scale.setScalar(1.6 + phase * 2.4)
      mats[i].opacity = on * (1 - phase) * 0.45
      r.visible = on > 0.001
    })
  })

  return mats.map((m, i) => (
    <mesh key={i} ref={(el) => (rings.current[i] = el)} geometry={geom} material={m} rotation-x={-Math.PI / 2} position={[0.4, TOP_Y + 0.01, 0.3]} />
  ))
}

/* ---------- flame-field floor: the light every glass piece refracts ---------- */
function Floor({ shared, palette }) {
  const mat = useMemo(makeFlameMaterial, [])
  const { gl } = useThree()
  useEffect(() => {
    applyFlamePalette(mat, palette)
    mat.uniforms.uScale.value.set(12.5, 16)
    gl.setClearColor(palette.bg, 1)
  }, [mat, palette, gl])
  useFrame(() => {
    const { p, t } = shared
    mat.uniforms.uTime.value = t
    const stage = 0.55 + 0.35 * smooth(p, 0.2, 0.45) + 0.25 * smooth(p, 0.76, 0.9) * (0.85 + 0.15 * Math.sin(t * 2.2))
    mat.uniforms.uIntensity.value = palette.flame.intensity * stage
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0.3, -0.42, 0.2]} material={mat}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  )
}

/* ---------- 004 the starship: hovers over the finished board, then launches ---------- */
const plumeVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const plumeFrag = /* glsl */ `
  uniform float uPower;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;                       // 1 at the nozzle, 0 at the tip
    float flicker = 0.85 + 0.15 * sin(uTime * 40.0 + along * 20.0);
    float a = pow(along, 1.6) * uPower * flicker;
    vec3 col = mix(uColor, vec3(1.0, 1.0, 0.92), pow(along, 6.0));
    gl_FragColor = vec4(col * a, a);
  }
`

function Starship({ shared }) {
  const { gl, scene: world, camera } = useThree()
  const group = useRef()
  const pivot = useRef()
  const [ship, setShip] = useState(null)
  const plume = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.16, 1, 20, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5)
    const mat = new THREE.ShaderMaterial({
      vertexShader: plumeVert,
      fragmentShader: plumeFrag,
      uniforms: { uPower: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#bcfa03') } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    return { geom, mat }
  }, [])
  const glow = useMemo(() => new THREE.PointLight('#bcfa03', 0, 5, 1.5), [])

  useEffect(() => {
    let live = true
    loadModel('/models/starship.glb')
      .then((gltf) => {
        if (!live) return
        const scene = gltf.scene.clone(true)
        restyle(scene, {
          White: { color: '#eef4ec', roughness: 0.22, metalness: 0.1 },
          Black: { color: '#0c140e', emissive: '#bcfa03', emissiveIntensity: 1.3, roughness: 0.4 },
        })
        const obj = normalize(scene, 1.7)
        setShip(obj)
        // compile its shaders now (in parallel where supported), not when it first appears
        precompile(gl, obj, camera, world)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const { p, t } = shared
    const appear = smooth(p, 0.62, 0.74)
    const launch = range(p, 0.8, 0.98)
    const boost = launch * launch
    g.visible = appear > 0.001 && launch < 0.995
    // hover over the board, then climb away toward the far corner
    g.position.set(
      1.1 - boost * 2.2,
      THREE.MathUtils.lerp(4.5, 1.25, easeOutCubic(appear)) + Math.sin(t * 1.6) * 0.05 * (1 - launch) + boost * 7,
      -0.2 - boost * 4,
    )
    // the model's nose is +z: pitch it up (local X), then yaw it toward where it flies
    pivot.current.rotation.set(-0.12 - launch * 0.95, -2.6, Math.sin(t * 1.2) * 0.04 * (1 - launch), 'YXZ')
    const power = 0.25 * appear + 1.6 * smooth(p, 0.78, 0.86)
    plume.mat.uniforms.uPower.value = power
    plume.mat.uniforms.uTime.value = t
    // the light lives outside the (often hidden) ship group: a light that appears or
    // disappears changes the scene's light count, which recompiles EVERY lit shader
    glow.intensity = g.visible ? power * 2.2 : 0
    if (g.visible) pivot.current.localToWorld(glow.position.set(0, 0, -1))
  })

  return (
    <>
      <primitive object={glow} />
      <group ref={group} visible={false}>
        <group ref={pivot}>
          {ship && <primitive object={ship} />}
          <mesh geometry={plume.geom} material={plume.mat} position={[0, 0.02, -0.82]} scale={[1, 1, 1.6]} />
        </group>
      </group>
    </>
  )
}

/* ---------- DOM dimension labels pinned to world points ---------- */
function DimLabels({ shared, labels }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const p = shared.p
    const show = smooth(p, 0.02, 0.08) * (1 - 0.6 * smooth(p, 0.85, 1))
    DIM_ANCHORS.forEach((a, i) => {
      const el = labels.current[i]
      if (!el) return
      v.set(a[0], a[1], a[2]).project(camera)
      el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0) translate(-50%, -50%)`
      el.style.opacity = String(v.z < 1 ? show : 0)
      const n = String(Math.round(DIM_BASE[i] + DIM_RATE[i] * p))
      if (el.textContent !== n) el.textContent = n
    })
  })
  return null
}

function Scene({ theme, progress, labels, onReady }) {
  const palette = PALETTES[theme] || PALETTES.dark
  const { gl, scene, camera } = useThree()
  const shared = useMemo(() => ({ p: progress.current, t: 0 }), [progress])
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let live = true
    ;(document.fonts?.ready ?? Promise.resolve()).then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])

  // Canvas-drawn UI textures, cached per theme so switching themes doesn't redraw
  // them; the other theme's set is drawn in an idle moment ahead of time.
  const cache = useMemo(() => new Map(), [])
  const build = (pal) => {
    const avatars = pal.cards.map((c) => c.bg).concat(['#f5f7f4', '#263746'])
    return {
      board: makeBoardTexture(pal, { cols: COLS, rows: ROWS, slots: SLOTS, cardW: CARD_W, cardD: CARD_D, sidebarX: SIDEBAR_X }),
      shadow: makeShadowTexture(pal.shadow),
      cards: SLOTS.map((_, i) => makeCardTexture(pal.cards[i % 4], i, avatars)),
    }
  }
  const textures = useMemo(() => {
    const key = `${theme}:${fontsReady}`
    if (!cache.has(key)) cache.set(key, build(palette))
    return cache.get(key)
    // fontsReady: redraw once web fonts are available to the canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, fontsReady, theme])
  useEffect(() => {
    if (!fontsReady) return
    let live = true
    const other = theme === 'dark' ? 'light' : 'dark'
    whenIdle(4000).then(() => {
      const key = `${other}:true`
      if (!live || cache.has(key) || !PALETTES[other]) return
      const set = build(PALETTES[other])
      cache.set(key, set)
      ;[set.board, set.shadow, ...set.cards].forEach((t) => gl.initTexture(t))
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, fontsReady])

  // the canvas mounts at idle time, before it is visible: compile every shader now so
  // scrolling into the story never waits on the GPU driver
  useEffect(() => {
    const id = setTimeout(() => {
      // upload the canvas textures now too, instead of on the first visible frame
      ;[textures.board, textures.shadow, ...textures.cards].forEach((t) => gl.initTexture(t))
      // shaders compile in parallel from here; the main-thread work is done, so the intro may go
      precompile(gl, scene, camera)
      onReady?.()
    }, 50)
    return () => clearTimeout(id)
  }, [gl, scene, camera, textures])

  useEffect(
    () => () =>
      cache.forEach((t) => {
        t.board.dispose()
        t.shadow.dispose()
        t.cards.forEach((c) => c.dispose())
      }),
    [cache],
  )

  return (
    <>
      <Driver progress={progress} shared={shared} />
      <CameraRig shared={shared} />
      <Env intensity={palette.env} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[5, 9, 4]} intensity={palette.key} />
      <directionalLight position={[-6, 3, -5]} intensity={palette.rim * 0.6} color={palette.rimColor} />
      <Floor shared={shared} palette={palette} />
      <Grid shared={shared} palette={palette} />
      <Liquid shared={shared} palette={palette} />
      <Board shared={shared} palette={palette} boardTex={textures.board} shadowTex={textures.shadow} />
      <Scaffold shared={shared} palette={palette} />
      <Cards shared={shared} palette={palette} cardTexes={textures.cards} />
      <Pulse shared={shared} palette={palette} />
      <Starship shared={shared} />
      <DimLabels shared={shared} labels={labels} />
    </>
  )
}

export default function StoryCanvas({ theme, progress, labels, onReady }) {
  const wrap = useRef(null)
  const visible = useInView(wrap, '100px')
  const [initialDpr] = useState(() => dprFor('scene'))
  return (
    <div ref={wrap} className="story-canvas">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={initialDpr}
        gl={{ antialias: quality.features === 'high', alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 0.1, far: 200, position: [0, 10, 5] }}
        onCreated={({ gl }) => {
          // shader error queries block the main thread until the driver finishes compiling
          gl.debug.checkShaderErrors = import.meta.env.DEV
          // cache this sync GPU query now — later it would wait behind queued shader compiles
          gl.capabilities.getMaxAnisotropy()
          noteRenderer(gl)
          debugPrograms(gl, 'story')
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <AdaptiveDpr />
        <Scene theme={theme} progress={progress} labels={labels} onReady={onReady} />
      </Canvas>
    </div>
  )
}
