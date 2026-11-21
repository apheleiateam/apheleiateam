// Stylised placeholder previews — replace with real screenshots later.
function MobilePreview() {
  return (
    <svg viewBox="0 0 640 360" aria-hidden="true">
      <rect width="640" height="360" fill="#DCEBE7" />
      {/* phone */}
      <rect x="90" y="30" width="130" height="300" rx="18" fill="#142D3A" />
      <rect x="98" y="40" width="114" height="280" rx="12" fill="#F5F7F4" />
      <rect x="98" y="40" width="114" height="90" rx="12" fill="#142D3A" />
      <rect x="110" y="70" width="70" height="8" rx="4" fill="#F5F7F4" />
      <rect x="110" y="86" width="50" height="5" rx="2.5" fill="#DCEBE7" opacity="0.7" />
      <rect x="110" y="104" width="40" height="12" rx="6" fill="#20A69A" />
      <rect x="108" y="142" width="44" height="52" rx="6" fill="#DCEBE7" />
      <rect x="158" y="142" width="44" height="52" rx="6" fill="#DCEBE7" />
      <rect x="108" y="206" width="94" height="60" rx="6" fill="#bcdcd5" />
      <rect x="108" y="278" width="94" height="8" rx="4" fill="#DCEBE7" />
      {/* second screen */}
      <rect x="236" y="40" width="110" height="280" rx="10" fill="#FFFFFF" stroke="#142D3A" strokeOpacity="0.15" />
      <rect x="236" y="40" width="110" height="80" rx="10" fill="#6f9a86" />
      <rect x="246" y="134" width="90" height="34" rx="6" fill="#F5F7F4" />
      <rect x="246" y="178" width="90" height="34" rx="6" fill="#F5F7F4" />
      <rect x="246" y="286" width="44" height="14" rx="7" fill="#142D3A" />
      {/* cards */}
      {[[362, 40], [490, 40], [362, 186], [490, 186]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="116" height="134" rx="8" fill="#F5F7F4" stroke="#142D3A" strokeOpacity="0.12" />
          <rect x={x + 12} y={y + 14} width="20" height="20" rx="5" fill="#DCEBE7" />
          <rect x={x + 12} y={y + 46} width="70" height="6" rx="3" fill="#263746" opacity="0.6" />
          <rect x={x + 12} y={y + 66} width="90" height="6" rx="3" fill="#DCEBE7" />
          <rect x={x + 12} y={y + 80} width="74" height="6" rx="3" fill="#DCEBE7" />
        </g>
      ))}
    </svg>
  )
}

function WebPreview() {
  return (
    <svg viewBox="0 0 640 360" aria-hidden="true">
      <rect width="640" height="360" fill="#c9dfd9" />
      <rect x="150" y="26" width="450" height="334" rx="10" fill="#DCEBE7" stroke="#142D3A" strokeOpacity="0.2" />
      <rect x="168" y="44" width="60" height="7" rx="3.5" fill="#142D3A" />
      {[300, 340, 380, 420].map((x) => (
        <rect key={x} x={x} y="45" width="28" height="5" rx="2.5" fill="#263746" opacity="0.5" />
      ))}
      <rect x="540" y="41" width="40" height="12" rx="3" fill="#142D3A" />
      <text x="190" y="130" fontFamily="Inter, sans-serif" fontSize="34" fontWeight="500" fill="#142D3A">Web platform</text>
      <rect x="190" y="146" width="220" height="6" rx="3" fill="#263746" opacity="0.35" />
      <rect x="190" y="160" width="180" height="6" rx="3" fill="#263746" opacity="0.35" />
      <rect x="190" y="180" width="60" height="16" rx="3" fill="#142D3A" />
      <rect x="190" y="226" width="180" height="134" rx="8" fill="#F5F7F4" opacity="0.7" />
      <rect x="390" y="226" width="180" height="134" rx="8" fill="#F5F7F4" opacity="0.7" />
      <circle cx="214" cy="252" r="10" fill="#DCEBE7" />
      <circle cx="414" cy="252" r="10" fill="#DCEBE7" />
      <rect x="204" y="276" width="100" height="6" rx="3" fill="#263746" opacity="0.5" />
      <rect x="404" y="276" width="90" height="6" rx="3" fill="#263746" opacity="0.5" />
    </svg>
  )
}

const projects = [
  { title: 'Project Kurinji', tag: 'digital product', Preview: MobilePreview },
  { title: 'The Grounding Engine', tag: 'system arch', Preview: WebPreview },
]

export default function Work() {
  return (
    <section className="section section--ivory" id="studio">
      <div className="container">
        <h2 className="section-title reveal"><span>04</span> / Selected studio artifacts</h2>
        <div className="work">
          {projects.map(({ title, tag, Preview }) => (
            <article className="project reveal" key={title}>
              <div className="project__preview"><Preview /></div>
              <div className="project__meta">
                <h3 className="project__title">{title}</h3>
                <span className="tag">{tag}</span>
                <a href="#enquire" className="project__link">View project <span aria-hidden="true">↗</span></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
