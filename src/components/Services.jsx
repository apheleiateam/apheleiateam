import { ArrowRight, IconAutomation, IconCode, IconCompass, IconDesign, IconNodes } from './Icons.jsx'
import Words from './Words.jsx'
import { tilt } from '../hooks/interactions.js'
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
    Icon: IconAutomation,
    title: 'Automation',
    body: 'Workflows, integrations and AI agents that cut out repetitive work.',
    topic: 'Automation',
  },
  {
    Icon: IconCompass,
    title: 'Brand & Strategy',
    body: 'Positioning, voice and identity grounded in purpose.',
    topic: 'Brand & Strategy',
  },
]

export default function Services({ onContact }) {
  return (
    <section className="section" id="services">
      <div className="container split">
        <div className="split__intro reveal">
          <span className="pill">Our Services</span>
          <h2 className="h2">
            <Words>End-to-end solutions for your digital journey.</Words>
          </h2>
          <p className="lead">From strategy to scale, we’ve got you covered.</p>
          <button type="button" className="link-arrow" onClick={() => onContact()}>
            Discuss your project <ArrowRight />
          </button>
        </div>

        <div className="services">
          {SERVICES.map(({ Icon, title, body, topic }, i) => (
            <article
              key={title}
              className="service glass tilt reveal"
              style={{ '--d': `${0.08 * i}s` }}
              {...tilt}
            >
              <span className="tilt__glare" aria-hidden="true" />
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
