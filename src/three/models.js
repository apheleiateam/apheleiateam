import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

/*
  Helpers for the CC0 Quaternius models in /public/models (see CREDITS.md).
  Files are meshopt-compressed; three.js ships the decoder.
*/

let loader
const cache = new Map()
export function loadModel(url) {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url))
  return cache.get(url)
}

// Wraps `object` so it is centred on the origin and its largest side is `size`.
export function normalize(object, size = 1, { base = false } = {}) {
  const box = new THREE.Box3().setFromObject(object)
  const dims = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = size / Math.max(dims.x, dims.y, dims.z)
  object.scale.multiplyScalar(s)
  object.position.sub(center.multiplyScalar(s))
  if (base) object.position.y += (dims.y * s) / 2 // sit on y = 0 instead of centring
  const wrap = new THREE.Group()
  wrap.add(object)
  return wrap
}

const hsl = { h: 0, s: 0, l: 0 }
const tmp = new THREE.Color()

/*
  Re-colours a palette-swatch texture atlas into the brand's greens:
  warm hues → lime/yellow-green, cool hues → teal-green, greys → green-tinted greys.
  Strong reds/oranges also go into an emissive mask so they glow lime.
*/
export function brandAtlas(texture) {
  const img = texture.image
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height)
  const glow = g.createImageData(c.width, c.height)
  const px = data.data
  const memo = new Map() // rgb → [r, g, b, hot]: a swatch atlas has only a handful of colours
  for (let i = 0; i < px.length; i += 4) {
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]
    const hit = memo.get(key)
    if (hit) {
      px[i] = hit[0]
      px[i + 1] = hit[1]
      px[i + 2] = hit[2]
      glow.data[i] = hit[3] ? 188 : 0
      glow.data[i + 1] = hit[3] ? 250 : 0
      glow.data[i + 2] = hit[3] ? 3 : 0
      glow.data[i + 3] = 255
      continue
    }
    tmp.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, THREE.SRGBColorSpace)
    tmp.getHSL(hsl, THREE.SRGBColorSpace)
    const deg = hsl.h * 360
    const hot = hsl.s > 0.45 && hsl.l > 0.25 && (deg < 40 || deg > 330)
    if (hsl.s < 0.15) {
      tmp.setHSL(0.33, 0.12, hsl.l, THREE.SRGBColorSpace)
    } else if (deg < 75 || deg > 300) {
      tmp.setHSL((78 + (deg > 300 ? 0 : deg * 0.25)) / 360, Math.min(1, hsl.s * 1.05), Math.min(0.72, hsl.l * 1.1), THREE.SRGBColorSpace)
    } else {
      tmp.setHSL(0.42, hsl.s * 0.8, hsl.l, THREE.SRGBColorSpace)
    }
    const out = { r: 0, g: 0, b: 0 }
    tmp.getRGB(out, THREE.SRGBColorSpace)
    px[i] = out.r * 255
    px[i + 1] = out.g * 255
    px[i + 2] = out.b * 255
    memo.set(key, [px[i], px[i + 1], px[i + 2], hot])
    glow.data[i] = hot ? 188 : 0
    glow.data[i + 1] = hot ? 250 : 0
    glow.data[i + 2] = hot ? 3 : 0
    glow.data[i + 3] = 255
  }
  g.putImageData(data, 0, 0)
  const map = new THREE.CanvasTexture(c)
  const gc = document.createElement('canvas')
  gc.width = c.width
  gc.height = c.height
  gc.getContext('2d', { willReadFrequently: true }).putImageData(glow, 0, 0)
  const emissiveMap = new THREE.CanvasTexture(gc)
  for (const t of [map, emissiveMap]) {
    t.flipY = texture.flipY
    t.colorSpace = THREE.SRGBColorSpace
    t.magFilter = THREE.NearestFilter
    t.needsUpdate = true
  }
  return { map, emissiveMap }
}

// Swap materials by name for brand ones. `recipe` maps material name → params.
export function restyle(root, recipe, fallback) {
  const made = new Map()
  root.traverse((o) => {
    if (!o.isMesh) return
    const name = o.material.name
    const params = recipe[name] ?? fallback
    if (!params) return
    if (!made.has(name)) {
      const physical = 'clearcoat' in params || 'transmission' in params || 'sheen' in params
      const m = physical ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params)
      m.name = name
      made.set(name, m)
    }
    o.material = made.get(name)
  })
  return [...made.values()]
}

/* ---------- eternal flame: a billboard shader, rendered into the bloom pass ---------- */

const flameVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const flameFrag = /* glsl */ `
  uniform float uTime;
  uniform float uAlpha;
  uniform float uAdditive;
  uniform vec3 uOuter;
  uniform vec3 uMid;
  uniform vec3 uCore;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; } return v; }

  void main() {
    vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y);
    float n = fbm(vec2(p.x * 2.6, p.y * 3.2 - uTime * 2.4));
    float n2 = fbm(vec2(p.x * 5.0 + 3.0, p.y * 6.0 - uTime * 3.6));
    float x = p.x + (n - 0.5) * 0.55 * p.y + (n2 - 0.5) * 0.15 * p.y;
    float width = 0.62 * pow(max(1.0 - p.y, 0.0), 0.9) * smoothstep(0.0, 0.16, p.y);
    float body = smoothstep(width, width * 0.15, abs(x));
    body *= smoothstep(1.0, 0.55, p.y + (n - 0.5) * 0.4);
    float core = smoothstep(width * 0.45, 0.0, abs(x)) * smoothstep(0.75, 0.15, p.y);
    vec3 col = mix(uOuter, uMid, body);
    col = mix(col, uCore, core);
    float a = clamp(body * 0.9 + core, 0.0, 1.0) * uAlpha;
    float glow = exp(-dot(vec2(p.x, (p.y - 0.25) * 1.4), vec2(p.x, (p.y - 0.25) * 1.4)) * 4.0) * 0.25 * uAlpha;
    gl_FragColor = uAdditive > 0.5 ? vec4(col * (a * 1.6 + glow), a + glow) : vec4(col, min(1.0, a * 0.95));
    #include <colorspace_fragment>
  }
`

export function createFlame() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: flameVert,
    fragmentShader: flameFrag,
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uAdditive: { value: 1 },
      uOuter: { value: new THREE.Color('#0f6a26') },
      uMid: { value: new THREE.Color('#5fe04a') },
      uCore: { value: new THREE.Color('#f2ffc2') },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 20
  const setTheme = (additive) => {
    mat.uniforms.uAdditive.value = additive ? 1 : 0
    if (additive) {
      mat.blending = THREE.CustomBlending
      mat.blendSrc = THREE.OneFactor
      mat.blendDst = THREE.OneFactor
      mat.uniforms.uOuter.value.set('#0f6a26')
      mat.uniforms.uMid.value.set('#5fe04a')
      mat.uniforms.uCore.value.set('#f2ffc2')
    } else {
      mat.blending = THREE.NormalBlending
      mat.uniforms.uOuter.value.set('#2f9a3c')
      mat.uniforms.uMid.value.set('#46d35b')
      mat.uniforms.uCore.value.set('#bcfa03')
    }
    mat.needsUpdate = true
  }
  return { mesh, mat, setTheme }
}
