import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { drawing } from '../health.js'

/*
  Self-healing for a scene that should be on screen but has stopped drawing.
  Twice a second: if `shouldRun` (visible, warmed up, intro gone…) and the scene
  hasn't drawn for a second while the tab is visible, nudge its render loop; if
  ~5 s of nudging brings nothing back, ask <SceneGuard> to rebuild the canvas.

  Conservative on purpose: a check delayed by a busy main thread (a long first
  frame, a shader compile) doesn't count — that's slowness, not a stall.
*/
const CHECK = 500

export default function Watchdog({ name, shouldRun }) {
  const invalidate = useThree((s) => s.invalidate)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const want = useRef(shouldRun)
  want.current = shouldRun

  useEffect(() => {
    let stalled = 0
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const blocked = now - last > CHECK * 2.4
      last = now
      const should = typeof want.current === 'function' ? want.current() : want.current
      if (blocked || !should || document.hidden || drawing(name, 1000)) {
        stalled = 0
        return
      }
      stalled++
      if (stalled === 2) console.warn(`[scene:${name}] stalled, restarting its render loop`)
      if (stalled >= 2) {
        setFrameloop('always')
        invalidate()
      }
      if (stalled === 10) dispatchEvent(new CustomEvent('scene:lost', { detail: name })) // rebuild it
    }, CHECK)
    return () => clearInterval(id)
  }, [invalidate, setFrameloop, name])
  return null
}
