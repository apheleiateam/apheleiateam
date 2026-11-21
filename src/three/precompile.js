import * as THREE from 'three'

/*
  Queue every shader a scene will need before its first frame, so the GPU driver
  compiles them while nothing is waiting on them — instead of at the first draw.

  Uses renderer.compile(), which only *enqueues* compile + link (with shader error
  checks off, nothing blocks). Not compileAsync(): its readiness polling makes a
  synchronous GPU round-trip per material every 10 ms, which stalls the page.

  Glass with real refraction makes three.js draw the opaque objects a second
  time into an offscreen target, linear and without tone mapping — a different
  shader variant. Those are queued too, but only for the opaque objects.

  `root` can be the whole scene or one subtree (e.g. a model that just loaded);
  `scene` provides the lights and environment.
*/
let rt = null

export function precompile(gl, root, camera, scene = root) {
  gl.compile(root, camera, scene)

  let refracts = false
  scene.traverse((o) => {
    if (o.material?.transmission > 0) refracts = true
  })
  if (!refracts) return
  const opaque = []
  root.traverse((o) => {
    const m = o.material
    if (o.isMesh && m && !Array.isArray(m) && !m.transparent && !(m.transmission > 0)) opaque.push(o)
  })
  if (!opaque.length) return
  rt ??= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const prevTarget = gl.getRenderTarget()
  const prevTone = gl.toneMapping
  gl.setRenderTarget(rt)
  gl.toneMapping = THREE.NoToneMapping
  for (const o of opaque) gl.compile(o, camera, scene)
  gl.toneMapping = prevTone
  gl.setRenderTarget(prevTarget)
}

// Same, into an offscreen (linear, untonemapped) target — for scenes drawn into bloom buffers.
export function precompileOffscreen(gl, scene, camera) {
  rt ??= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const prev = gl.getRenderTarget()
  gl.setRenderTarget(rt)
  gl.compile(scene, camera)
  gl.setRenderTarget(prev)
}

// Resolves after `frames` animation frames — time for queued compiles to finish.
export const afterFrames = (frames = 6) =>
  new Promise((resolve) => {
    const step = () => (--frames <= 0 ? resolve() : requestAnimationFrame(step))
    requestAnimationFrame(step)
  })
