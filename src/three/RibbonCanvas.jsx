import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import Env from './Env.jsx'
import { PALETTES } from './palette.js'
import { seeded, useInView, useReducedMotion } from './utils.js'

/*
  Hero "card ribbon": ~120 thin rounded cards strung along a wavy path.
  The whole strip twists around its length, and one sharper kink drifts
  back and forth. Small DOM labels are pinned to points on the ribbon.
*/

const N = 124
const SPAN = 21

function Ribbon({ palette, labels, labelCount, reduced }) {
  const mesh = useRef()
  const group = useRef()
  const pointer = useRef({ x: 0, y: 0 })
  const points = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const v = useMemo(() => new THREE.Vector3(), [])

  const geom = useMemo(() => new RoundedBoxGeometry(0.06, 1.3, 1.1, 3, 0.06), [])
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        roughness: 0.28,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        iridescence: 0.35,
        iridescenceIOR: 1.35,
      }),
    [],
  )

  const anchors = useMemo(() => {
    const rnd = seeded(42)
    return Array.from({ length: labelCount }, (_, i) => ({
      index: Math.min(N - 1, Math.floor(((i + rnd() * 0.8) / labelCount) * N)),
      off: new THREE.Vector3((rnd() - 0.5) * 0.4, (rnd() > 0.5 ? 1 : -1) * (0.95 + rnd() * 0.55), (rnd() - 0.5) * 1.4),
    }))
  }, [labelCount])

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => {
    const rnd = seeded(7)
    const c = new THREE.Color()
    for (let i = 0; i < N; i++) {
      c.set(palette.ribbon[Math.floor(i / 4) % palette.ribbon.length])
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.05)
      mesh.current.setColorAt(i, c)
    }
    mesh.current.instanceColor.needsUpdate = true
  }, [palette])

  useFrame((state) => {
    const t = reduced ? 6 : state.clock.elapsedTime
    const kink = 1.6 * Math.sin(t * 0.21)

    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) - 0.5) * SPAN
      const g = Math.exp(-((x - kink) ** 2) / 2.4)
      const y = 0.3 * Math.sin(0.42 * x + t * 0.55) + g * 0.7
      const z = 0.75 * Math.cos(0.3 * x + t * 0.35)
      tmp.position.set(x, y, z)
      tmp.rotation.set(0.3 * x + t * 0.22 + g * 2.7, 0.78 + 0.14 * Math.sin(0.5 * x + t * 0.4), 0.12 * Math.sin(0.3 * x + t * 0.3))
      tmp.updateMatrix()
      mesh.current.setMatrixAt(i, tmp.matrix)
      points[i].set(x, y, z)
    }
    mesh.current.instanceMatrix.needsUpdate = true

    const scroll = Math.min(1, window.scrollY / window.innerHeight)
    const grp = group.current
    grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, pointer.current.x * 0.12, 0.05)
    grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, pointer.current.y * 0.08 + scroll * 0.55, 0.06)
    grp.position.y = THREE.MathUtils.lerp(grp.position.y, scroll * 1.4, 0.08)
    grp.updateMatrixWorld()

    const { width, height } = state.size
    for (let j = 0; j < anchors.length; j++) {
      const el = labels.current[j]
      if (!el) continue
      const a = anchors[j]
      v.copy(points[a.index]).add(a.off).applyMatrix4(grp.matrixWorld).project(state.camera)
      const sy = ((1 - v.y) / 2) * height
      el.style.transform = `translate3d(${((v.x + 1) / 2) * width}px, ${sy}px, 0)`
      // keep clear of the headline above and the call-to-action below the ribbon
      el.style.opacity = Math.abs(v.x) < 1.05 && sy > height * 0.3 && sy < height * 0.72 ? '1' : '0'
    }
  })

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geom, mat, N]} frustumCulled={false} />
    </group>
  )
}

// Keeps the ribbon framed in the middle band of the hero at any aspect ratio.
function Framing() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    camera.position.set(0, 0.2, aspect < 0.8 ? 17 : aspect < 1.25 ? 14 : 12)
    camera.lookAt(0, aspect < 0.8 ? 0.2 : 0.85, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export default function RibbonCanvas({ theme, labels, labelCount }) {
  const wrap = useRef(null)
  const visible = useInView(wrap)
  const reduced = useReducedMotion()
  const palette = PALETTES[theme] || PALETTES.dark

  return (
    <div ref={wrap} className="ribbon-canvas">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 32, near: 0.1, far: 100, position: [0, 0.2, 12] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Env intensity={palette.env} />
        <ambientLight intensity={palette.ambient} />
        <directionalLight position={[4, 6, 6]} intensity={palette.key} />
        <directionalLight position={[-6, -3, -4]} intensity={palette.rim} color={palette.rimColor} />
        <Framing />
        <Ribbon palette={palette} labels={labels} labelCount={labelCount} reduced={reduced} />
      </Canvas>
    </div>
  )
}
