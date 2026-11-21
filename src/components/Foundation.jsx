// Placeholder names — swap in the real founders.
const founders = [
  { name: 'founder 01', hair: 'short' },
  { name: 'founder 02', hair: 'side' },
  { name: 'founder 03', hair: 'wavy' },
  { name: 'founder 04', hair: 'beard' },
  { name: 'founder 05', hair: 'long' },
  { name: 'founder 06', hair: 'curly' },
]

const hairPaths = {
  short: 'M30 38 C 30 18, 70 18, 70 38 C 66 30, 34 30, 30 38 Z',
  side: 'M30 40 C 28 16, 72 16, 70 36 C 60 26, 44 34, 30 40 Z',
  wavy: 'M29 40 C 26 20, 44 14, 52 18 C 62 12, 76 22, 71 40 C 66 30, 56 34, 50 28 C 44 34, 34 30, 29 40 Z',
  beard: 'M30 38 C 30 18, 70 18, 70 38 C 66 30, 34 30, 30 38 Z',
  long: 'M27 70 C 22 40, 28 16, 50 16 C 72 16, 78 40, 73 70 L 66 70 C 70 50, 66 34, 50 32 C 34 34, 30 50, 34 70 Z',
  curly: 'M29 40 C 22 30, 32 14, 42 18 C 46 10, 58 10, 60 18 C 72 14, 80 30, 71 40 C 66 32, 34 32, 29 40 Z',
}

function Avatar({ hair }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* shoulders */}
      <path d="M12 100 C 14 78, 32 70, 50 70 C 68 70, 86 78, 88 100 Z" fill="#142D3A" />
      {/* neck */}
      <rect x="43" y="58" width="14" height="14" fill="#F5F7F4" stroke="#142D3A" strokeWidth="2" />
      {/* head */}
      <ellipse cx="50" cy="42" rx="20" ry="23" fill="#F5F7F4" stroke="#142D3A" strokeWidth="2.5" />
      {hair === 'beard' && (
        <path d="M31 46 C 34 68, 66 68, 69 46 C 64 56, 36 56, 31 46 Z" fill="#142D3A" />
      )}
      <path d={hairPaths[hair]} fill="#142D3A" />
      {/* face */}
      <circle cx="43" cy="44" r="2" fill="#142D3A" />
      <circle cx="57" cy="44" r="2" fill="#142D3A" />
      <path d="M44 53 Q 50 57 56 53" fill="none" stroke={hair === 'beard' ? '#F5F7F4' : '#142D3A'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Foundation() {
  return (
    <section className="section section--sage foundation" id="story">
      <div className="container foundation__grid">
        <div className="reveal">
          <p className="eyebrow"><span>02</span> / The foundation</p>
          <h2>Six founders. One mission.</h2>
          <p>
            Founded in Tamil Nadu by six lifelong friends, Apheleia was born to dismantle
            digital clutter. We believe the best interfaces shouldn’t just look simple —
            they should feel simple.
          </p>
          <p>
            We combine precise engineering with natural, human-centred design to help
            companies find their footing in a complex digital world.
          </p>
        </div>

        <div className="founders reveal">
          {founders.map((f) => (
            <figure className="founder" key={f.name} style={{ margin: 0 }}>
              <div className="founder__frame"><Avatar hair={f.hair} /></div>
              <figcaption className="founder__name">{f.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
