import * as THREE from 'three'
import { LOGO_PATHS, LOGO_VIEWBOX } from '../brand/logo.js'
import { seeded } from './utils.js'

/*
  Particle universe — one cloud of points that morphs between seven shapes as the
  page scrolls (all transitions happen on the GPU):

    0 cloud   (scattered, invisible before About)
    1 logo    the Apheleia "A", sampled from the vector mark          → About
    2 helix   a DNA double helix, building blocks                     → Services
    3 wave    a rolling particle terrain                               → Work
    4 galaxy  a disk with a bright core, orbiting the team ring        → Team
    5 vortex  a black-hole accretion swirl                             → Principles
    6 ring    a glowing portal ring                                    → Contact

  Each shape gets its own transform (uXf: x, y, z, scale) so it can sit on a
  layout anchor and scroll with its section. Rendered into the bloom target.
*/

export const SHAPE_COUNT = 7

/* ---------- shape generators (local units) ---------- */

function sampleLogo(n, rnd) {
  const [vx, vy, vw, vh] = LOGO_VIEWBOX
  const W = 360
  const H = Math.round((W * vh) / vw)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  g.scale(W / vw, H / vh)
  g.translate(-vx, -vy)
  g.fillStyle = '#fff'
  LOGO_PATHS.forEach((d) => g.fill(new Path2D(d)))
  const px = g.getImageData(0, 0, W, H).data
  const fill = []
  const edge = []
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 128
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue
      fill.push(x, y)
      if (!on(x + 1, y) || !on(x - 1, y) || !on(x, y + 1) || !on(x, y - 1)) edge.push(x, y)
    }
  }
  const out = new Float32Array(n * 3)
  const scale = 2.2 / H // logo is 2.2 units tall
  for (let i = 0; i < n; i++) {
    const fromEdge = rnd() < 0.32
    const src = fromEdge ? edge : fill
    const j = Math.floor(rnd() * (src.length / 2)) * 2
    const x = (src[j] + rnd() - W / 2) * scale
    const y = -(src[j + 1] + rnd() - H / 2) * scale
    const z = (rnd() - 0.5) * (fromEdge ? 0.5 : 0.3)
    out.set([x, y, z], i * 3)
  }
  return out
}

function helix(n, rnd) {
  const out = new Float32Array(n * 3)
  const L = 6
  const R = 1.65 // wide enough to loop above and below the service cards
  const turns = 2.5
  for (let i = 0; i < n; i++) {
    const kind = rnd()
    let t = rnd()
    let y
    let z
    if (kind < 0.72) {
      const a = t * turns * Math.PI * 2 + (kind < 0.36 ? 0 : Math.PI)
      const r = R + (rnd() - 0.5) * 0.16
      y = Math.cos(a) * r
      z = Math.sin(a) * r
    } else {
      const rungs = 22
      t = (Math.floor(t * rungs) + 0.5) / rungs
      const a = t * turns * Math.PI * 2
      const u = rnd() * 2 - 1
      y = Math.cos(a) * R * u + (rnd() - 0.5) * 0.03
      z = Math.sin(a) * R * u + (rnd() - 0.5) * 0.03
    }
    out.set([(t - 0.5) * L, y, z], i * 3)
  }
  return out
}

function wave(n, rnd) {
  // a narrow glowing ridge that rises from left to right, like a skyline of growth
  const out = new Float32Array(n * 3)
  const lines = 20
  for (let i = 0; i < n; i++) {
    const z = (Math.floor(rnd() * lines) / (lines - 1) - 0.5) * 0.9
    const x = (rnd() - 0.5) * 8
    const y =
      0.16 * x +
      0.42 * Math.sin(x * 0.7 + z * 1.4) +
      0.16 * Math.sin(x * 2.3 - z * 2.0) +
      0.06 * Math.sin(x * 6.0 + z * 3.0) -
      z * 0.35
    out.set([x, y, z + (rnd() - 0.5) * 0.015], i * 3)
  }
  return out
}

function galaxy(n, rnd) {
  const out = new Float32Array(n * 3)
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const kind = rnd()
    let r
    let y
    if (kind < 0.14) {
      r = Math.abs(gauss()) * 0.45 // bright core
      y = gauss() * 0.18
    } else if (kind < 0.8) {
      r = 2.15 + gauss() * 0.16 // dense orbit
      y = gauss() * 0.05
    } else {
      r = 1.2 + rnd() * 1.9 // sparse disk
      y = gauss() * 0.08
    }
    out.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
  }
  return out
}

function vortex(n, rnd) {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 0.62 + rnd() ** 1.7 * 2.3
    const arm = rnd() < 0.5 ? 0 : Math.PI
    const a = arm + Math.log(r) * 2.4 + (rnd() - 0.5) * (0.9 + r * 0.2)
    const y = (rnd() - 0.5) * 0.06 * (1 + r)
    out.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
  }
  return out
}

function ring(n, rnd) {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const halo = rnd() < 0.22
    const g = (rnd() + rnd() + rnd() - 1.5) / 1.5 // ~gaussian
    const r = halo ? 2.1 + rnd() * 0.7 : 2 + g * 0.09 + 0.07 * Math.sin(a * 7)
    const y = g * (halo ? 0.3 : 0.06)
    out.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
  }
  return out
}

function cloud(n, rnd) {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) out.set([(rnd() - 0.5) * 16, (rnd() - 0.5) * 10, -8 + rnd() * 11], i * 3)
  return out
}

/* ---------- shaders ---------- */

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uAlpha;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec4 uXf[7];
  uniform mat3 uTilt[7];
  uniform float uSpin[7];
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aP4;
  attribute vec3 aP5;
  attribute vec3 aP6;
  attribute vec4 aRnd;
  varying vec3 vCol;
  varying float vA;

  vec3 pick(int k) {
    if (k == 0) return aP0;
    if (k == 1) return aP1;
    if (k == 2) return aP2;
    if (k == 3) return aP3;
    if (k == 4) return aP4;
    if (k == 5) return aP5;
    return aP6;
  }
  vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
  vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }

  vec3 animate(vec3 p, int k) {
    if (k == 1) return p + 0.012 * vec3(sin(uTime * 1.3 + aRnd.y * 20.0), cos(uTime * 1.1 + aRnd.z * 20.0), 0.0);
    if (k == 2) return rotX(p, uTime * 0.6);
    if (k == 3) { p.y += 0.2 * sin(p.x * 1.3 + uTime * 1.1) * cos(p.z * 1.6 - uTime * 0.6); return p; }
    if (k == 4) { float r = length(p.xz); return rotY(p, uTime * (0.12 + 0.35 / (r + 0.6))); }
    if (k == 5) { float r = length(p.xz); return rotY(p, uTime * 0.9 / (r + 0.3)); }
    if (k == 6) {
      float a = atan(p.z, p.x) + uTime * 0.18;
      float r = length(p.xz) * (1.0 + 0.03 * sin(a * 6.0 + uTime * 2.0));
      return vec3(cos(a) * r, p.y + 0.04 * sin(a * 9.0 + uTime * 3.0), sin(a) * r);
    }
    return p + vec3(sin(uTime * 0.2 + aRnd.y * 30.0), cos(uTime * 0.17 + aRnd.z * 30.0), 0.0) * 0.3;
  }

  vec3 place(int k) {
    vec3 p = uTilt[k] * animate(pick(k), k);
    p = rotY(p, uSpin[k]);
    vec4 xf = uXf[k];
    return p * xf.w + xf.xyz;
  }

  void main() {
    float m = clamp(uMorph, 0.0, 6.0);
    int a = int(floor(m));
    int b = a < 6 ? a + 1 : 6;
    float f = m - float(a);
    float fs = smoothstep(aRnd.x * 0.4, aRnd.x * 0.4 + 0.6, f);
    vec3 p = mix(place(a), place(b), fs);
    float swirl = sin(3.14159 * fs);
    p += vec3(sin(aRnd.y * 6.28 + uTime * 0.7), cos(aRnd.z * 6.28 + uTime * 0.6), sin(aRnd.w * 6.28)) * swirl * 0.45;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.55 + aRnd.w * 1.5) * uSize;
    gl_PointSize = size * uPixelRatio * (10.0 / max(-mv.z, 0.5)) * (1.0 + swirl * 0.5);

    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + aRnd.y * 2.0) + aRnd.z * 30.0);
    vA = uAlpha * tw * (0.45 + aRnd.w * 0.8) * (1.0 + swirl * 0.4);
    vCol = aRnd.z > 0.84 ? uColC : mix(uColA, uColB, aRnd.y);
  }
`

const frag = /* glsl */ `
  uniform float uIntensity;
  uniform float uAdditive;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vA * uIntensity;
    gl_FragColor = uAdditive > 0.5 ? vec4(vCol * a, a) : vec4(vCol, min(a, 1.0));
    #include <colorspace_fragment>
  }
`

const starVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uStars;
  attribute vec4 aStar;
  varying float vA;
  void main() {
    gl_Position = vec4(aStar.xy, 0.0, 1.0);
    gl_PointSize = (0.8 + aStar.z * 1.8) * uPixelRatio;
    vA = uStars * (0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * (0.6 + aStar.w * 2.0) + aStar.w * 40.0))) * (0.3 + aStar.z * 0.7);
  }
`
const starFrag = /* glsl */ `
  uniform vec3 uStarCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vA;
    gl_FragColor = vec4(uStarCol * a, a);
    #include <colorspace_fragment>
  }
`

/* ---------- factory ---------- */

export function createParticleUniverse({ count = 20000, stars = 900, seed = 5 } = {}) {
  const rnd = seeded(seed)
  const shapes = [cloud(count, rnd), sampleLogo(count, rnd), helix(count, rnd), wave(count, rnd), galaxy(count, rnd), vortex(count, rnd), ring(count, rnd)]
  const aRnd = new Float32Array(count * 4)
  for (let i = 0; i < count * 4; i++) aRnd[i] = rnd()

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  shapes.forEach((s, k) => geom.setAttribute(`aP${k}`, new THREE.BufferAttribute(s, 3)))
  geom.setAttribute('aRnd', new THREE.BufferAttribute(aRnd, 4))

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uAlpha: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: 1.6 },
    uIntensity: { value: 1 },
    uAdditive: { value: 1 },
    uXf: { value: Array.from({ length: SHAPE_COUNT }, () => new THREE.Vector4(0, 0, 0, 1)) },
    uTilt: { value: Array.from({ length: SHAPE_COUNT }, () => new THREE.Matrix3()) },
    uSpin: { value: new Array(SHAPE_COUNT).fill(0) },
    uColA: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() },
    uColC: { value: new THREE.Color() },
  }
  // fixed tilts so each shape reads in 3D
  const tilt = (x, z = 0) => new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, 0, z)))
  uniforms.uTilt.value = [tilt(0), tilt(0), tilt(0.38, -0.04), tilt(0.35, 0.04), tilt(0.3, 0.08), tilt(1.1, 0.12), tilt(1.28, -0.06)]

  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false })
  const points = new THREE.Points(geom, mat)
  points.frustumCulled = false
  points.renderOrder = 10

  // starfield in clip space
  const sAttr = new Float32Array(stars * 4)
  for (let i = 0; i < stars; i++) sAttr.set([rnd() * 2 - 1, rnd() * 2 - 1, rnd() ** 3, rnd()], i * 4)
  const sGeom = new THREE.BufferGeometry()
  sGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(stars * 3), 3))
  sGeom.setAttribute('aStar', new THREE.BufferAttribute(sAttr, 4))
  const starUniforms = { uTime: uniforms.uTime, uPixelRatio: uniforms.uPixelRatio, uStars: { value: 1 }, uStarCol: { value: new THREE.Color('#eaffd8') } }
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    vertexShader: starVert,
    fragmentShader: starFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  })
  const starPoints = new THREE.Points(sGeom, starMat)
  starPoints.frustumCulled = false
  starPoints.renderOrder = -1

  const group = new THREE.Group()
  group.add(starPoints, points)

  const setPalette = (p) => {
    uniforms.uColA.value.set(p.a)
    uniforms.uColB.value.set(p.b)
    uniforms.uColC.value.set(p.c)
    uniforms.uAdditive.value = p.additive ? 1 : 0
    uniforms.uIntensity.value = p.intensity
    uniforms.uSize.value = p.size
    starUniforms.uStars.value = p.stars
    if (p.additive) {
      mat.blending = THREE.CustomBlending
      mat.blendSrc = THREE.OneFactor
      mat.blendDst = THREE.OneFactor
    } else {
      mat.blending = THREE.NormalBlending
    }
    mat.needsUpdate = true
  }

  const dispose = () => {
    geom.dispose()
    sGeom.dispose()
    mat.dispose()
    starMat.dispose()
  }

  // draw only a share of the points (each shape is sampled randomly, so any prefix is uniform)
  const setDensity = (f) => geom.setDrawRange(0, Math.max(1, Math.floor(count * f)))

  return { group, uniforms, setPalette, setDensity, dispose }
}
