import Silk from './Silk.jsx'
import { ArrowRight, Sparkle } from './Icons.jsx'
import './CTA.css'

export default function CTA({ onContact }) {
  return (
    <section className="section cta-wrap" id="contact">
      <Silk className="cta-wrap__silk" strands={28} />
      <div className="container">
        <div className="cta reveal">
          <Sparkle className="cta__star" />
          <h2 className="cta__title">
            Ready to create
            <br />
            something extraordinary?
          </h2>
          <div className="cta__side">
            <p>Let’s turn your ideas into impact.</p>
            <button type="button" className="btn btn--primary" onClick={() => onContact()}>
              Get in Touch <ArrowRight />
            </button>
          </div>
          <span className="cta__planet" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
