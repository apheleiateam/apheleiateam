import { useEffect, useState } from 'react'
import { rectOf, viewport } from '../layout.js'

// Returns the id of the section currently under the top third of the viewport.
export default function useScrollSpy(ids, offset = 0.35) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const line = viewport.h * offset
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && rectOf(el).top <= line) current = id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ids, offset])

  return active
}
