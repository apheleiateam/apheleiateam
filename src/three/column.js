import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/*
  A classical Ionic column, built procedurally so it has real detail:
  stepped plinth · Attic base (torus–scotia–torus) · fluted, tapering shaft ·
  astragal · echinus · Ionic capital with spiral volutes and bolsters · abacus ·
  and a bronze-green brazier bowl on top for the eternal flame.
  Units: the bowl's rim sits at y = TOP; everything is centred on x/z = 0.
*/

export const COLUMN_TOP = 4.52 // y of the brazier rim, where the flame starts

/* ---------- veined marble texture ---------- */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y) {
  let v = 0
  let a = 0.5
  for (let i = 0; i < 5; i++) {
    v += a * noise(x, y)
    x *= 2.03
    y *= 2.03
    a *= 0.5
  }
  return v
}
function marbleTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  const base = [233, 239, 229]
  const vein = [150, 170, 152]
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = x / S
      const ny = y / S
      const turb = fbm(nx * 5, ny * 5)
      const v1 = Math.abs(Math.sin((nx * 3 + ny * 9 + turb * 7) * Math.PI))
      const v2 = Math.abs(Math.sin((nx * 11 - ny * 4 + fbm(nx * 9 + 3, ny * 9) * 5) * Math.PI))
      const line = Math.pow(1 - v1, 18) * 0.85 + Math.pow(1 - v2, 30) * 0.45
      const cloud = (fbm(nx * 3 + 7, ny * 3) - 0.5) * 0.08
      const k = Math.min(1, line)
      const i = (y * S + x) * 4
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = base[ch] * (1 - k) + vein[ch] * k + cloud * 255
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/* ---------- profile helpers ---------- */
// lathe profile points (r, y) with arcs for tori and coves
const arc = (pts, cx, cy, r, a0, a1, steps = 10) => {
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
  }
}
const lathe = (pts, segs = 64) => new THREE.LatheGeometry(pts, segs)
// mergeGeometries needs every part non-indexed
const flat = (g) => (g.index ? g.toNonIndexed() : g)

function atticBase(y0) {
  const p = [new THREE.Vector2(0, y0), new THREE.Vector2(0.6, y0)]
  arc(p, 0.6, y0 + 0.085, 0.085, -Math.PI / 2, Math.PI / 2, 12) // lower torus
  p.push(new THREE.Vector2(0.57, y0 + 0.17))
  arc(p, 0.57, y0 + 0.235, 0.065, -Math.PI / 2, -Math.PI * 1.02, 10) // scotia (cove), concave
  p.push(new THREE.Vector2(0.52, y0 + 0.3))
  arc(p, 0.52, y0 + 0.345, 0.05, -Math.PI / 2, Math.PI / 2, 10) // upper torus
  p.push(new THREE.Vector2(0.45, y0 + 0.4), new THREE.Vector2(0.44, y0 + 0.44))
  return lathe(p)
}

function flutedShaft(y0, height, rBottom, rTop, flutes = 24) {
  const shape = new THREE.Shape()
  const N = flutes * 16
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const f = (a * flutes) / (Math.PI * 2)
    const phase = f - Math.floor(f) // 0..1 across one flute
    // a concave flute with a narrow flat fillet between neighbours
    const inFlute = phase > 0.08 && phase < 0.92
    const t = (phase - 0.08) / 0.84
    const depth = inFlute ? Math.sin(t * Math.PI) * 0.045 : 0
    const r = 1 - depth
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 24, curveSegments: 1 })
  geom.rotateX(-Math.PI / 2)
  // entasis: a gentle taper with a slight swell low on the shaft
  const pos = geom.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = y / height
    const r = THREE.MathUtils.lerp(rBottom, rTop, t) * (1 + 0.025 * Math.sin(t * Math.PI * 0.9))
    pos.setX(i, pos.getX(i) * r)
    pos.setZ(i, pos.getZ(i) * r)
    pos.setY(i, y + y0)
  }
  geom.computeVertexNormals()
  return geom
}

function torus(y, r, tube) {
  const g = new THREE.TorusGeometry(r, tube, 14, 64)
  g.rotateX(Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

class Spiral extends THREE.Curve {
  constructor(cx, cy, z, r0, turns, dir) {
    super()
    Object.assign(this, { cx, cy, z, r0, turns, dir })
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = this.dir * t * this.turns * Math.PI * 2 + Math.PI / 2
    const r = this.r0 * (1 - 0.88 * t)
    return target.set(this.cx + Math.cos(a) * r * this.dir, this.cy + Math.sin(a) * r, this.z)
  }
}

function ionicCapital(y0) {
  const parts = []
  parts.push(torus(y0 + 0.02, 0.405, 0.028)) // astragal
  const ech = [new THREE.Vector2(0, y0 + 0.04), new THREE.Vector2(0.4, y0 + 0.04)]
  arc(ech, 0.4, y0 + 0.13, 0.09, -Math.PI / 2, 0.25, 10) // echinus (egg moulding)
  ech.push(new THREE.Vector2(0.46, y0 + 0.2), new THREE.Vector2(0, y0 + 0.2))
  parts.push(lathe(ech))

  const vy = y0 + 0.17 // volute eye height
  for (const side of [-1, 1]) {
    // bolster (pulvinus) running front to back, slightly waisted
    const bol = [new THREE.Vector2(0, -0.34)]
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      bol.push(new THREE.Vector2(0.15 - 0.03 * Math.sin(t * Math.PI), -0.34 + t * 0.68))
    }
    bol.push(new THREE.Vector2(0, 0.34))
    const b = lathe(bol, 32)
    b.rotateX(Math.PI / 2)
    b.translate(side * 0.56, vy, 0)
    parts.push(b)
    for (const z of [-0.345, 0.345]) {
      const curve = new Spiral(side * 0.56, vy, z, 0.15, 2.4, side)
      parts.push(new THREE.TubeGeometry(curve, 160, 0.02, 8, false))
      const eye = new THREE.SphereGeometry(0.032, 16, 12)
      eye.translate(side * 0.56, vy, z)
      parts.push(eye)
    }
  }
  // canalis: the channel linking the volutes, front and back
  const can = new RoundedBoxGeometry(1.12, 0.12, 0.7, 2, 0.03)
  can.translate(0, vy + 0.1, 0)
  parts.push(can)
  // abacus
  const abacus = new RoundedBoxGeometry(1.28, 0.085, 0.84, 3, 0.02)
  abacus.translate(0, vy + 0.205, 0)
  parts.push(abacus)
  return mergeGeometries(parts.map(flat))
}

function brazier(y0) {
  // stem + wide shallow bowl with a rolled lip, drawn as one solid profile
  const p = [new THREE.Vector2(0, y0), new THREE.Vector2(0.2, y0), new THREE.Vector2(0.15, y0 + 0.08), new THREE.Vector2(0.12, y0 + 0.14)]
  p.push(new THREE.Vector2(0.2, y0 + 0.2), new THREE.Vector2(0.38, y0 + 0.27), new THREE.Vector2(0.55, y0 + 0.36), new THREE.Vector2(0.64, y0 + 0.43))
  arc(p, 0.64, y0 + 0.455, 0.025, -Math.PI / 2, Math.PI * 0.9, 8) // rolled lip
  p.push(new THREE.Vector2(0.58, y0 + 0.44), new THREE.Vector2(0.4, y0 + 0.36), new THREE.Vector2(0, y0 + 0.31))
  return lathe(p)
}

export function buildColumn() {
  const marble = new THREE.MeshPhysicalMaterial({
    map: marbleTexture(),
    color: '#ffffff',
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    sheen: 0.35,
    sheenColor: '#e9f5e4',
  })
  const bronze = new THREE.MeshPhysicalMaterial({
    color: '#1d4a2a',
    metalness: 0.75,
    roughness: 0.32,
    clearcoat: 0.6,
    emissive: '#2f6a12',
    emissiveIntensity: 0.25,
  })

  const steps = mergeGeometries([
    flat(new RoundedBoxGeometry(1.6, 0.14, 1.6, 3, 0.025).translate(0, 0.07, 0)),
    flat(new RoundedBoxGeometry(1.38, 0.12, 1.38, 3, 0.02).translate(0, 0.2, 0)),
  ])
  const body = mergeGeometries([steps, flat(atticBase(0.26)), flat(flutedShaft(0.7, 3.0, 0.44, 0.38)), ionicCapital(3.7)])

  const group = new THREE.Group()
  const column = new THREE.Mesh(body, marble)
  const bowl = new THREE.Mesh(brazier(4.07), bronze)
  group.add(column, bowl)
  group.userData.dispose = () => {
    body.dispose()
    bowl.geometry.dispose()
    marble.map.dispose()
    marble.dispose()
    bronze.dispose()
  }
  return group
}
