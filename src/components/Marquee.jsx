import { useEffect, useRef } from 'react'
import { Sparkle } from './Icons.jsx'
import './Marquee.css'

const LIME = ['Ideas to impact', 'Product design', 'Engineering', 'System architecture', 'Brand & strategy', 'Simplicity at scale']
const GLASS = ['Discover', 'Design', 'Develop', 'Launch', 'Refine', 'Repeat']

function Group({ items, hidden }) {
  return (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <span key={t} className="marquee__item">
          {t}
          <Sparkle />
        </span>
      ))}
    </div>
  )
}

/*
  Two crossing bands that drift in opposite directions. Scrolling speeds them up
  and skews them a little, so the page feels like it has momentum.
*/
export default function Marquee() {
  const section = useRef(null)
  const rows = useRef([])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let visible = false
    let last = performance.now()
    let lastY = window.scrollY
    let vel = 0
    const x = [0, -200]

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      } else cancelAnimationFrame(raf)
    })
    io.observe(section.current)

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016
      last = now
      const y = window.scrollY
      vel += ((y - lastY) / dt - vel) * 0.12
      lastY = y
      const boost = Math.min(1400, Math.abs(vel)) * 0.45
      rows.current.forEach((row, i) => {
        if (!row) return
        const w = row.firstChild.offsetWidth
        const dir = i === 0 ? -1 : 1
        x[i] += dir * (55 + boost) * dt
        if (x[i] <= -w) x[i] += w
        if (x[i] > 0) x[i] -= w
        const skew = Math.max(-8, Math.min(8, vel * 0.006)) * (i === 0 ? 1 : -1)
        row.style.transform = `translate3d(${x[i]}px,0,0) skewX(${skew}deg)`
      })
      if (visible) raf = requestAnimationFrame(loop)
    }

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="marquee" ref={section} aria-label="What we do">
      <div className="marquee__band marquee__band--glass glass">
        <div className="marquee__row" ref={(el) => (rows.current[1] = el)}>
          <Group items={GLASS} />
          <Group items={GLASS} hidden />
        </div>
      </div>
      <div className="marquee__band marquee__band--lime">
        <div className="marquee__row" ref={(el) => (rows.current[0] = el)}>
          <Group items={LIME} />
          <Group items={LIME} hidden />
        </div>
      </div>
    </section>
  )
}
