import * as THREE from 'three'

/*
  Tiny bloom pipeline for the light strands.
  The strands are rendered into an HDR target, then blurred at 1/4, 1/8 and 1/16
  resolution (separable Gaussian, two passes per level). Compositing the sharp
  layer with the three blurred ones turns fine fibres into a glowing energy flow.
*/

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const blurFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv) * 0.2270270270;
    c += texture2D(uTex, vUv + uDir * 1.3846153846) * 0.3162162162;
    c += texture2D(uTex, vUv - uDir * 1.3846153846) * 0.3162162162;
    c += texture2D(uTex, vUv + uDir * 3.2307692308) * 0.0702702703;
    c += texture2D(uTex, vUv - uDir * 3.2307692308) * 0.0702702703;
    gl_FragColor = c;
  }
`

const compositeFrag = /* glsl */ `
  uniform sampler2D uSharp;
  uniform sampler2D uB1;
  uniform sampler2D uB2;
  uniform sampler2D uB3;
  uniform vec4 uW;
  uniform vec3 uBg;
  uniform float uAdditive;
  varying vec2 vUv;
  void main() {
    vec4 s = texture2D(uSharp, vUv) * uW.x + texture2D(uB1, vUv) * uW.y + texture2D(uB2, vUv) * uW.z + texture2D(uB3, vUv) * uW.w;
    vec3 col;
    if (uAdditive > 0.5) {
      vec3 e = s.rgb / (1.0 + s.rgb * 0.3);   // soft roll-off: overlaps go white-hot instead of clipping
      col = uBg + e;
    } else {
      float a = clamp(s.a, 0.0, 1.0);
      col = uBg * (1.0 - a) + min(s.rgb, vec3(1.0));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

const target = (opts) =>
  new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    ...opts,
  })

export function createBloom({ sharpScale = 0.75, levels = [4, 8, 16] } = {}) {
  const sharp = target()
  const chain = levels.map((div) => ({ div, a: target(), b: target(), w: 4, h: 4 }))

  const blurMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: quadVert,
    fragmentShader: blurFrag,
    depthTest: false,
    depthWrite: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat)
  quad.frustumCulled = false
  const blurScene = new THREE.Scene()
  blurScene.add(quad)
  const cam = new THREE.Camera()

  const setSize = (w, h) => {
    sharp.setSize(Math.max(4, Math.round(w * sharpScale)), Math.max(4, Math.round(h * sharpScale)))
    for (const L of chain) {
      L.w = Math.max(4, Math.round(w / L.div))
      L.h = Math.max(4, Math.round(h / L.div))
      L.a.setSize(L.w, L.h)
      L.b.setSize(L.w, L.h)
    }
  }

  const render = (gl, scene, sceneCam = cam) => {
    const prev = gl.getRenderTarget()
    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(sharp)
    gl.clear()
    gl.render(scene, sceneCam)
    let input = sharp.texture
    for (const L of chain) {
      for (let pass = 0; pass < 2; pass++) {
        blurMat.uniforms.uTex.value = input
        blurMat.uniforms.uDir.value.set(1 / L.w, 0)
        gl.setRenderTarget(L.a)
        gl.render(blurScene, cam)
        blurMat.uniforms.uTex.value = L.a.texture
        blurMat.uniforms.uDir.value.set(0, 1 / L.h)
        gl.setRenderTarget(L.b)
        gl.render(blurScene, cam)
        input = L.b.texture
      }
    }
    gl.setRenderTarget(prev)
  }

  const textures = { sharp: sharp.texture, b1: chain[0].b.texture, b2: chain[1].b.texture, b3: chain[2].b.texture }

  const dispose = () => {
    sharp.dispose()
    chain.forEach((L) => {
      L.a.dispose()
      L.b.dispose()
    })
    quad.geometry.dispose()
    blurMat.dispose()
  }

  return { setSize, render, textures, dispose }
}

// Full-screen pass that lays the bloomed strands over the page background colour.
export function createComposite(textures) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSharp: { value: textures.sharp },
      uB1: { value: textures.b1 },
      uB2: { value: textures.b2 },
      uB3: { value: textures.b3 },
      uW: { value: new THREE.Vector4(0.5, 0.6, 0.5, 0.35) },
      uBg: { value: new THREE.Color() },
      uAdditive: { value: 1 },
    },
    vertexShader: quadVert,
    fragmentShader: compositeFrag,
    depthTest: false,
    depthWrite: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  quad.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(quad)
  return { scene, cam: new THREE.Camera(), mat, dispose: () => (quad.geometry.dispose(), mat.dispose()) }
}
