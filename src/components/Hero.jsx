// Soft flowing lines, inspired by the brand moodboard.
function Waves() {
  const lines = Array.from({ length: 14 }, (_, i) => i)
  return (
    <svg className="hero__waves" viewBox="0 0 1440 500" preserveAspectRatio="none" aria-hidden="true">
      {lines.map((i) => (
        <path
          key={`t${i}`}
          d={`M0 ${360 + i * 6} C 360 ${250 + i * 8}, 720 ${470 - i * 4}, 1440 ${170 + i * 9}`}
          fill="none"
          stroke="#20A69A"
          strokeOpacity={0.08 + i * 0.012}
          strokeWidth="1"
        />
      ))}
      {lines.map((i) => (
        <path
          key={`n${i}`}
          d={`M0 ${420 - i * 5} C 420 ${330 + i * 6}, 900 ${500 - i * 7}, 1440 ${300 + i * 5}`}
          fill="none"
          stroke="#142D3A"
          strokeOpacity={0.04 + i * 0.008}
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}

// Abstract composition of soft geometric forms (placeholder for 3D render).
function HeroArt() {
  return (
    <svg className="hero__art" viewBox="0 0 520 480" role="img" aria-label="Abstract geometric shapes">
      <defs>
        <radialGradient id="gSphere" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3b5b6b" />
          <stop offset="100%" stopColor="#142D3A" />
        </radialGradient>
        <radialGradient id="gMint" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bcdcd5" />
        </radialGradient>
        <linearGradient id="gTube" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9f3f0" />
          <stop offset="100%" stopColor="#b6d6cf" />
        </linearGradient>
        <linearGradient id="gTeal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3cc2b5" />
          <stop offset="100%" stopColor="#1a8b81" />
        </linearGradient>
        <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#dcebe7" stopOpacity="0.35" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>

      {/* navy sphere */}
      <g className="float">
        <circle cx="120" cy="80" r="62" fill="url(#gSphere)" />
      </g>

      {/* teal cylinder top-right */}
      <g className="float float--b">
        <rect x="330" y="20" width="80" height="90" rx="10" fill="url(#gTeal)" />
        <ellipse cx="370" cy="20" rx="40" ry="10" fill="#4fd1c4" />
      </g>

      {/* mint tube with navy ring, left */}
      <g className="float float--c">
        <path d="M60 230 L250 160 L300 300 L110 370 Z" fill="url(#gTube)" />
        <ellipse cx="85" cy="300" rx="62" ry="72" transform="rotate(-20 85 300)" fill="#142D3A" />
        <ellipse cx="85" cy="300" rx="34" ry="42" transform="rotate(-20 85 300)" fill="#bcdcd5" />
      </g>

      {/* navy cylinder with teal face, right */}
      <g className="float">
        <path d="M250 170 L420 120 L450 260 L280 310 Z" fill="#142D3A" />
        <ellipse cx="435" cy="190" rx="62" ry="74" fill="#0f2430" />
        <ellipse cx="435" cy="190" rx="46" ry="56" fill="url(#gTeal)" />
      </g>

      {/* frosted glass panels */}
      <rect x="205" y="30" width="120" height="330" rx="22" fill="url(#gGlass)" stroke="#ffffff" strokeOpacity="0.9" />
      <rect x="140" y="100" width="150" height="130" rx="22" fill="url(#gGlass)" stroke="#ffffff" strokeOpacity="0.8" />
      <circle cx="270" cy="230" r="55" fill="#142D3A" opacity="0.45" filter="url(#blur)" />

      {/* mint sphere */}
      <g className="float float--b">
        <circle cx="250" cy="385" r="78" fill="url(#gMint)" />
      </g>

      {/* teardrop */}
      <g className="float float--c">
        <path d="M400 330 C 470 300, 500 360, 470 420 C 450 455, 410 440, 390 410 Z" fill="url(#gTube)" />
        <path d="M390 410 C 380 380, 390 350, 400 330 C 420 370, 430 410, 420 440 Z" fill="#142D3A" />
      </g>

      <line x1="325" y1="360" x2="395" y2="360" stroke="#142D3A" strokeWidth="2" />
    </svg>
  )
}

export default function Hero() {
  return (
    <section className="hero" id="top">
      <Waves />
      <div className="container hero__grid">
        <div className="reveal">
          <h1>Simplicity,<br />built for <em>scale.</em></h1>
          <p className="hero__lede">
            We are a team of six co-founders based in Tamil Nadu, engineering effortless
            digital products and robust system architectures.
          </p>
          <a href="#studio" className="btn btn--teal">
            See our work <span className="arrow">→</span>
          </a>
        </div>
        <HeroArt />
      </div>
    </section>
  )
}
