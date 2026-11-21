import * as THREE from 'three'

/*
  "Flame field": an opaque backdrop shader — page background colour with a
  slowly churning green → lime → white-hot glow. It is opaque on purpose:
  three.js glass (transmission) only refracts opaque objects, so this is the
  light the glass cards and board bend.
*/

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uScale;
  uniform vec2 uCenter;
  uniform vec3 uBg;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform sampler2D uSharp;     // optional energy-flow layers (bloom.js), screen space
  uniform sampler2D uB1;
  uniform sampler2D uB2;
  uniform sampler2D uB3;
  uniform vec4 uW;
  uniform vec2 uRes;
  uniform float uStrandMix;
  uniform float uAdditive;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5 - uCenter) * uScale;
    float n = fbm(p * 1.3 + vec2(0.0, -uTime * 0.16));
    float n2 = fbm(p * 2.7 - vec2(uTime * 0.06, uTime * 0.1));
    float r = length(p);
    float g = smoothstep(1.0, 0.0, r + (n - 0.5) * 0.6 + (n2 - 0.5) * 0.25);
    g = pow(g, 1.35) * uIntensity;
    vec3 flame = mix(uA, uB, smoothstep(0.05, 0.55, g));
    flame = mix(flame, uC, smoothstep(0.62, 1.0, g) * 0.8);
    vec3 col = mix(uBg, flame, clamp(g * 1.15, 0.0, 1.0));
    if (uStrandMix > 0.0) {
      vec2 suv = gl_FragCoord.xy / uRes;
      vec4 st = (texture2D(uSharp, suv) * uW.x + texture2D(uB1, suv) * uW.y + texture2D(uB2, suv) * uW.z + texture2D(uB3, suv) * uW.w) * uStrandMix;
      if (uAdditive > 0.5) col += st.rgb / (1.0 + st.rgb * 0.3);
      else col = col * (1.0 - clamp(st.a, 0.0, 1.0)) + min(st.rgb, vec3(1.0));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function makeFlameMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uScale: { value: new THREE.Vector2(2.6, 2.6) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uBg: { value: new THREE.Color() },
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uC: { value: new THREE.Color() },
      uSharp: { value: null },
      uB1: { value: null },
      uB2: { value: null },
      uB3: { value: null },
      uW: { value: new THREE.Vector4(0.45, 0.7, 0.6, 0.45) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uStrandMix: { value: 0 },
      uAdditive: { value: 1 },
    },
  })
}

export function applyFlamePalette(mat, palette, intensity = palette.flame.intensity) {
  mat.uniforms.uBg.value.set(palette.bg)
  mat.uniforms.uA.value.set(palette.flame.a)
  mat.uniforms.uB.value.set(palette.flame.b)
  mat.uniforms.uC.value.set(palette.flame.c)
  mat.uniforms.uIntensity.value = intensity
}

// Glass for cards, board and cubes. Tint comes from material/instance colour.
export function makeGlass(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1,
    thickness: 0.35,
    roughness: 0.14,
    ior: 1.42,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.45,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
    ...opts,
  })
}
