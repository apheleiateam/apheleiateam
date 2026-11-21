import { useEffect, useRef, useState } from 'react'

// Counts from `from` to `value` the first time it scrolls into view.
export default function CountUp({ value, from = 0, pad = 0, duration = 1600 }) {
  const ref = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduced ? value : from)

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / duration)
          const eased = 1 - (1 - k) ** 3
          setN(Math.round(from + (value - from) * eased))
          if (k < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, from, duration, reduced])

  return (
    <span ref={ref} aria-label={String(value).padStart(pad, '0')}>
      {String(n).padStart(pad, '0')}
    </span>
  )
}
