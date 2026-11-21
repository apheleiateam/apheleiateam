import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { dprFor, onQuality } from '../perf.js'

// Keeps a canvas's device-pixel-ratio in line with the quality manager (src/perf.js).
export default function AdaptiveDpr({ kind = 'scene' }) {
  const setDpr = useThree((s) => s.setDpr)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const apply = () => setDpr(dprFor(kind, size.width, size.height))
    apply()
    return onQuality(apply)
  }, [setDpr, size, kind])
  return null
}
