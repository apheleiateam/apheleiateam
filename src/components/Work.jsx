import { useEffect, useRef, useState } from 'react'
import Words from './Words.jsx'
import { tilt } from '../hooks/interactions.js'
import { ArrowLeft, ArrowRight, ArrowUpRight, SPARKLE } from './Icons.jsx'
import './Work.css'

/* ---------- placeholder artwork — swap for real screenshots later ---------- */

function KurinjiArt() {
  return (
    <svg viewBox="0 0 300 345" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="k-glow">
          <stop offset="0" className="sc-accent" stopOpacity=".55" />
          <stop offset="1" className="sc-accent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="k-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="sc-bright" />
          <stop offset="1" className="sc-accent" />
        </linearGradient>
        <linearGradient id="k-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-bright" stopOpacity=".35" />
          <stop offset="1" className="sc-bright" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="300" height="345" className="f-raised" />
      <circle cx="160" cy="140" r="160" fill="url(#k-glow)" />
      <g transform="translate(0 -20)">
        {/* back phone */}
        <g transform="rotate(10 205 165)">
          <rect x="150" y="50" width="104" height="212" rx="20" className="f-bg s-soft" strokeOpacity=".25" />
          <rect x="156" y="56" width="92" height="200" rx="15" className="f-navy" />
          <rect x="166" y="78" width="72" height="44" rx="8" fill="url(#k-card)" />
          <rect x="174" y="108" width="30" height="4" rx="2" fill="#fff" opacity=".7" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={166 + (i % 2) * 38} y={134 + Math.floor(i / 2) * 38} width="34" height="32" rx="7" fill="#fff" opacity=".06" />
          ))}
          <rect x="166" y="214" width="72" height="22" rx="11" className="f-accent" />
        </g>
        {/* front phone */}
        <g transform="rotate(-12 110 190)">
          <rect x="56" y="80" width="108" height="220" rx="21" className="f-bg s-soft" strokeOpacity=".3" />
          <rect x="62" y="86" width="96" height="208" rx="16" className="f-navy" />
          <rect x="96" y="92" width="28" height="6" rx="3" className="f-bg" />
          <rect x="72" y="112" width="38" height="4" rx="2" fill="#fff" opacity=".45" />
          <rect x="72" y="122" width="62" height="11" rx="3" fill="#fff" opacity=".9" />
          <path d="M70 186L84 176 96 181 110 164 124 170 138 152 150 156V200H70Z" fill="url(#k-area)" />
          <polyline
            points="70,186 84,176 96,181 110,164 124,170 138,152 150,156"
            fill="none"
            className="s-bright"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="70" y={212 + i * 24} width="80" height="18" rx="6" fill="#fff" opacity=".05" />
              <circle cx="80" cy={221 + i * 24} r="4" className="f-accent" />
              <rect x="90" y={219 + i * 24} width="34" height="4" rx="2" fill="#fff" opacity=".4" />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}

const NODES = [[86, 118], [86, 176], [150, 102], [150, 146], [150, 190], [214, 120], [214, 172]]
const EDGES = [[0, 2], [0, 3], [1, 3], [1, 4], [2, 5], [3, 5], [3, 6], [4, 6]]
const HOT = new Set(['0-3', '3-5', '3-6'])

function EngineArt() {
  return (
    <svg viewBox="0 0 300 345" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="e-glow">
          <stop offset="0" className="sc-accent" stopOpacity=".5" />
          <stop offset="1" className="sc-accent" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="e-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-navy" />
          <stop offset="1" className="sc-bg" />
        </linearGradient>
        <filter id="e-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="300" height="345" className="f-raised" />
      <circle cx="150" cy="140" r="160" fill="url(#e-glow)" />

      <rect x="34" y="50" width="232" height="156" rx="10" className="f-bg s-soft" strokeOpacity=".3" />
      <rect x="42" y="58" width="216" height="140" rx="5" fill="url(#e-screen)" />
      {[52, 60, 68].map((x) => (
        <circle key={x} cx={x} cy="68" r="2.3" fill="#fff" opacity=".25" />
      ))}

      {EDGES.map(([a, b]) => {
        const hot = HOT.has(`${a}-${b}`)
        const [x1, y1] = NODES[a]
        const [x2, y2] = NODES[b]
        return (
          <g key={`${a}-${b}`}>
            {hot && <line x1={x1} y1={y1} x2={x2} y2={y2} className="s-bright" strokeWidth="4" opacity=".6" filter="url(#e-blur)" />}
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={hot ? 's-bright' : 's-soft'} strokeWidth="1.3" strokeOpacity={hot ? 1 : 0.25} />
          </g>
        )
      })}
      {NODES.map(([x, y], i) =>
        i === 3 ? (
          <g key={i}>
            <circle cx={x} cy={y} r="16" className="f-bright" opacity=".25" filter="url(#e-blur)" />
            <circle cx={x} cy={y} r="9" className="f-bright" />
          </g>
        ) : (
          <circle key={i} cx={x} cy={y} r="6" className="f-bg s-bright" strokeWidth="1.5" />
        ),
      )}

      <path d="M18 212H282L270 228H30Z" className="f-slate" />
      <rect x="128" y="212" width="44" height="4" rx="2" className="f-bg" opacity=".6" />
    </svg>
  )
}

function IdeaArt() {
  return (
    <svg viewBox="0 0 300 345" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="i-glow">
          <stop offset="0" className="sc-accent" stopOpacity=".6" />
          <stop offset="1" className="sc-accent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="345" className="f-raised" />
      <circle cx="150" cy="140" r="150" fill="url(#i-glow)" />
      {[36, 62, 90, 120, 152].map((r, i) => (
        <circle
          key={r}
          cx="150"
          cy="140"
          r={r}
          fill="none"
          className="s-soft"
          strokeOpacity={0.2 - i * 0.03}
          strokeDasharray={i % 2 ? '2 6' : undefined}
        />
      ))}
      <g transform="translate(120 110) scale(2.5)">
        <path d={SPARKLE} fill="url(#g-accent)" />
      </g>
      <g transform="translate(222 60) scale(.6)">
        <path className="twinkle f-soft" d={SPARKLE} />
      </g>
      <g transform="translate(64 196) scale(.45)">
        <path className="twinkle f-soft" d={SPARKLE} style={{ animationDelay: '1.6s' }} />
      </g>
    </svg>
  )
}

const PROJECTS = [
  { name: 'Kurinji', type: 'Mobile app · Digital product', Art: KurinjiArt },
  { name: 'Grounding Engine', type: 'Platform · System architecture', Art: EngineArt },
]

export default function Work({ onContact }) {
  const track = useRef(null)
  const [pos, setPos] = useState({ index: 0, start: true, end: false })
  const total = PROJECTS.length + 1

  const stepSize = () => {
    const t = track.current
    const gap = parseFloat(getComputedStyle(t).columnGap) || 0
    return t.firstElementChild.getBoundingClientRect().width + gap
  }

  const update = () => {
    const t = track.current
    if (!t) return
    const end = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4
    setPos({
      index: end ? total - 1 : Math.round(t.scrollLeft / stepSize()),
      start: t.scrollLeft < 4,
      end,
    })
  }

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = (dir) => track.current.scrollBy({ left: dir * stepSize(), behavior: 'smooth' })

  return (
    <section className="section work-section" id="work">
      <div className="container split">
        <div className="split__intro reveal">
          <span className="pill">Our Work</span>
          <h2 className="h2">
            <Words>Ideas we’ve brought to life.</Words>
          </h2>
          <p className="lead">A glimpse into what we’ve been building.</p>
          <button type="button" className="link-arrow" onClick={() => onContact()}>
            Start yours <ArrowRight />
          </button>
        </div>

        <div className="work reveal" style={{ '--d': '.1s' }}>
          <div className="work__track" ref={track} onScroll={update} data-end={pos.end}>
            {PROJECTS.map(({ name, type, Art }) => (
              <article className="project tilt" key={name} data-tilt="9" {...tilt}>
                <div className="project__art"><Art /></div>
                <span className="tilt__glare" aria-hidden="true" />
                <div className="project__meta">
                  <span>
                    <span className="project__name">{name}</span>
                    <span className="project__type">{type}</span>
                  </span>
                  <span className="round-btn" aria-hidden="true"><ArrowUpRight /></span>
                </div>
              </article>
            ))}
            <button type="button" className="project project--cta tilt" data-tilt="9" {...tilt} onClick={() => onContact()}>
              <span className="project__art"><IdeaArt /></span>
              <span className="tilt__glare" aria-hidden="true" />
              <span className="project__meta">
                <span>
                  <span className="project__name">Your idea</span>
                  <span className="project__type">Next up — let’s build it</span>
                </span>
                <span className="round-btn" aria-hidden="true"><ArrowUpRight /></span>
              </span>
            </button>
          </div>

          <div className="work__controls">
            <div className="work__arrows">
              <button type="button" className="round-btn" aria-label="Previous project" disabled={pos.start} onClick={() => go(-1)}>
                <ArrowLeft />
              </button>
              <button type="button" className="round-btn" aria-label="Next project" disabled={pos.end} onClick={() => go(1)}>
                <ArrowRight />
              </button>
            </div>
            <span className="work__count" aria-live="polite">
              {pos.index + 1} / {total}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
