import { ArrowRight, IconCode, IconPen, IconRocket, IconSearch } from './Icons.jsx'
import './Process.css'

const STEPS = [
  { Icon: IconSearch, title: 'Discover', body: 'Understand your goals, users and constraints.' },
  { Icon: IconPen, title: 'Design', body: 'Shape intuitive, beautiful solutions.' },
  { Icon: IconCode, title: 'Develop', body: 'Build with precision and scale in mind.' },
  { Icon: IconRocket, title: 'Launch', body: 'Go live, measure, and keep improving.' },
]

export default function Process({ onContact }) {
  return (
    <section className="section" id="process">
      <div className="container split">
        <div className="split__intro reveal">
          <span className="pill">Our Process</span>
          <h2 className="h2">
            A simple process.
            <br />
            A powerful outcome.
          </h2>
          <p className="lead">From first conversation to launch, we keep things clear and seamless.</p>
          <button type="button" className="link-arrow" onClick={() => onContact()}>
            Start a project <ArrowRight />
          </button>
        </div>

        <ol className="steps">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="step reveal" style={{ '--d': `${0.1 * i}s` }}>
              <span className="step__num">{i + 1}</span>
              <Icon className="step__icon" />
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
