import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTES } from './palette.js'
import { STRAND_SHAPES, createStrandField, dampShape, mixShape, pointer, pointerIn, tickPointer } from './strands.js'
import { useReducedMotion } from './utils.js'

/*
  The page's living background: one fixed, opaque canvas of light strands.
  Each section has its own strand "pose" (STRAND_SHAPES); as you scroll, the
  pose blends from the section above the viewport centre to the one below it.
*/

const ORDER = ['home', 'process', 'about', 'services', 'work', 'principles', 'contact']

function Field({ theme, reduced }) {
  const { gl, size } = useThree()
  const palette = PALETTES[theme] || PALETTES.dark
  const field = useMemo(() => createStrandField({ strands: size.width < 700 ? 90 : 150, particles: size.width < 700 ? 220 : 420 }), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const current = useMemo(() => ({ ...STRAND_SHAPES.home }), [])
  const target = useMemo(() => ({}), [])
  const pv = useMemo(() => new THREE.Vector2(), [])
  const sections = useRef([])

  useEffect(() => () => field.dispose(), [field])
  useEffect(() => {
    field.setPalette(palette.strands)
    gl.setClearColor(palette.bg, 1)
  }, [field, palette, gl])
  useEffect(() => {
    field.uniforms.uPixelRatio.value = gl.getPixelRatio()
    sections.current = ORDER.map((id) => document.getElementById(id))
  }, [field, gl, size])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1)
    // which two sections straddle the viewport centre?
    const mid = window.innerHeight / 2
    let a = 0
    let f = 0
    const els = sections.current
    const centers = els.map((el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
    for (let i = 0; i < ORDER.length; i++) {
      if (centers[i] == null) continue
      if (centers[i] <= mid) a = i
    }
    const b = Math.min(ORDER.length - 1, a + 1)
    if (b !== a && centers[a] != null && centers[b] != null) {
      const t = (mid - centers[a]) / (centers[b] - centers[a])
      f = Math.min(1, Math.max(0, t))
      f = f * f * (3 - 2 * f)
    }
    mixShape(STRAND_SHAPES[ORDER[a]], STRAND_SHAPES[ORDER[b]], f, target)
    dampShape(current, target, Math.min(1, d * 2.5))

    tickPointer(d)
    pointerIn({ left: 0, top: 0, width: size.width, height: size.height }, pv)
    field.uniforms.uPointer.value.copy(pv)
    field.uniforms.uPointerForce.value = reduced ? 0 : pointer.force
    field.uniforms.uTime.value = reduced ? 3 : state.clock.elapsedTime
    field.setShape(current, size.width / size.height, palette.strands.strength)
  })

  return <primitive object={field.group} />
}

export default function StrandsBackground({ theme }) {
  const reduced = useReducedMotion()
  return (
    <div className="strands-bg" aria-hidden="true">
      <Canvas
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping
        }}
      >
        <Field theme={theme} reduced={reduced} />
      </Canvas>
    </div>
  )
}
