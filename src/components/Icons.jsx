// Inline icon set. Gradient icons use the shared #g-accent gradient (see App.jsx).

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
}
const grad = { ...stroke, stroke: 'url(#g-accent)' }
const solid = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true, focusable: 'false' }

export const SPARKLE =
  'M12 0C12.7 6.4 17.6 11.3 24 12C17.6 12.7 12.7 17.6 12 24C11.3 17.6 6.4 12.7 0 12C6.4 11.3 11.3 6.4 12 0Z'

export const Sparkle = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <path d={SPARKLE} fill="url(#g-accent)" />
  </svg>
)

export const ArrowRight = (p) => <svg {...stroke} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const ArrowLeft = (p) => <svg {...stroke} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
export const ArrowUpRight = (p) => <svg {...stroke} {...p}><path d="M7 17 17 7M8 7h9v9" /></svg>
export const ArrowDown = (p) => <svg {...stroke} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
export const Close = (p) => <svg {...stroke} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
export const Menu = (p) => <svg {...stroke} {...p}><path d="M4 8h16M4 16h16" /></svg>
export const Sun = (p) => (
  <svg {...stroke} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
)
export const Moon = (p) => (
  <svg {...stroke} {...p}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" /></svg>
)

export const SoundOn = (p) => (
  <svg {...stroke} {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path className="sound-wave sound-wave--1" d="M15.5 9.2a4 4 0 0 1 0 5.6" />
    <path className="sound-wave sound-wave--2" d="M18 6.8a7.5 7.5 0 0 1 0 10.4" />
  </svg>
)
export const SoundOff = (p) => (
  <svg {...stroke} {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
)

/* service + process icons (gradient stroke) */
export const IconDesign = (p) => (
  <svg {...grad} {...p}>
    <path d="M11 3l1.9 4.9L17.8 9.8l-4.9 1.9L11 16.6l-1.9-4.9L4.2 9.8l4.9-1.9z" />
    <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </svg>
)
export const IconCode = (p) => (
  <svg {...grad} {...p}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" /></svg>
)
export const IconNodes = (p) => (
  <svg {...grad} {...p}>
    <rect x="9" y="3" width="6" height="5" rx="1.3" />
    <rect x="3" y="16" width="6" height="5" rx="1.3" />
    <rect x="15" y="16" width="6" height="5" rx="1.3" />
    <path d="M12 8v6M6 16v-2h12v2" />
  </svg>
)
export const IconCompass = (p) => (
  <svg {...grad} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
)
export const IconAutomation = (p) => (
  <svg {...grad} {...p}>
    <path d="M19.6 13.5a8 8 0 0 1-13.9 3.4M4.4 10.5a8 8 0 0 1 13.9-3.4" />
    <path d="M18.6 3.6v3.8h-3.8M5.4 20.4v-3.8h3.8" />
    <path d="M12.8 8.4 10.6 12h3l-2.2 3.6" />
  </svg>
)
export const IconSearch = (p) => (
  <svg {...grad} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
)
export const IconPen = (p) => (
  <svg {...grad} {...p}><path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z" /><path d="M14 6l3 3" /></svg>
)
export const IconRocket = (p) => (
  <svg {...grad} {...p}>
    <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" />
    <path d="M9 15l-3-3c1.5-4 5-8.5 12-9-.5 7-5 10.5-9 12z" />
    <circle cx="14.5" cy="9.5" r="1.5" />
  </svg>
)

/* socials */
export const Instagram = (p) => (
  <svg {...stroke} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)
