import * as THREE from 'three'
import { seeded } from './utils.js'

/*
  Light strands — a bundle of fine glowing fibres that converge in a hot focal
  point and fan out into two arms (a horseshoe), rippling slowly. Everything is
  computed in the vertex shader in "view units" (y ∈ [-1, 1], x ∈ [-aspect, aspect]),
  so it renders straight to clip space and needs no camera.

  Layers: a soft haze band (full-screen quad), ~150 one-pixel strands, and dust
  particles. The cursor gently pushes strands aside and brightens them.
*/

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform vec2 uVertex;
  uniform float uAngle;
  uniform float uOpen;
  uniform float uLen;
  uniform float uSpread;
  uniform float uWave;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform float uPointerForce;

  vec2 toView(vec2 p) {
    float c = cos(uAngle), s = sin(uAngle);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y) + uVertex;
  }

  vec2 strandPoint(float t, vec4 seed, out float focus, out float infl) {
    float at = abs(t);
    vec2 p = vec2(uOpen * t * t, uLen * t);
    vec2 tangent = normalize(vec2(2.0 * uOpen * t, uLen));
    vec2 normal = vec2(-tangent.y, tangent.x);
    float fan = seed.x * uSpread * pow(at, 1.3);
    float ripple = 0.6 * sin(t * 5.5 + uTime * 0.75 + seed.y) + 0.4 * sin(t * 2.1 - uTime * 0.45 + seed.y * 1.7);
    p += normal * (fan + ripple * uWave * (0.15 + at));
    p = toView(p);
    vec2 d = p - uPointer;
    infl = exp(-dot(d, d) * 14.0) * uPointerForce;
    p += normalize(d + vec2(1e-4)) * infl * 0.07;
    focus = exp(-t * t * 30.0);
    return p;
  }
`

const PALETTE_UNIFORMS = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uCore;
  uniform float uIntensity;
  uniform float uAdditive;
  uniform float uHaze;
  uniform float uPixelRatio;
`

const lineVert = COMMON + /* glsl */ `
  attribute float aT;
  attribute vec4 aSeed;
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    float focus, infl;
    vec2 p = strandPoint(aT, aSeed, focus, infl);
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    float at = abs(aT);
    vA = aSeed.w * (1.0 - smoothstep(0.6, 1.0, at)) * (1.0 + infl * 2.0);
    vMix = aSeed.z;
    vHot = focus + infl;
  }
`

const lineFrag = PALETTE_UNIFORMS + /* glsl */ `
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    vec3 col = mix(uColA, uColB, vMix);
    col = mix(col, uCore, clamp(vHot, 0.0, 1.0) * 0.75);
    float a = clamp(vA * uIntensity, 0.0, 1.0);
    gl_FragColor = uAdditive > 0.5 ? vec4(col * a, a) : vec4(col, a);
    #include <colorspace_fragment>
  }
`

const pointVert = COMMON + /* glsl */ `
  uniform float uPixelRatio;
  attribute float aT;
  attribute vec4 aSeed;
  attribute float aSize;
  varying float vA;
  varying float vHot;
  void main() {
    float focus, infl;
    float t = aT + 0.03 * sin(uTime * 0.3 + aSeed.y);
    vec2 p = strandPoint(t, aSeed, focus, infl);
    p += vec2(sin(uTime * 0.4 + aSeed.y * 3.0), cos(uTime * 0.35 + aSeed.y * 2.0)) * 0.015;
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + focus * 1.5);
    float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.w * 2.0) + aSeed.y * 5.0);
    vA = tw * (1.0 - smoothstep(0.65, 1.0, abs(t)));
    vHot = focus;
  }
`

const pointFrag = PALETTE_UNIFORMS + /* glsl */ `
  varying float vA;
  varying float vHot;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vA * uIntensity;
    vec3 col = mix(uColA, uCore, 0.6 + 0.4 * vHot);
    gl_FragColor = uAdditive > 0.5 ? vec4(col * a, a) : vec4(col, a * 0.8);
    #include <colorspace_fragment>
  }
`

const hazeVert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const hazeFrag = COMMON + PALETTE_UNIFORMS + /* glsl */ `
  varying vec2 vP;
  void main() {
    vec2 v = vec2(vP.x * uAspect, vP.y);
    vec2 q = v - uVertex;
    float c = cos(-uAngle), s = sin(-uAngle);
    q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    float t = q.y / uLen;
    float along = 1.0 - smoothstep(0.45, 1.1, abs(t));
    float dx = q.x - uOpen * t * t;
    float width = 0.05 + uSpread * 0.22 * pow(abs(t), 1.3);
    float band = exp(-dx * dx / (width * width)) * along;
    float focal = exp(-dot(q, q) * 9.0);
    vec2 dp = v - uPointer;
    float torch = exp(-dot(dp, dp) * 5.0) * uPointerForce * 0.35;
    float g = (band * 0.32 + focal * 0.85 + torch) * uHaze;
    vec3 col = mix(uColA, uCore, clamp(focal * 1.2, 0.0, 1.0));
    gl_FragColor = uAdditive > 0.5 ? vec4(col * g, g) : vec4(col, clamp(g, 0.0, 1.0) * 0.55);
    #include <colorspace_fragment>
  }
`

export const STRAND_SHAPES = {
  home: { vx: -0.62, vy: -0.08, angle: 0, open: 1.25, len: 1.5, spread: 0.55, wave: 0.05, intensity: 1 },
  process: { vx: 0.92, vy: 0.2, angle: Math.PI, open: 1.0, len: 1.7, spread: 0.6, wave: 0.06, intensity: 0.8 },
  about: { vx: 0.8, vy: 0.05, angle: Math.PI, open: 1.1, len: 1.6, spread: 0.6, wave: 0.06, intensity: 0.9 },
  services: { vx: -0.85, vy: 0.6, angle: -0.6, open: 0.8, len: 1.9, spread: 0.7, wave: 0.07, intensity: 0.85 },
  work: { vx: 0.05, vy: 1.2, angle: -Math.PI / 2, open: 0.9, len: 1.8, spread: 0.65, wave: 0.07, intensity: 0.85 },
  principles: { vx: -0.72, vy: -0.25, angle: 0.25, open: 1.2, len: 1.6, spread: 0.55, wave: 0.06, intensity: 0.9 },
  contact: { vx: 0.5, vy: -0.05, angle: Math.PI * 0.92, open: 1.4, len: 1.4, spread: 0.5, wave: 0.05, intensity: 1.1 },
}
const SHAPE_KEYS = ['vx', 'vy', 'angle', 'open', 'len', 'spread', 'wave', 'intensity']

export const mixShape = (a, b, t, out = {}) => {
  for (const k of SHAPE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t
  return out
}
export const dampShape = (cur, target, f) => {
  for (const k of SHAPE_KEYS) cur[k] += (target[k] - cur[k]) * f
  return cur
}

export function createStrandField({ strands = 150, segments = 160, particles = 420, seed = 11 } = {}) {
  const rnd = seeded(seed)
  const uniforms = {
    uTime: { value: 0 },
    uVertex: { value: new THREE.Vector2(-0.6, 0) },
    uAngle: { value: 0 },
    uOpen: { value: 1.2 },
    uLen: { value: 1.5 },
    uSpread: { value: 0.55 },
    uWave: { value: 0.05 },
    uAspect: { value: 1 },
    uPointer: { value: new THREE.Vector2(9, 9) },
    uPointerForce: { value: 0 },
    uColA: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() },
    uCore: { value: new THREE.Color() },
    uIntensity: { value: 1 },
    uAdditive: { value: 1 },
    uHaze: { value: 0.5 },
    uPixelRatio: { value: 1 },
  }

  const seedFor = () => {
    const u = rnd() * 2 - 1
    return [
      Math.sign(u) * Math.abs(u) ** 0.8, // spread offset (denser near the centre line)
      rnd() * Math.PI * 2, // ripple phase
      rnd() < 0.72 ? rnd() * 0.45 : 0.75 + rnd() * 0.25, // colour mix (mostly lime, some cool)
      0.08 + rnd() * 0.32, // brightness
    ]
  }

  // strands as one LineSegments draw call
  const vCount = strands * (segments - 1) * 2
  const lT = new Float32Array(vCount)
  const lSeed = new Float32Array(vCount * 4)
  let k = 0
  for (let i = 0; i < strands; i++) {
    const sd = seedFor()
    for (let j = 0; j < segments - 1; j++) {
      for (const jj of [j, j + 1]) {
        lT[k] = (jj / (segments - 1)) * 2 - 1
        lSeed.set(sd, k * 4)
        k++
      }
    }
  }
  const lineGeom = new THREE.BufferGeometry()
  lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3))
  lineGeom.setAttribute('aT', new THREE.BufferAttribute(lT, 1))
  lineGeom.setAttribute('aSeed', new THREE.BufferAttribute(lSeed, 4))

  // dust particles riding the strands
  const pT = new Float32Array(particles)
  const pSeed = new Float32Array(particles * 4)
  const pSize = new Float32Array(particles)
  for (let i = 0; i < particles; i++) {
    pT[i] = (rnd() * 2 - 1) * 0.95
    pSeed.set(seedFor(), i * 4)
    pSize[i] = 1.5 + rnd() ** 3 * 5
  }
  const pointGeom = new THREE.BufferGeometry()
  pointGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particles * 3), 3))
  pointGeom.setAttribute('aT', new THREE.BufferAttribute(pT, 1))
  pointGeom.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 4))
  pointGeom.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1))

  const base = { uniforms, transparent: true, depthTest: false, depthWrite: false }
  const hazeMat = new THREE.ShaderMaterial({ ...base, vertexShader: hazeVert, fragmentShader: hazeFrag })
  const lineMat = new THREE.ShaderMaterial({ ...base, vertexShader: lineVert, fragmentShader: lineFrag })
  const pointMat = new THREE.ShaderMaterial({ ...base, vertexShader: pointVert, fragmentShader: pointFrag })
  const mats = [hazeMat, lineMat, pointMat]

  const haze = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hazeMat)
  const lines = new THREE.LineSegments(lineGeom, lineMat)
  const points = new THREE.Points(pointGeom, pointMat)
  ;[haze, lines, points].forEach((o, i) => {
    o.frustumCulled = false
    o.renderOrder = i
  })
  const group = new THREE.Group()
  group.add(haze, lines, points)

  const setPalette = (p) => {
    uniforms.uColA.value.set(p.a)
    uniforms.uColB.value.set(p.b)
    uniforms.uCore.value.set(p.core)
    uniforms.uAdditive.value = p.additive ? 1 : 0
    uniforms.uHaze.value = p.haze
    for (const m of mats) {
      if (p.additive) {
        m.blending = THREE.CustomBlending
        m.blendEquation = THREE.AddEquation
        m.blendSrc = THREE.OneFactor
        m.blendDst = THREE.OneFactor
      } else {
        m.blending = THREE.NormalBlending
      }
      m.needsUpdate = true
    }
  }

  const setShape = (s, aspect, strength = 1) => {
    uniforms.uAspect.value = aspect
    uniforms.uVertex.value.set(s.vx * aspect, s.vy)
    uniforms.uAngle.value = s.angle
    uniforms.uOpen.value = s.open
    uniforms.uLen.value = s.len
    uniforms.uSpread.value = s.spread
    uniforms.uWave.value = s.wave
    uniforms.uIntensity.value = s.intensity * strength
  }

  const dispose = () => {
    lineGeom.dispose()
    pointGeom.dispose()
    haze.geometry.dispose()
    mats.forEach((m) => m.dispose())
  }

  return { group, uniforms, setPalette, setShape, dispose }
}

// Shared pointer in view units, updated once for every strand field on the page.
export const pointer = { cx: -9999, cy: -9999, force: 0, target: 0, last: 0 }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.cx = e.clientX
      pointer.cy = e.clientY
      pointer.target = e.pointerType === 'touch' ? 0 : 1
      pointer.last = performance.now()
    },
    { passive: true },
  )
}
export const tickPointer = (dt) => {
  if (performance.now() - pointer.last > 2500) pointer.target = 0
  pointer.force += (pointer.target - pointer.force) * Math.min(1, dt * 3)
}

// Cursor position in a canvas's view units (y ∈ [-1, 1], x ∈ [-aspect, aspect]).
export const pointerIn = (rect, out) => {
  const aspect = rect.width / rect.height
  out.set((((pointer.cx - rect.left) / rect.width) * 2 - 1) * aspect, -(((pointer.cy - rect.top) / rect.height) * 2 - 1))
  return out
}
