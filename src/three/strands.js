import * as THREE from 'three'
import { seeded } from './utils.js'

/*
  Energy flow — a bundle of light that converges in a white-hot focal point and
  fans out into two arms (a horseshoe), like a long-exposure light painting.

  Layers (all computed in the vertex shader in "view units": y ∈ [-1, 1],
  x ∈ [-aspect, aspect], rendered straight to clip space, no camera):
    · sheets  — broad, soft ribbons of light that carry most of the energy
    · fibres  — fine strands with bright pulses travelling along them
    · dust    — sparks drifting on the flow
    · core    — a small white-hot point where everything turns
  It is meant to be rendered into an HDR target and bloomed (see bloom.js).
  The cursor gently parts the flow.
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

  vec2 strandPoint(float t, vec4 seed, out float focus) {
    float at = abs(t);
    vec2 p = vec2(uOpen * t * t, uLen * t);
    vec2 tangent = normalize(vec2(2.0 * uOpen * t, uLen));
    vec2 normal = vec2(-tangent.y, tangent.x);
    float fan = seed.x * uSpread * pow(at, 1.3);
    float ripple = 0.6 * sin(t * 4.5 + uTime * 0.6 + seed.y) + 0.4 * sin(t * 1.8 - uTime * 0.4 + seed.y * 1.7);
    p += normal * (fan + ripple * uWave * (0.12 + at));
    p = toView(p);
    vec2 d = p - uPointer;
    float infl = exp(-dot(d, d) * 12.0) * uPointerForce;
    p += normalize(d + vec2(1e-4)) * infl * 0.09;
    focus = exp(-t * t * 40.0);
    return p;
  }
`

const LOOK = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uCore;
  uniform float uIntensity;
  uniform float uAdditive;
  uniform float uPixelRatio;

  vec4 emit(vec3 col, float a) {
    a = clamp(a * uIntensity, 0.0, 4.0);
    return uAdditive > 0.5 ? vec4(col * a, a) : vec4(col, min(a, 1.0));
  }
`

/* ---- sheets: soft ribbons with a gaussian cross-section ---- */
const sheetVert = COMMON + /* glsl */ `
  attribute float aT;
  attribute float aSide;
  attribute float aWidth;
  attribute vec4 aSeed;
  varying float vSide;
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    float f0, f1;
    vec2 p = strandPoint(aT, aSeed, f0);
    vec2 q = strandPoint(aT + 0.01, aSeed, f1);
    vec2 tng = normalize(q - p + vec2(1e-5));
    vec2 nrm = vec2(-tng.y, tng.x);
    float at = abs(aT);
    p += nrm * aSide * aWidth * (0.2 + 1.3 * pow(at, 1.15));
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    float flow = 0.55 + 0.45 * sin(aT * 5.0 - uTime * 1.3 + aSeed.y);
    vA = aSeed.w * (1.0 - smoothstep(0.5, 1.0, at)) * flow * (1.0 + 3.0 * exp(-aT * aT * 18.0));
    vSide = aSide;
    vMix = aSeed.z;
    vHot = f0;
  }
`
const sheetFrag = LOOK + /* glsl */ `
  varying float vSide;
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    float prof = exp(-vSide * vSide * 3.2);
    vec3 col = mix(mix(uColA, uColB, vMix), uCore, clamp(vHot, 0.0, 1.0) * 0.85);
    gl_FragColor = emit(col, vA * prof);
    #include <colorspace_fragment>
  }
`

/* ---- fibres: fine strands with travelling pulses of light ---- */
const fibreVert = COMMON + /* glsl */ `
  attribute float aT;
  attribute vec4 aSeed;
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    float focus;
    vec2 p = strandPoint(aT, aSeed, focus);
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    float at = abs(aT);
    float pulse = pow(0.5 + 0.5 * sin(aT * 7.0 - uTime * (1.4 + aSeed.w * 2.0) + aSeed.y * 3.0), 6.0);
    vA = aSeed.w * (1.0 - smoothstep(0.55, 1.0, at)) * (0.25 + 1.8 * pulse) * (1.0 + 2.0 * exp(-aT * aT * 18.0));
    vMix = aSeed.z;
    vHot = focus;
  }
`
const fibreFrag = LOOK + /* glsl */ `
  varying float vA;
  varying float vMix;
  varying float vHot;
  void main() {
    vec3 col = mix(mix(uColA, uColB, vMix), uCore, clamp(vHot, 0.0, 1.0) * 0.8);
    gl_FragColor = emit(col, vA);
    #include <colorspace_fragment>
  }
`

/* ---- dust ---- */
const dustVert = COMMON + /* glsl */ `
  uniform float uPixelRatio;
  attribute float aT;
  attribute vec4 aSeed;
  attribute float aSize;
  varying float vA;
  varying float vHot;
  void main() {
    float focus;
    float t = aT + 0.04 * sin(uTime * 0.25 + aSeed.y);
    vec2 p = strandPoint(t, aSeed, focus);
    p += vec2(sin(uTime * 0.35 + aSeed.y * 3.0), cos(uTime * 0.3 + aSeed.y * 2.0)) * 0.02;
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio;
    float tw = 0.5 + 0.5 * sin(uTime * (1.0 + aSeed.w * 2.5) + aSeed.y * 5.0);
    vA = tw * (1.0 - smoothstep(0.6, 1.0, abs(t))) * 0.6;
    vHot = focus;
  }
`
const dustFrag = LOOK + /* glsl */ `
  varying float vA;
  varying float vHot;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = emit(mix(uColA, uCore, 0.7), a * a * vA);
    #include <colorspace_fragment>
  }
`

/* ---- white-hot core where the flow turns ---- */
const coreVert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
const coreFrag = COMMON + LOOK + /* glsl */ `
  uniform float uCoreGlow;
  varying vec2 vP;
  void main() {
    vec2 v = vec2(vP.x * uAspect, vP.y);
    vec2 q = v - (uVertex + vec2(cos(uAngle), sin(uAngle)) * 0.02);
    float r2 = dot(q, q);
    float g = exp(-r2 * 420.0) * 0.8;
    gl_FragColor = emit(uCore, g * uCoreGlow);
    #include <colorspace_fragment>
  }
`

export const STRAND_SHAPES = {
  home: { vx: -0.6, vy: -0.08, angle: 0, open: 1.3, len: 1.5, spread: 0.36, wave: 0.045, intensity: 1 },
  process: { vx: 0.92, vy: 0.2, angle: Math.PI, open: 1.0, len: 1.7, spread: 0.39, wave: 0.05, intensity: 0.8 },
  about: { vx: 0.8, vy: 0.05, angle: Math.PI, open: 1.1, len: 1.6, spread: 0.39, wave: 0.05, intensity: 0.9 },
  services: { vx: -0.85, vy: 0.6, angle: -0.6, open: 0.8, len: 1.9, spread: 0.45, wave: 0.06, intensity: 0.85 },
  work: { vx: 0.05, vy: 1.2, angle: -Math.PI / 2, open: 0.9, len: 1.8, spread: 0.42, wave: 0.06, intensity: 0.85 },
  principles: { vx: -0.72, vy: -0.25, angle: 0.25, open: 1.2, len: 1.6, spread: 0.36, wave: 0.05, intensity: 0.9 },
  contact: { vx: 0.5, vy: -0.05, angle: Math.PI * 0.92, open: 1.4, len: 1.4, spread: 0.33, wave: 0.045, intensity: 1 },
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

export function createStrandField({ sheets = 14, fibres = 90, segments = 150, dust = 300, seed = 11 } = {}) {
  const rnd = seeded(seed)
  const uniforms = {
    uTime: { value: 0 },
    uVertex: { value: new THREE.Vector2(-0.6, 0) },
    uAngle: { value: 0 },
    uOpen: { value: 1.2 },
    uLen: { value: 1.5 },
    uSpread: { value: 0.6 },
    uWave: { value: 0.05 },
    uAspect: { value: 1 },
    uPointer: { value: new THREE.Vector2(9, 9) },
    uPointerForce: { value: 0 },
    uColA: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() },
    uCore: { value: new THREE.Color() },
    uIntensity: { value: 1 },
    uAdditive: { value: 1 },
    uPixelRatio: { value: 1 },
    uCoreGlow: { value: 1 },
  }

  const spreadSeed = (k = 1) => {
    const u = rnd() * 2 - 1
    return Math.sign(u) * Math.abs(u) ** 0.85 * k
  }
  const coolOr = (p) => (rnd() < p ? 0.75 + rnd() * 0.25 : rnd() * 0.35)

  /* sheets */
  const sv = sheets * segments * 2
  const sT = new Float32Array(sv)
  const sSide = new Float32Array(sv)
  const sWidth = new Float32Array(sv)
  const sSeed = new Float32Array(sv * 4)
  const sIndex = []
  for (let i = 0; i < sheets; i++) {
    const sd = [spreadSeed(0.8), rnd() * Math.PI * 2, coolOr(0.28), 0.12 + rnd() * 0.14]
    const width = 0.014 + rnd() * 0.036
    for (let j = 0; j < segments; j++) {
      for (let side = 0; side < 2; side++) {
        const k = (i * segments + j) * 2 + side
        sT[k] = (j / (segments - 1)) * 2 - 1
        sSide[k] = side ? 1 : -1
        sWidth[k] = width
        sSeed.set(sd, k * 4)
      }
      if (j < segments - 1) {
        const a = (i * segments + j) * 2
        sIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
  const sheetGeom = new THREE.BufferGeometry()
  sheetGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sv * 3), 3))
  sheetGeom.setAttribute('aT', new THREE.BufferAttribute(sT, 1))
  sheetGeom.setAttribute('aSide', new THREE.BufferAttribute(sSide, 1))
  sheetGeom.setAttribute('aWidth', new THREE.BufferAttribute(sWidth, 1))
  sheetGeom.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 4))
  sheetGeom.setIndex(sIndex)

  /* fibres */
  const fv = fibres * (segments - 1) * 2
  const fT = new Float32Array(fv)
  const fSeed = new Float32Array(fv * 4)
  let k = 0
  for (let i = 0; i < fibres; i++) {
    const sd = [spreadSeed(), rnd() * Math.PI * 2, coolOr(0.22), 0.1 + rnd() * 0.28]
    for (let j = 0; j < segments - 1; j++) {
      for (const jj of [j, j + 1]) {
        fT[k] = (jj / (segments - 1)) * 2 - 1
        fSeed.set(sd, k * 4)
        k++
      }
    }
  }
  const fibreGeom = new THREE.BufferGeometry()
  fibreGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fv * 3), 3))
  fibreGeom.setAttribute('aT', new THREE.BufferAttribute(fT, 1))
  fibreGeom.setAttribute('aSeed', new THREE.BufferAttribute(fSeed, 4))

  /* dust */
  const dT = new Float32Array(dust)
  const dSeed = new Float32Array(dust * 4)
  const dSize = new Float32Array(dust)
  for (let i = 0; i < dust; i++) {
    dT[i] = (rnd() * 2 - 1) * 0.95
    dSeed.set([spreadSeed(1.2), rnd() * Math.PI * 2, rnd(), rnd()], i * 4)
    dSize[i] = 1.2 + rnd() ** 3 * 3.5
  }
  const dustGeom = new THREE.BufferGeometry()
  dustGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dust * 3), 3))
  dustGeom.setAttribute('aT', new THREE.BufferAttribute(dT, 1))
  dustGeom.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 4))
  dustGeom.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1))

  const base = { uniforms, transparent: true, depthTest: false, depthWrite: false }
  const sheetMat = new THREE.ShaderMaterial({ ...base, vertexShader: sheetVert, fragmentShader: sheetFrag })
  const fibreMat = new THREE.ShaderMaterial({ ...base, vertexShader: fibreVert, fragmentShader: fibreFrag })
  const dustMat = new THREE.ShaderMaterial({ ...base, vertexShader: dustVert, fragmentShader: dustFrag })
  const coreMat = new THREE.ShaderMaterial({ ...base, vertexShader: coreVert, fragmentShader: coreFrag })
  const mats = [sheetMat, fibreMat, dustMat, coreMat]

  const objects = [
    new THREE.Mesh(sheetGeom, sheetMat),
    new THREE.LineSegments(fibreGeom, fibreMat),
    new THREE.Points(dustGeom, dustMat),
    new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coreMat),
  ]
  const group = new THREE.Group()
  objects.forEach((o, i) => {
    o.frustumCulled = false
    o.renderOrder = i
    group.add(o)
  })

  const setPalette = (p) => {
    uniforms.uColA.value.set(p.a)
    uniforms.uColB.value.set(p.b)
    uniforms.uCore.value.set(p.core)
    uniforms.uAdditive.value = p.additive ? 1 : 0
    uniforms.uCoreGlow.value = p.core_glow ?? 1
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
    objects.forEach((o) => o.geometry.dispose())
    mats.forEach((m) => m.dispose())
  }

  return { group, uniforms, setPalette, setShape, dispose }
}

// Shared pointer, updated once for every strand field on the page.
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
