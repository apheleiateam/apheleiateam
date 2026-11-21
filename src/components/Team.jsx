import { useCallback, useEffect, useRef, useState } from 'react'
import { TEAM } from '../content.js'
import Words from './Words.jsx'
import { ArrowLeft, ArrowRight } from './Icons.jsx'
import './Team.css'

const N = TEAM.length
const STEP = 360 / N
const mod = (a, n) => ((a % n) + n) % n

/*
  The team on a 3D ring. It steps to the next person every few seconds, can be
  dragged or flicked (it snaps to the nearest card), and clicking a card brings
  it to the front. The particle universe draws a galaxy around this stage.
*/
export default function Team() {
  const stage = useRef(null)
  const ring = useRef(null)
  const cards = useRef([])
  const state = useRef({ spin: 0, target: 0, vel: 0, drag: null, hover: false, visible: false, lastStep: 0 })
  const [front, setFront] = useState(0)

  const goTo = useCallback((i) => {
    const s = state.current
    // shortest way round to card i
    const current = Math.round(-s.target / STEP)
    let delta = mod(i - current, N)
    if (delta > N / 2) delta -= N
    s.target -= delta * STEP
    s.lastStep = performance.now()
  }, [])

  useEffect(() => {
    const s = state.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    let shown = -1

    const layout = () => {
      const w = stage.current.offsetWidth
      const cw = Math.min(230, Math.max(150, w * 0.2))
      const radius = (cw / 2 / Math.tan(Math.PI / N)) * 1.22
      stage.current.style.setProperty('--cw', `${cw}px`)
      stage.current.style.setProperty('--r', `${radius}px`)
    }
    layout()
    window.addEventListener('resize', layout)

    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting
      if (s.visible) {
        last = performance.now()
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(tick)
      }
    })
    io.observe(stage.current)

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!s.drag) {
        if (!reduced && !s.hover && now - s.lastStep > 3600) {
          s.target -= STEP
          s.lastStep = now
        }
        // critically damped spring toward the target angle
        const k = 1 - Math.exp(-dt * 7)
        s.spin += (s.target - s.spin) * k
      }
      ring.current.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${s.spin}deg)`
      cards.current.forEach((el, i) => {
        if (!el) return
        const ang = ((i * STEP + s.spin) * Math.PI) / 180
        el.style.setProperty('--f', Math.max(0, Math.cos(ang)).toFixed(3))
      })
      const f = mod(Math.round(-s.spin / STEP), N)
      if (f !== shown) {
        shown = f
        setFront(f)
      }
      if (s.visible) raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', layout)
    }
  }, [])

  // drag / flick
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const s = state.current
    s.drag = { x: e.clientX, spin: s.spin, t: performance.now(), moved: 0, id: e.pointerId, captured: false }
    s.vel = 0
  }
  const onPointerMove = (e) => {
    const s = state.current
    if (!s.drag) return
    const now = performance.now()
    const dx = e.clientX - s.drag.x
    const next = s.drag.spin + dx * 0.32
    s.vel = (next - s.spin) / Math.max(1, now - s.drag.t)
    s.drag.t = now
    s.drag.moved = Math.max(s.drag.moved, Math.abs(dx))
    // capture only once it is really a drag, so plain clicks still reach the cards
    if (!s.drag.captured && s.drag.moved > 4) {
      e.currentTarget.setPointerCapture(s.drag.id)
      s.drag.captured = true
    }
    if (s.drag.captured) s.spin = next
  }
  const onPointerUp = () => {
    const s = state.current
    if (!s.drag) return
    const moved = s.drag.moved
    s.drag = null
    if (moved < 4) return // a click — handled by the card button
    s.target = Math.round((s.spin + s.vel * 220) / STEP) * STEP
    s.lastStep = performance.now()
  }

  const person = TEAM[front]

  return (
    <section className="section team" id="team">
      <div className="container">
        <div className="team__head reveal">
          <span className="pill">The team</span>
          <h2 className="h2">
            <Words>The people behind the mark.</Words>
          </h2>
          <p className="lead">Designers, engineers and strategists from Tamil Nadu — building Apheleia together.</p>
        </div>

        <div
          className="team__stage"
          ref={stage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerEnter={() => (state.current.hover = true)}
          onPointerLeave={() => (state.current.hover = false)}
        >
          <div className="team__ring" ref={ring}>
            {TEAM.map((m, i) => (
              <button
                key={m.email}
                type="button"
                className={`member${i === front ? ' is-front' : ''}`}
                style={{ '--a': `${i * STEP}deg` }}
                ref={(el) => (cards.current[i] = el)}
                onClick={() => goTo(i)}
                aria-label={`Show ${m.name}`}
                tabIndex={i === front ? 0 : -1}
              >
                <img src={m.photo} alt="" loading="lazy" draggable="false" />
                <span className="member__name">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="team__caption">
          <button type="button" className="round-btn" aria-label="Previous person" onClick={() => goTo(mod(front - 1, N))}>
            <ArrowLeft />
          </button>
          <div className="team__who" aria-live="polite" key={front}>
            <span className="micro team__count">
              {String(front + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
            </span>
            <h3 className="team__name">{person.name}</h3>
            <a className="team__email" href={`mailto:${person.email}`}>
              {person.email}
            </a>
          </div>
          <button type="button" className="round-btn" aria-label="Next person" onClick={() => goTo(mod(front + 1, N))}>
            <ArrowRight />
          </button>
        </div>

        <ul className="visually-hidden">
          {TEAM.map((m) => (
            <li key={m.email}>
              {m.name} — <a href={`mailto:${m.email}`}>{m.email}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
