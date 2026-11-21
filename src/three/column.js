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

/* The veined marble texture (fbm noise veins) is pre-baked to /textures/marble.webp —
   generating it in JS at runtime froze the page for up to seconds on slower devices. */
export const MARBLE_URL = '/textures/marble.webp'

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

// `marble` is the loaded marble texture (or null on failure → plain marble colour)
export function buildColumn(marble = null) {
  const stone = new THREE.MeshStandardMaterial({
    map: marble,
    color: marble ? '#ffffff' : '#e7efe3',
    roughness: 0.3,
    metalness: 0,
  })
  const bronze = new THREE.MeshStandardMaterial({
    color: '#1d4a2a',
    metalness: 0.75,
    roughness: 0.28,
    emissive: '#2f6a12',
    emissiveIntensity: 0.25,
  })

  const steps = mergeGeometries([
    flat(new RoundedBoxGeometry(1.6, 0.14, 1.6, 3, 0.025).translate(0, 0.07, 0)),
    flat(new RoundedBoxGeometry(1.38, 0.12, 1.38, 3, 0.02).translate(0, 0.2, 0)),
  ])
  const body = mergeGeometries([steps, flat(atticBase(0.26)), flat(flutedShaft(0.7, 3.0, 0.44, 0.38)), ionicCapital(3.7)])

  const group = new THREE.Group()
  const column = new THREE.Mesh(body, stone)
  const bowl = new THREE.Mesh(brazier(4.07), bronze)
  group.add(column, bowl)
  group.userData.dispose = () => {
    body.dispose()
    bowl.geometry.dispose()
    stone.dispose()
    bronze.dispose()
  }
  return group
}
