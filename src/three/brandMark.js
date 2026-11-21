import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { LOGO_PATHS } from '../brand/logo.js'

/*
  The Apheleia "A" as a real 3D object: the vector mark extruded with soft
  bevels, in glossy lime with a clearcoat so its edges catch the light.
  Returned centred on the origin, 1 unit tall.
*/
export function buildBrandMark() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${LOGO_PATHS.map((d) => `<path d="${d}"/>`).join('')}</svg>`
  const { paths } = new SVGLoader().parse(svg)
  const shapes = paths.flatMap((p) => SVGLoader.createShapes(p))

  // SVG is y-down; flip every curve point so the mark stands upright (Extrude fixes winding)
  const seen = new Set()
  const flip = (v) => {
    if (!v || seen.has(v)) return
    seen.add(v)
    v.y = -v.y
  }
  for (const shape of shapes) {
    for (const path of [shape, ...shape.holes]) {
      for (const c of path.curves) ['v0', 'v1', 'v2', 'v3'].forEach((k) => flip(c[k]))
    }
  }

  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth: 70,
    bevelEnabled: true,
    bevelThickness: 14,
    bevelSize: 9,
    bevelSegments: 6,
    curveSegments: 28,
  })
  geom.computeBoundingBox()
  const box = geom.boundingBox
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  geom.translate(-center.x, -center.y, -center.z)
  geom.scale(1 / size.y, 1 / size.y, 1 / size.y)
  geom.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    color: '#bcfa03',
    roughness: 0.14,
    metalness: 0.05,
    emissive: '#4f7a00',
    emissiveIntensity: 0.35,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.userData.dispose = () => {
    geom.dispose()
    mat.dispose()
  }
  return mesh
}
