import { useEffect, useState } from 'react'
import { ArrowRight, Sparkle } from './Icons.jsx'
import './Principles.css'

const PRINCIPLES = [
  {
    quote: 'Simplicity isn’t the absence of features. It’s the absence of friction.',
    name: 'Principle 01',
    role: 'Design for ease',
  },
  {
    quote: 'We build systems that are calm to operate and a delight to use.',
    name: 'Principle 02',
    role: 'Engineer for scale',
  },
  {
    quote: 'Every pixel and every endpoint has to earn its place.',
    name: 'Principle 03',
    role: 'Ship with purpose',
  },
]

// TODO: confirm this matches the stack the team actually uses.
const TOOLKIT = ['React', 'Next.js', 'Node.js', 'Python', 'Figma', 'AWS']

export default function Principles({ onContact }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % PRINCIPLES.length), 6000)
    return () => clearInterval(t)
  }, [paused])

  const p = PRINCIPLES[i]

  return (
    <section className="section" id="principles">
      <div className="container principles">
        <div className="split__intro reveal">
          <span className="pill">Our Principles</span>
          <h2 className="h2">
            Simple by design.
            <br />
            Built to last.
          </h2>
          <p className="lead">The ideas we hold ourselves to on every project, big or small.</p>
          <button type="button" className="link-arrow" onClick={() => onContact()}>
            Work with us <ArrowRight />
          </button>
        </div>

        <div
          className="reveal"
          style={{ '--d': '.1s' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <figure className="quote glass">
            <span className="quote__mark" aria-hidden="true">“</span>
            <blockquote key={i} className="quote__text">{p.quote}</blockquote>
            <figcaption className="quote__by">
              <span className="quote__avatar"><Sparkle /></span>
              <span>
                <span className="quote__name">{p.name}</span>
                <span className="quote__role">{p.role}</span>
              </span>
            </figcaption>
          </figure>
          <div className="dots" role="tablist" aria-label="Principles">
            {PRINCIPLES.map((x, n) => (
              <button
                key={x.name}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={x.name}
                onClick={() => setI(n)}
              />
            ))}
          </div>
        </div>

        <div className="toolkit glass reveal" style={{ '--d': '.2s' }}>
          <p className="toolkit__label">Our toolkit</p>
          <ul>
            {TOOLKIT.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
