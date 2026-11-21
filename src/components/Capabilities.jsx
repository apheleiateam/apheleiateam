const icon = {
  design: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M21 3 3 10.5l7.5 3L14 21l7-18Z" />
      <path d="M10.5 13.5 21 3" />
    </svg>
  ),
  engineering: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M6 7.2v9.6M18 16.8V12a4 4 0 0 0-4-4h-3" />
      <path d="m12.5 5.5-2.5 2.5 2.5 2.5" />
    </svg>
  ),
  brand: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(45 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-45 12 12)" />
    </svg>
  ),
}

const items = [
  { key: 'design', title: 'Product design', body: 'UI/UX, prototyping, and systems designed for ease.' },
  { key: 'engineering', title: 'Software engineering', body: 'Resilient codebases, robust backends, and secure architecture.' },
  { key: 'brand', title: 'Brand & strategy', body: 'Positioning, voice, and visual identity grounded in purpose.' },
]

export default function Capabilities() {
  return (
    <section className="section section--white" id="capabilities">
      <div className="container">
        <h2 className="section-title reveal"><span>03</span> / Capabilities</h2>
        <div className="cards">
          {items.map((it) => (
            <article className="card reveal" key={it.key}>
              <div className="card__head">
                <h3>{it.title}</h3>
                <span className="card__icon">{icon[it.key]}</span>
              </div>
              <p>{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
