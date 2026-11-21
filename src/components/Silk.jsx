import { useId } from 'react'

// Flowing bundle of fine lines — the "silk ribbon" motif from the moodboard.
export default function Silk({ className = '', strands = 34 }) {
  const id = 'silk' + useId().replace(/:/g, '')
  return (
    <svg className={`silk ${className}`} viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="sc-accent" stopOpacity="0" />
          <stop offset=".35" className="sc-bright" stopOpacity=".9" />
          <stop offset=".72" className="sc-accent" stopOpacity=".6" />
          <stop offset="1" className="sc-soft" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`}>
        <path d="M-60 300C320 230 860 340 1500 120" strokeWidth="70" strokeOpacity=".05" />
        {Array.from({ length: strands }, (_, i) => {
          const t = i / (strands - 1)
          return (
            <path
              key={i}
              d={`M-60 ${330 - t * 70}C320 ${150 + t * 170} 860 ${400 - t * 150} 1500 ${70 + t * 110}`}
              strokeWidth="1"
              strokeOpacity={0.08 + 0.42 * Math.sin(Math.PI * t)}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </g>
    </svg>
  )
}
