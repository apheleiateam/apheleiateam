import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { rectOf, viewport } from '../layout.js'
import { debugPrograms, dprFor, noteRenderer, quality } from '../perf.js'
import AdaptiveDpr from './AdaptiveDpr.jsx'
import Env from './Env.jsx'
import { afterFrames, precompile, precompileOffscreen } from './precompile.js'
import { splashActive, splashDone } from '../splash.js'
import { applyFlamePalette, makeFlameMaterial, makeGlass } from './glow.js'
import { PALETTES } from './palette.js'
import { STRAND_SHAPES, createStrandField, pointer, pointerIn, tickPointer } from './strands.js'
import { createBloom } from './bloom.js'
import { seeded, useInView, useReducedMotion } from './utils.js'

/*
  Hero ribbon: ~120 rounded cards strung along a wavy path that twists around
  its length, with one sharper kink drifting back and forth. Most cards are
  glass (they refract the flame field behind them); every third group of four
  is solid marble / flame-green for rhythm. DOM labels are pinned to the ribbon.
*/

const N = 124
const SPAN = 21
const isSolid = (i) => Math.floor(i / 4) % 3 === 1
const SOLID = [...Array(N).keys()].filter(isSolid)
const GLASS = [...Array(N).keys()].filter((i) => !isSolid(i))
const LOCAL = Array.from({ length: N }, (_, i) => (isSolid(i) ? SOLID.indexOf(i) : GLASS.indexOf(i)))

function Ribbon({ palette, labels, labelCount, reduced, kinkRef }) {
  const glassMesh = useRef()
  const solidMesh = useRef()
  const group = useRef()
  const pointer = useRef({ x: 0, y: 0 })
  const points = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const v = useMemo(() => new THREE.Vector3(), [])

  const geom = useMemo(() => new RoundedBoxGeometry(0.07, 1.3, 1.1, 3, 0.06), [])
  const glassMat = useMemo(() => makeGlass({ thickness: 0.4, roughness: 0.12 }), [])
  const solidMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
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
      pointer.current.x = (e.clientX / viewport.w) * 2 - 1
      pointer.current.y = (e.clientY / viewport.h) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => {
    const rnd = seeded(7)
    const c = new THREE.Color()
    GLASS.forEach((i, k) => {
      c.set(palette.glass[Math.floor(i / 4) % palette.glass.length])
      glassMesh.current.setColorAt(k, c)
    })
    SOLID.forEach((i, k) => {
      c.set(palette.solid[Math.floor(i / 12) % palette.solid.length])
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.05)
      solidMesh.current.setColorAt(k, c)
    })
    glassMesh.current.instanceColor.needsUpdate = true
    solidMesh.current.instanceColor.needsUpdate = true
  }, [palette, solidMat])

  useFrame((state) => {
    const t = reduced ? 6 : state.clock.elapsedTime
    const kink = 1.6 * Math.sin(t * 0.21)
    kinkRef.current = kink

    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) - 0.5) * SPAN
      const g = Math.exp(-((x - kink) ** 2) / 2.4)
      const y = 0.3 * Math.sin(0.42 * x + t * 0.55) + g * 0.7
      const z = 0.75 * Math.cos(0.3 * x + t * 0.35)
      tmp.position.set(x, y, z)
      tmp.rotation.set(0.3 * x + t * 0.22 + g * 2.7, 0.78 + 0.14 * Math.sin(0.5 * x + t * 0.4), 0.12 * Math.sin(0.3 * x + t * 0.3))
      tmp.updateMatrix()
      ;(isSolid(i) ? solidMesh : glassMesh).current.setMatrixAt(LOCAL[i], tmp.matrix)
      points[i].set(x, y, z)
    }
    glassMesh.current.instanceMatrix.needsUpdate = true
    solidMesh.current.instanceMatrix.needsUpdate = true

    const scroll = Math.min(1, viewport.y / viewport.h)
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
      <instancedMesh ref={glassMesh} args={[geom, glassMat, GLASS.length]} frustumCulled={false} />
      <instancedMesh ref={solidMesh} args={[geom, solidMat, SOLID.length]} frustumCulled={false} />
    </group>
  )
}

// Opaque backdrop behind the ribbon: the flame glow plus light strands. The strands
// are rendered into a texture first so the backdrop stays opaque — three.js glass
// (transmission) only refracts opaque objects, so the cards bend the strands.
function Backdrop({ palette, reduced, kinkRef }) {
  const { gl, size } = useThree()
  const dpr = useThree((s) => s.viewport.dpr)
  const mat = useMemo(makeFlameMaterial, [])
  const field = useMemo(() => createStrandField({ fibres: size.width < 700 ? 60 : 90, sheets: 14, dust: 220, seed: 11 }), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strandScene = useMemo(() => {
    const scene = new THREE.Scene()
    scene.add(field.group)
    return scene
  }, [field])
  const cam = useMemo(() => new THREE.Camera(), [])
  const bloom = useMemo(() => createBloom(), [])
  const pv = useMemo(() => new THREE.Vector2(), [])
  const bg = useMemo(() => new THREE.Color(palette.bg), [palette])

  useEffect(() => () => {
    bloom.dispose()
    field.dispose()
  }, [bloom, field])

  // the strands render into the bloom target (linear, no tone mapping): compile that variant early
  useEffect(() => {
    precompileOffscreen(gl, strandScene, cam)
  }, [gl, strandScene, cam])

  useEffect(() => {
    // a faint ember behind the ribbon — the energy flow carries the light now
    applyFlamePalette(mat, palette, palette.flame.intensity * 0.28)
    mat.uniforms.uScale.value.set(6.2, 5.6)
    mat.uniforms.uSharp.value = bloom.textures.sharp
    mat.uniforms.uB1.value = bloom.textures.b1
    mat.uniforms.uB2.value = bloom.textures.b2
    mat.uniforms.uB3.value = bloom.textures.b3
    mat.uniforms.uW.value.set(...palette.strands.bloom)
    mat.uniforms.uStrandMix.value = 0.9
    mat.uniforms.uAdditive.value = palette.strands.additive ? 1 : 0
    field.setPalette(palette.strands)
  }, [mat, palette, bloom, field])

  useEffect(() => {
    bloom.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr))
    mat.uniforms.uRes.value.set(Math.round(size.width * dpr), Math.round(size.height * dpr))
    field.uniforms.uPixelRatio.value = dpr
  }, [dpr, size, bloom, mat, field])

  useFrame((state, dt) => {
    const t = reduced ? 4 : state.clock.elapsedTime
    mat.uniforms.uTime.value = t
    mat.uniforms.uCenter.value.x = THREE.MathUtils.lerp(mat.uniforms.uCenter.value.x, (kinkRef.current || 0) * 0.012, 0.05)

    tickPointer(Math.min(dt, 0.1))
    pointerIn(rectOf(gl.domElement), pv)
    field.uniforms.uPointer.value.copy(pv)
    field.uniforms.uPointerForce.value = reduced ? 0 : pointer.force
    field.uniforms.uTime.value = reduced ? 3 : t
    field.setShape(STRAND_SHAPES.home, size.width / size.height, palette.strands.strength)

    bloom.render(gl, strandScene, cam, quality.features === 'high' ? 2 : 1)
    gl.setClearColor(bg, 1)
  })

  return (
    <mesh position={[0, 0.15, -3.4]} material={mat}>
      <planeGeometry args={[44, 18]} />
    </mesh>
  )
}

// Keeps the ribbon framed in the middle band of the hero at any aspect ratio.
function Framing({ bg }) {
  const { camera, size, gl } = useThree()
  useEffect(() => {
    gl.setClearColor(bg, 1)
  }, [gl, bg])
  useEffect(() => {
    const aspect = size.width / size.height
    camera.position.set(0, 0.2, aspect < 0.8 ? 17 : aspect < 1.25 ? 14 : 12)
    camera.lookAt(0, aspect < 0.8 ? 0.2 : 0.85, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

// Queues every shader before the first frame, then gives the driver a few frames to finish.
function Warmup({ onDone }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let live = true
    precompile(gl, scene, camera)
    afterFrames(8).then(() => live && onDone())
    return () => {
      live = false
    }
  }, [gl, scene, camera, onDone])
  return null
}

// Calls onReady once the first frames are on screen (shaders compiled, textures up).
function FirstFrames({ onReady }) {
  const n = useRef(0)
  useFrame(() => {
    if (++n.current === 2) onReady?.()
  })
  return null
}

export default function RibbonCanvas({ theme, labels, labelCount, onReady }) {
  const wrap = useRef(null)
  const kinkRef = useRef(0)
  const visible = useInView(wrap)
  const reduced = useReducedMotion()
  const [initialDpr] = useState(() => dprFor('scene'))
  // draw only once compiled; behind the intro, stop after the first frames to leave the GPU free
  const [warm, setWarm] = useState(false)
  const [shown, setShown] = useState(false)
  const [introGone, setIntroGone] = useState(() => !splashActive())
  useEffect(() => {
    splashDone.then(() => setIntroGone(true))
  }, [])
  const warmed = useMemo(() => () => setWarm(true), [])
  const firstFrames = useMemo(
    () => () => {
      setShown(true)
      onReady?.()
    },
    [onReady],
  )
  const palette = PALETTES[theme] || PALETTES.dark

  return (
    <div ref={wrap} className="ribbon-canvas">
      <Canvas
        frameloop={visible && warm && (introGone || !shown) ? 'always' : 'never'}
        dpr={initialDpr}
        gl={{ antialias: quality.features === 'high', alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 32, near: 0.1, far: 100, position: [0, 0.2, 12] }}
        onCreated={({ gl }) => {
          // shader error queries block the main thread until the driver finishes compiling
          gl.debug.checkShaderErrors = import.meta.env.DEV
          // cache this sync GPU query now — later it would wait behind queued shader compiles
          gl.capabilities.getMaxAnisotropy()
          noteRenderer(gl)
          debugPrograms(gl, 'hero')
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <AdaptiveDpr />
        <FirstFrames onReady={firstFrames} />
        <Framing bg={palette.bg} />
        <Env intensity={palette.env} />
        <ambientLight intensity={palette.ambient} />
        <directionalLight position={[4, 6, 6]} intensity={palette.key} />
        <directionalLight position={[-6, -3, -4]} intensity={palette.rim} color={palette.rimColor} />
        <Backdrop palette={palette} reduced={reduced} kinkRef={kinkRef} />
        <Ribbon palette={palette} labels={labels} labelCount={labelCount} reduced={reduced} kinkRef={kinkRef} />
        <Warmup onDone={warmed} />
      </Canvas>
    </div>
  )
}
