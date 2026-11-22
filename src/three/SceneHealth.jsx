import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { beat, health } from '../health.js'

/*
  Put inside each <Canvas>. Marks the scene alive, records a heartbeat per drawn
  frame (unless the scene records its own, `beat={false}`), and reports a lost
  WebGL context so <SceneGuard> can rebuild the scene instead of leaving it blank.
*/
export default function SceneHealth({ name, beat: auto = true }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const h = health[name]
    h.alive = true
    const lost = (e) => {
      e.preventDefault()
      h.alive = false
      dispatchEvent(new CustomEvent('scene:lost', { detail: name }))
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => {
      // removed BEFORE the canvas disposes its context, so a normal unmount isn't "lost"
      gl.domElement.removeEventListener('webglcontextlost', lost)
      h.alive = false
    }
  }, [gl, name])
  useFrame(() => {
    if (auto) beat(name)
  })
  return null
}
