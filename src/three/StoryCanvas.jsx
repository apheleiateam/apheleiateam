import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import Env from './Env.jsx'
import { PALETTES } from './palette.js'
import { TOP_D, TOP_W, makeBoardTexture, makeCardTexture, makeShadowTexture } from './textures.js'
import { easeOutBack, easeOutCubic, range, seeded, smooth, useInView } from './utils.js'

/*
  Scroll-driven story, progress p ∈ [0, 1]:
    0.00–0.25  Discover  — crosshair grid + liquid chrome sheet grows
    0.25–0.50  Design    — liquid settles into a board, scaffold cubes pop up
    0.50–0.75  Develop   — task cards fly in and land in their columns
    0.75–1.00  Launch    — camera settles isometric, cards lift, pulse rings
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
function Liquid({ shared, palette }) {
  const mesh = useRef()
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(5.2, 3.4, 96, 64)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const base = useMemo(() => Float32Array.from(geom.attributes.position.array), [geom])
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, transparent: true }),
    [],
  )
  const wasFlat = useRef(false)
  useEffect(() => {
    mat.color.set(palette.chrome)
  }, [palette, mat])

  useFrame(() => {
    const { p, t } = shared
    const vis = 1 - smooth(p, 0.4, 0.5)
    mesh.current.visible = vis > 0.001
    if (!mesh.current.visible) return
    mat.opacity = vis

    const grow = 0.22 + 0.78 * smooth(p, 0, 0.17)
    mesh.current.scale.set(grow, 1, grow)
    mesh.current.position.y = THREE.MathUtils.lerp(0.45, TOP_Y + 0.02, smooth(p, 0.2, 0.42))

    const amp = 1 - smooth(p, 0.2, 0.42)
    if (amp < 0.001 && wasFlat.current) return
    const pos = geom.attributes.position.array
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i]
      const z = base[i + 2]
      const h =
        0.3 * Math.sin(1.25 * x + 1.1 * t) * Math.cos(1.05 * z - 0.8 * t) +
        0.12 * Math.sin(1.9 * (x + 0.6 * z) + 1.4 * t) +
        0.05 * Math.sin(3.2 * x - 2.4 * z + 2.1 * t)
      pos[i + 1] = h * amp
    }
    geom.attributes.position.needsUpdate = true
    geom.computeVertexNormals()
    wasFlat.current = amp < 0.001
  })

  return <mesh ref={mesh} geometry={geom} material={mat} />
}

/* ---------- 002 board, its UI surface and soft contact shadow ---------- */
function Board({ shared, palette, boardTex, shadowTex }) {
  const group = useRef()
  const geom = useMemo(() => new RoundedBoxGeometry(BOARD_W, BOARD_H, BOARD_D, 4, 0.12), [])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.35, transparent: true }), [])
  const topMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }), [])
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), [])

  useEffect(() => {
    mat.color.set(palette.board)
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
    mat.opacity = rise
    shadowMat.opacity = rise
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
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1 }), [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    mat.color.set(palette.keyCube)
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
  const mats = useMemo(() => data.map(() => new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2 })), [data])
  const topMats = useMemo(() => data.map(() => new THREE.MeshBasicMaterial({ toneMapped: false })), [data])

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
    mats.forEach((m) => m.color.set(palette.glow))
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

function Scene({ theme, progress, labels }) {
  const palette = PALETTES[theme] || PALETTES.dark
  const shared = useMemo(() => ({ p: progress.current, t: 0 }), [progress])
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let live = true
    ;(document.fonts?.ready ?? Promise.resolve()).then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])

  const textures = useMemo(() => {
    const avatars = palette.cards.map((c) => c.bg).concat(['#f5f7f4', '#263746'])
    return {
      board: makeBoardTexture(palette, { cols: COLS, rows: ROWS, slots: SLOTS, cardW: CARD_W, cardD: CARD_D, sidebarX: SIDEBAR_X }),
      shadow: makeShadowTexture(palette.shadow),
      cards: SLOTS.map((_, i) => makeCardTexture(palette.cards[i % 4], i, avatars)),
    }
    // fontsReady: redraw once web fonts are available to the canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, fontsReady])

  useEffect(
    () => () => {
      textures.board.dispose()
      textures.shadow.dispose()
      textures.cards.forEach((t) => t.dispose())
    },
    [textures],
  )

  return (
    <>
      <Driver progress={progress} shared={shared} />
      <CameraRig shared={shared} />
      <Env intensity={palette.env} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[5, 9, 4]} intensity={palette.key} />
      <directionalLight position={[-6, 3, -5]} intensity={palette.rim * 0.6} color={palette.rimColor} />
      <Grid shared={shared} palette={palette} />
      <Liquid shared={shared} palette={palette} />
      <Board shared={shared} palette={palette} boardTex={textures.board} shadowTex={textures.shadow} />
      <Scaffold shared={shared} palette={palette} />
      <Cards shared={shared} palette={palette} cardTexes={textures.cards} />
      <Pulse shared={shared} palette={palette} />
      <DimLabels shared={shared} labels={labels} />
    </>
  )
}

export default function StoryCanvas({ theme, progress, labels }) {
  const wrap = useRef(null)
  const visible = useInView(wrap, '100px')
  return (
    <div ref={wrap} className="story-canvas">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 0.1, far: 100, position: [0, 10, 5] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Scene theme={theme} progress={progress} labels={labels} />
      </Canvas>
    </div>
  )
}
