import CountUp from './CountUp.jsx'
import Words from './Words.jsx'
import { ArrowRight } from './Icons.jsx'
import './About.css'

const STATS = [
  { value: 6, pad: 2, label: 'Co-founders' },
  { value: 4, pad: 2, label: 'Core disciplines' },
  { value: 2026, from: 1990, label: 'Founded in Tamil Nadu' },
]

// The left column is a window: the background particle system assembles the
// Apheleia mark inside it (see PARTICLE_SECTIONS in three/StrandsBackground.jsx).
function Stage() {
  return (
    <div className="about__stage">
      <span className="micro about__stage-label">The mark</span>
      <span className="about__stage-corner about__stage-corner--tl" />
      <span className="about__stage-corner about__stage-corner--br" />
    </div>
  )
}

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container about__grid">
        <div className="about__visual reveal">
          <Stage />
        </div>

        <div className="about__copy glass reveal" style={{ '--d': '.1s' }}>
          <span className="pill">About Apheleia</span>
          <h2 className="h2">
            <Words>A creative studio</Words>
            <br />
            <Words start={3}>for what’s next.</Words>
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

        <dl className="stats glass reveal" style={{ '--d': '.2s' }}>
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <dt className="stat__label">{s.label}</dt>
              <dd className="stat__value">
                <CountUp value={s.value} from={s.from} pad={s.pad} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
