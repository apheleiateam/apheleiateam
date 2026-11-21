import { ArrowRight, IconCode, IconCompass, IconDesign, IconNodes } from './Icons.jsx'
import './Services.css'

const SERVICES = [
  {
    Icon: IconDesign,
    title: 'UI/UX Design',
    body: 'Intuitive interfaces and design systems that make complex things feel simple.',
    topic: 'UI/UX Design',
  },
  {
    Icon: IconCode,
    title: 'Web & App Development',
    body: 'Fast, scalable and secure products built on modern stacks.',
    topic: 'Development',
  },
  {
    Icon: IconNodes,
    title: 'System Architecture',
    body: 'Resilient backends, clean APIs and infrastructure that grows with you.',
    topic: 'System Architecture',
  },
  {
    Icon: IconCompass,
    title: 'Brand & Strategy',
    body: 'Positioning, voice and identity grounded in purpose.',
    topic: 'Brand & Strategy',
  },
]

// Moves the card's spotlight glow to follow the pointer.
const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export default function Services({ onContact }) {
  return (
    <section className="section" id="services">
      <div className="container split">
        <div className="split__intro reveal">
          <span className="pill">Our Services</span>
          <h2 className="h2">End-to-end solutions for your digital journey.</h2>
          <p className="lead">From strategy to scale, we’ve got you covered.</p>
          <button type="button" className="link-arrow" onClick={() => onContact()}>
            Discuss your project <ArrowRight />
          </button>
        </div>

        <div className="services">
          {SERVICES.map(({ Icon, title, body, topic }, i) => (
            <article
              key={title}
              className="service glass reveal"
              style={{ '--d': `${0.08 * i}s` }}
              onPointerMove={spotlight}
            >
              <span className="service__icon"><Icon /></span>
              <h3>{title}</h3>
              <p>{body}</p>
              <button type="button" className="link-arrow" onClick={() => onContact(topic)}>
                Learn More <ArrowRight />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
