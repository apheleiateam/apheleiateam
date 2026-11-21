import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rectOf, viewport } from '../layout.js'
import { debugPrograms, dprFor, noteRenderer, onQuality, quality } from '../perf.js'
import { release, splashActive } from '../splash.js'
import { createBloom, createComposite } from './bloom.js'
import { PALETTES } from './palette.js'
import { createParticleUniverse } from './particles.js'
import { createModelLayer } from './modelLayer.js'
import { afterFrames, precompileOffscreen } from './precompile.js'
import { STRAND_SHAPES, createStrandField, dampShape, mixShape, pointer, pointerIn, tickPointer } from './strands.js'
import { useReducedMotion } from './utils.js'

/*
  The page's living background, one fixed canvas:
    · energy-flow strands whose pose blends section to section (top of the page)
    · a particle universe that morphs logo → helix → wave → vortex → ring
      through the lower sections, each shape pinned to a layout anchor
    · a faint starfield (dark theme)
  Everything renders into one HDR target → bloom chain → composite.

  Performance: layout comes from the layout cache (no per-frame forced layout),
  resolution / bloom passes / particle count follow the quality manager, and
  while the hero or the pinned story covers the screen this canvas only redraws
  every third frame (just their faded edges show it).
*/

const STRAND_ORDER = ['home', 'process', 'about', 'services', 'work', 'team', 'principles', 'contact']

// One particle shape per section; `anchor` is the element the shape sits on.
const PARTICLE_SECTIONS = [
  { id: 'process' },
  { id: 'about', anchor: '.about__stage', fit: 'h', nominal: 2.2, factor: 0.8 },
  // on portrait screens the cards stack, so the helix stands upright along them
  { id: 'services', anchor: '.services', fit: 'w', nominal: 6, factor: 1.08, portrait: { fit: 'h', nominal: 6, factor: 1.0, rotZ: Math.PI / 2 } },
  { id: 'work', anchor: '.work', fit: 'w', nominal: 8, factor: 1.25, dy: 0.45 },
  { id: 'team', anchor: '.team__stage', fit: 'w', nominal: 5.2, factor: 0.95, portrait: { fit: 'w', nominal: 5.2, factor: 1.25 } },
  { id: 'principles', anchor: '.quote', fit: 'h', nominal: 5.8, factor: 2.1 },
  { id: 'contact', anchor: '.cta', fit: 'w', nominal: 4.6, factor: 1.02 },
]

const CAMERA_Z = 10
const FOV = 35
const WORLD_H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2))

// Between which two sections is the viewport centre, and how far along?
function straddle(els) {
  const mid = viewport.h / 2
  const centers = els.map((el) => {
    if (!el) return null
    const r = rectOf(el)
    return r.top + r.height / 2
  })
  let a = 0
  for (let i = 0; i < els.length; i++) if (centers[i] != null && centers[i] <= mid) a = i
  const b = Math.min(els.length - 1, a + 1)
  let f = 0
  if (b !== a && centers[a] != null && centers[b] != null) {
    f = Math.min(1, Math.max(0, (mid - centers[a]) / (centers[b] - centers[a])))
    f = f * f * (3 - 2 * f)
  }
  if (a === 0 && centers[0] != null && centers[0] > mid) f = 0
  return { a, b, f }
}

function Flow({ theme, reduced }) {
  const { gl, size, setDpr } = useThree()
  const dpr = useThree((s) => s.viewport.dpr)
  const palette = PALETTES[theme] || PALETTES.dark
  const small = size.width < 700
  const lite = useRef(quality.features !== 'high')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const field = useMemo(() => {
    const l = lite.current
    return createStrandField({ fibres: small || l ? 60 : 90, sheets: small || l ? 10 : 14, dust: small ? 160 : l ? 200 : 300 })
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const universe = useMemo(() => createParticleUniverse({ count: small ? 9000 : 20000, stars: small ? 400 : 900 }), [])
  const tick = useRef(0)
  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
    c.position.set(0, 0, CAMERA_Z)
    return c
  }, [])
  const scene = useMemo(() => {
    const s = new THREE.Scene()
    s.add(field.group, universe.group)
    return s
  }, [field, universe])
  const bloom = useMemo(() => createBloom(), [])
  const comp = useMemo(() => createComposite(bloom.textures), [bloom])
  const models = useMemo(() => createModelLayer(gl, scene), [gl, scene])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const current = useMemo(() => ({ ...STRAND_SHAPES.home }), [])
  const target = useMemo(() => ({}), [])
  const pv = useMemo(() => new THREE.Vector2(), [])
  const els = useRef({ strands: [], particles: [], anchors: [] })
  const morph = useRef(0)

  // quality changes: resolution, particle density (bloom passes are read per frame)
  useEffect(() => {
    const apply = () => {
      lite.current = quality.features !== 'high'
      universe.setDensity(lite.current ? 0.5 : 1)
      setDpr(dprFor('bg', size.width, size.height))
    }
    apply()
    return onQuality(apply)
  }, [universe, setDpr, size])

  // compile the layers' shaders in parallel before the first draw: the glow layers render
  // into the (linear, untonemapped) bloom target, the composite to the screen
  const compiled = useRef(false)
  const shown = useRef(false)
  useEffect(() => {
    precompileOffscreen(gl, scene, camera)
    gl.compile(comp.scene, comp.cam)
    afterFrames(6).then(() => (compiled.current = true))
  }, [gl, scene, camera, comp])

  // then build the 3D objects + compile their shaders in idle moments
  useEffect(() => {
    const id = setTimeout(() => models.prewarm(camera), 600)
    return () => clearTimeout(id)
  }, [models, camera])

  useEffect(
    () => () => {
      field.dispose()
      universe.dispose()
      bloom.dispose()
      comp.dispose()
      models.dispose()
    },
    [field, universe, bloom, comp, models],
  )
  useEffect(() => {
    field.setPalette(palette.strands)
    universe.setPalette(palette.particles)
    models.setTheme(palette)
    comp.mat.uniforms.uBg.value.set(palette.bg)
    comp.mat.uniforms.uAdditive.value = palette.strands.additive ? 1 : 0
    comp.mat.uniforms.uW.value.set(...palette.strands.bloom)
  }, [field, universe, comp, models, palette])
  useEffect(() => {
    field.uniforms.uPixelRatio.value = dpr
    universe.uniforms.uPixelRatio.value = dpr
    bloom.setSize(Math.round(size.width * dpr), Math.round(size.height * dpr))
    camera.aspect = size.width / size.height
    camera.updateProjectionMatrix()
    // helix orientation follows the layout (see PARTICLE_SECTIONS)
    const upright = size.width / size.height < 0.8
    universe.uniforms.uTilt.value[2].setFromMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.38, upright ? 0.35 : 0, upright ? Math.PI / 2 : -0.04)),
    )
    els.current = {
      strands: STRAND_ORDER.map((id) => document.getElementById(id)),
      particles: PARTICLE_SECTIONS.map((s) => document.getElementById(s.id)),
      anchors: PARTICLE_SECTIONS.map((s) => (s.anchor ? document.querySelector(s.anchor) : null)),
    }
  }, [field, universe, bloom, camera, dpr, size])

  useFrame((state, dt) => {
    if (!compiled.current) return
    // hero / pinned story are opaque canvases over this one: redraw at a third of the rate
    const [hero, story] = els.current.strands
    const vh = size.height
    const hr = hero && rectOf(hero)
    const sr = story && rectOf(story)
    const covered = (hr && hr.top <= 1 && hr.bottom >= vh) || (sr && sr.top <= 0 && sr.bottom >= vh)
    if (covered && tick.current++ % 3 !== 0) return
    // hidden behind the intro: draw a few frames to warm up, then wait
    if (splashActive() && tick.current++ > 3) return

    const d = Math.min(dt, 0.1)
    const t = reduced ? 3 : state.clock.elapsedTime

    /* strands: blend poses between sections */
    const s = straddle(els.current.strands)
    mixShape(STRAND_SHAPES[STRAND_ORDER[s.a]], STRAND_SHAPES[STRAND_ORDER[s.b]], s.f, target)
    dampShape(current, target, Math.min(1, d * 2.5))
    tickPointer(d)
    pointerIn({ left: 0, top: 0, width: size.width, height: size.height }, pv)
    field.uniforms.uPointer.value.copy(pv)
    field.uniforms.uPointerForce.value = reduced ? 0 : pointer.force
    field.uniforms.uTime.value = t
    const portrait = size.width / size.height < 0.8
    // on phones the strands sit behind body text in the lower sections, so keep them quiet there
    field.setShape(current, size.width / size.height, palette.strands.strength * (portrait && s.a >= 2 ? 0.5 : 1))

    /* particles: morph value + per-shape anchor transforms */
    const p = straddle(els.current.particles)
    const want = s.a === 0 && p.a === 0 && p.f === 0 ? 0 : p.a + p.f
    morph.current += (want - morph.current) * Math.min(1, d * 3)
    const u = universe.uniforms
    u.uMorph.value = morph.current
    u.uAlpha.value = Math.min(1, Math.max(0, (morph.current - 0.15) / 0.6))
    u.uTime.value = t
    u.uSpin.value[1] = reduced ? 0 : 0.45 * Math.sin(t * 0.35)
    const k = WORLD_H / size.height
    PARTICLE_SECTIONS.forEach((base, i) => {
      const sec = portrait && base.portrait ? { ...base, ...base.portrait } : base
      const el = els.current.anchors[i]
      const xf = u.uXf.value[i]
      if (!el) return xf.set(0, 0, 0, 1)
      const r = rectOf(el)
      const span = (sec.fit === 'w' ? r.width : r.height) * k
      xf.set((r.left + r.width / 2 - size.width / 2) * k, -(r.top + r.height * (0.5 + (sec.dy || 0)) - size.height / 2) * k, 0, (span / sec.nominal) * sec.factor)
    })

    models.update({ t, dt: d, k, w: size.width, h: size.height, reduced })

    bloom.render(gl, scene, camera, lite.current ? 1 : 2)
    gl.setRenderTarget(null)
    gl.render(comp.scene, comp.cam)
    // models on top, crisp (not bloomed)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(models.scene, camera)
    gl.autoClear = true
    if (!shown.current) release('bg') // first frame is up: the intro may go
    shown.current = true
  }, 1)

  return null
}

export default function StrandsBackground({ theme }) {
  const reduced = useReducedMotion()
  const [initialDpr] = useState(() => dprFor('bg'))
  return (
    <div className="strands-bg" aria-hidden="true">
      <Canvas
        dpr={initialDpr}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // shader error queries block the main thread until the driver finishes compiling
          gl.debug.checkShaderErrors = import.meta.env.DEV
          // cache this sync GPU query now — later it would wait behind queued shader compiles
          gl.capabilities.getMaxAnisotropy()
          noteRenderer(gl)
          debugPrograms(gl, 'bg')
          // only the lit 3D models use tone mapping; the shader layers ignore it
          gl.toneMapping = THREE.NeutralToneMapping
        }}
      >
        <Flow theme={theme} reduced={reduced} />
      </Canvas>
    </div>
  )
}
