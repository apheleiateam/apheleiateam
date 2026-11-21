import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createBloom, createComposite } from './bloom.js'
import { PALETTES } from './palette.js'
import { STRAND_SHAPES, createStrandField, dampShape, mixShape, pointer, pointerIn, tickPointer } from './strands.js'
import { useReducedMotion } from './utils.js'

/*
  The page's living background: a fixed canvas showing the energy flow.
  Each section has its own pose (STRAND_SHAPES); as you scroll, the pose blends
  from the section above the viewport centre to the one below it.
  Rendering is manual: strands → HDR target → bloom blur chain → composite.
*/

const ORDER = ['home', 'process', 'about', 'services', 'work', 'principles', 'contact']

function Flow({ theme, reduced }) {
  const { gl, size } = useThree()
  const palette = PALETTES[theme] || PALETTES.dark
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const field = useMemo(() => createStrandField({ fibres: size.width < 700 ? 60 : 90, sheets: size.width < 700 ? 10 : 14, dust: size.width < 700 ? 160 : 300 }), [])
  const strandScene = useMemo(() => {
    const s = new THREE.Scene()
    s.add(field.group)
    return s
  }, [field])
  const bloom = useMemo(() => createBloom(), [])
  const comp = useMemo(() => createComposite(bloom.textures), [bloom])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const current = useMemo(() => ({ ...STRAND_SHAPES.home }), [])
  const target = useMemo(() => ({}), [])
  const pv = useMemo(() => new THREE.Vector2(), [])
  const sections = useRef([])

  useEffect(
    () => () => {
      field.dispose()
      bloom.dispose()
      comp.dispose()
    },
    [field, bloom, comp],
  )
  useEffect(() => {
    field.setPalette(palette.strands)
    comp.mat.uniforms.uBg.value.set(palette.bg)
    comp.mat.uniforms.uAdditive.value = palette.strands.additive ? 1 : 0
    comp.mat.uniforms.uW.value.set(...palette.strands.bloom)
  }, [field, comp, palette])
  useEffect(() => {
    const dpr = gl.getPixelRatio()
    field.uniforms.uPixelRatio.value = dpr
    bloom.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr))
    sections.current = ORDER.map((id) => document.getElementById(id))
  }, [field, bloom, gl, size])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1)
    // which two sections straddle the viewport centre?
    const mid = window.innerHeight / 2
    const centers = sections.current.map((el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
    let a = 0
    for (let i = 0; i < ORDER.length; i++) if (centers[i] != null && centers[i] <= mid) a = i
    const b = Math.min(ORDER.length - 1, a + 1)
    let f = 0
    if (b !== a && centers[a] != null && centers[b] != null) {
      f = Math.min(1, Math.max(0, (mid - centers[a]) / (centers[b] - centers[a])))
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

    bloom.render(gl, strandScene)
    gl.setRenderTarget(null)
    gl.render(comp.scene, comp.cam)
  }, 1)

  return null
}

export default function StrandsBackground({ theme }) {
  const reduced = useReducedMotion()
  return (
    <div className="strands-bg" aria-hidden="true">
      <Canvas
        dpr={[1, 1.25]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping
        }}
      >
        <Flow theme={theme} reduced={reduced} />
      </Canvas>
    </div>
  )
}
