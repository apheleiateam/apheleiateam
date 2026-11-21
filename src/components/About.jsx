import { ArrowRight } from './Icons.jsx'
import './About.css'

const STATS = [
  { value: '06', label: 'Co-founders' },
  { value: '04', label: 'Core disciplines' },
  { value: '2026', label: 'Founded in Tamil Nadu' },
]

const ARCH =
  'M0 356V170A170 170 0 0 1 170 0H290A170 170 0 0 1 460 170V356A24 24 0 0 1 436 380H24A24 24 0 0 1 0 356Z'
const STARS = [
  [48, 52, 1.3], [96, 96, 0.8], [150, 34, 1], [204, 78, 0.7], [252, 44, 1.1],
  [392, 64, 0.9], [420, 118, 0.7], [62, 150, 0.8], [132, 138, 0.6], [232, 124, 0.9],
]

// Night landscape framed in an arch — placeholder for brand photography.
function ArchScene() {
  return (
    <svg className="arch" viewBox="0 0 460 380" role="img" aria-label="Moonlit mountain lake framed by an arch">
      <defs>
        <clipPath id="arch-clip"><path d={ARCH} /></clipPath>
        <linearGradient id="arch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-bg" />
          <stop offset=".42" className="sc-navy" />
          <stop offset=".7" className="sc-accent" stopOpacity=".55" />
          <stop offset=".74" className="sc-navy" />
        </linearGradient>
        <radialGradient id="arch-moon">
          <stop offset="0" className="sc-bright" stopOpacity=".55" />
          <stop offset="1" className="sc-bright" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arch-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-navy" />
          <stop offset="1" className="sc-bg" />
        </linearGradient>
        <linearGradient id="arch-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="sc-soft" stopOpacity=".7" />
          <stop offset=".5" className="sc-accent" stopOpacity=".1" />
          <stop offset="1" className="sc-bright" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="arch-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".08" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g clipPath="url(#arch-clip)">
        <rect width="460" height="380" fill="url(#arch-sky)" />
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} className="f-soft" opacity=".7" />
        ))}
        <circle cx="318" cy="128" r="100" fill="url(#arch-moon)" />
        <circle cx="318" cy="128" r="30" className="f-soft" />
        <path
          className="f-slate"
          opacity=".95"
          d="M0 250C40 228 70 214 110 222S170 190 210 182 270 214 310 210 380 176 420 184 452 196 460 200V290H0Z"
        />
        <path
          className="f-navy"
          d="M0 262C60 240 100 250 150 236S230 248 290 244 390 226 460 236V290H0Z"
        />
        <rect y="270" width="460" height="110" fill="url(#arch-water)" />
        <rect y="269" width="460" height="1" className="f-bright" opacity=".35" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={318 - (60 - i * 6) / 2}
            y={282 + i * 10}
            width={60 - i * 6}
            height="2"
            rx="1"
            className="f-soft"
            opacity={0.55 - i * 0.06}
          />
        ))}
        <path className="f-bg" d="M0 332C90 314 170 338 250 328S400 332 460 324V380H0Z" />
        <rect width="460" height="380" fill="url(#arch-sheen)" />
      </g>
      <path d={ARCH} fill="none" stroke="url(#arch-stroke)" strokeWidth="1.5" />
    </svg>
  )
}

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container about__grid">
        <div className="about__visual reveal">
          <ArchScene />
        </div>

        <div className="about__copy reveal" style={{ '--d': '.1s' }}>
          <span className="pill">About Apheleia</span>
          <h2 className="h2">
            A creative studio
            <br />
            for what’s next.
          </h2>
          <p>
            Apheleia — <em>ἀφέλεια</em> — is the Greek spirit of simplicity. Founded by six friends in
            Tamil Nadu, we’re designers, engineers and strategists building digital products that feel
            effortless, and the systems that keep them that way at scale.
          </p>
          <a href="#services" className="link-arrow">
            Learn More <ArrowRight />
          </a>
        </div>

        <dl className="stats reveal" style={{ '--d': '.2s' }}>
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <dt className="stat__label">{s.label}</dt>
              <dd className="stat__value">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
