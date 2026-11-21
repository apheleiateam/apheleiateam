import Silk from './Silk.jsx'
import { ArrowDown, ArrowRight, SPARKLE } from './Icons.jsx'
import './Hero.css'

const RING_BACK = 'M30 300A270 74 0 0 1 570 300'
const RING_FRONT = 'M30 300A270 74 0 0 0 570 300'
const RING2_BACK = 'M70 300A230 58 0 0 1 530 300'
const RING2_FRONT = 'M70 300A230 58 0 0 0 530 300'
const STRANDS = Array.from({ length: 30 }, (_, i) => i / 29)

function Star({ x, y, s = 1, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="twinkle f-soft" d={SPARKLE} style={{ animationDelay: `${delay}s` }} />
    </g>
  )
}

// Glowing orb with orbital rings and silk strands — placeholder for a 3D hero render.
function HeroOrb() {
  return (
    <svg className="orb" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <radialGradient id="orb-body" cx="34%" cy="28%" r="80%">
          <stop offset="0" className="sc-hi" />
          <stop offset=".42" className="sc-navy" />
          <stop offset="1" className="sc-bg" />
        </radialGradient>
        <radialGradient id="orb-rim" cx="40%" cy="38%" r="65%">
          <stop offset=".72" className="sc-bright" stopOpacity="0" />
          <stop offset=".96" className="sc-bright" stopOpacity=".55" />
          <stop offset="1" className="sc-soft" stopOpacity=".9" />
        </radialGradient>
        <linearGradient id="orb-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="sc-accent" stopOpacity="0" />
          <stop offset=".55" className="sc-bright" stopOpacity="1" />
          <stop offset="1" className="sc-soft" stopOpacity=".15" />
        </linearGradient>
        <linearGradient id="orb-strand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="sc-accent" stopOpacity="0" />
          <stop offset=".45" className="sc-bright" stopOpacity=".95" />
          <stop offset="1" className="sc-soft" stopOpacity="0" />
        </linearGradient>
        <filter id="orb-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
        <filter id="orb-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <clipPath id="orb-clip">
          <circle cx="300" cy="300" r="190" />
        </clipPath>
      </defs>

      <circle cx="320" cy="320" r="210" className="f-accent" opacity=".32" filter="url(#orb-blur)" />

      <g className="orb__float">
        <g transform="rotate(-18 300 300)" fill="none" stroke="url(#orb-ring)">
          <path d={RING_BACK} strokeWidth="1.4" opacity=".45" />
          <path d={RING2_BACK} strokeWidth="1" opacity=".25" />
        </g>

        <circle cx="300" cy="300" r="190" fill="url(#orb-body)" />
        <g clipPath="url(#orb-clip)" fill="none" className="s-soft" strokeOpacity=".07">
          {[0.18, 0.42, 0.66, 0.9].map((k) => (
            <ellipse key={`lat${k}`} cx="300" cy="300" rx="190" ry={190 * k} />
          ))}
          {[0.25, 0.55, 0.85].map((k) => (
            <ellipse key={`lon${k}`} cx="300" cy="300" rx={190 * k} ry="190" />
          ))}
        </g>
        <circle cx="300" cy="300" r="190" fill="url(#orb-rim)" />
        <ellipse cx="236" cy="206" rx="74" ry="38" fill="#fff" opacity=".1" transform="rotate(-35 236 206)" filter="url(#orb-soft)" />

        <g transform="rotate(-18 300 300)" fill="none" stroke="url(#orb-ring)">
          <path d={RING_FRONT} strokeWidth="2" />
          <path d={RING2_FRONT} strokeWidth="1" opacity=".5" />
          <circle cx="435" cy="364" r="5" className="f-bright" stroke="none" />
          <circle cx="435" cy="364" r="14" className="f-bright" stroke="none" opacity=".2" />
        </g>
      </g>

      <g className="orb__strands" fill="none" stroke="url(#orb-strand)">
        <path d="M-30 480C140 440 380 560 640 280" strokeWidth="46" strokeOpacity=".07" />
        {STRANDS.map((t, i) => (
          <path
            key={i}
            d={`M-30 ${500 - t * 60}C140 ${420 + t * 70} 380 ${590 - t * 110} 640 ${250 + t * 80}`}
            strokeWidth=".9"
            strokeOpacity={0.1 + 0.55 * Math.sin(Math.PI * t)}
          />
        ))}
      </g>

      <circle cx="104" cy="118" r="18" fill="url(#orb-body)" />
      <circle cx="104" cy="118" r="18" fill="url(#orb-rim)" />

      <Star x={500} y={58} s={1.15} />
      <Star x={60} y={300} s={0.6} delay={1.4} />
      <Star x={540} y={440} s={0.5} delay={2.6} />
    </svg>
  )
}

export default function Hero({ onContact }) {
  return (
    <section className="hero" id="home">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow hero__glow--a" />
        <div className="hero__glow hero__glow--b" />
        <div className="hero__lines" />
        <Silk className="hero__silk" />
      </div>

      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="pill reveal">Crafting digital simplicity</span>
          <h1 className="hero__title reveal" style={{ '--d': '.08s' }}>
            Ideas to
            <br />
            <span className="text-gradient">Impact.</span>
          </h1>
          <p className="hero__lede reveal" style={{ '--d': '.16s' }}>
            At Apheleia, we design and build digital products that feel effortless — simple on the
            surface, engineered to scale underneath.
          </p>
          <div className="hero__actions reveal" style={{ '--d': '.24s' }}>
            <button type="button" className="btn btn--primary" onClick={() => onContact()}>
              Start a Project <ArrowRight />
            </button>
            <a href="#about" className="story-link">
              <span className="story-link__icon"><ArrowDown /></span>
              Our Story
            </a>
          </div>
        </div>

        <div className="hero__visual reveal" style={{ '--d': '.2s' }}>
          <HeroOrb />
          <div className="stat-card glass">
            <div className="stat-card__value">06</div>
            <div className="stat-card__label">Co-founders,<br />one mission</div>
            <div className="avatars" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ '--i': i }} />
              ))}
            </div>
          </div>
          <div className="loc-chip glass">
            <span className="loc-chip__dot" />
            Tamil Nadu, India
          </div>
        </div>
      </div>

      <a href="#about" className="scroll-cue" aria-label="Scroll to explore">
        <span className="scroll-cue__mouse" />
        <span>Scroll<br />to explore</span>
      </a>
    </section>
  )
}
