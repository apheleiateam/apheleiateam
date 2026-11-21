import { useState } from 'react'
import Words from './Words.jsx'
import { ArrowRight, Sparkle } from './Icons.jsx'
import './CTA.css'

// A bright "flame" card: leave an email here and the full contact form opens
// with it already filled in.
export default function CTA({ onContact }) {
  const [email, setEmail] = useState('')

  return (
    <section className="section cta-wrap" id="contact">
      <div className="container">
        <div className="cta reveal">
          <Sparkle className="cta__star" aria-hidden="true" />
          <div className="cta__copy">
            <p className="micro cta__kicker">Start here</p>
            <h2 className="cta__title">
              <Words>Ready to create something extraordinary?</Words>
            </h2>
            <p className="cta__sub">Leave your email and a line about the idea — we’ll take it from there.</p>
          </div>
          <form
            className="cta__form"
            onSubmit={(e) => {
              e.preventDefault()
              onContact({ email })
            }}
          >
            <label className="visually-hidden" htmlFor="cta-email">
              Your email
            </label>
            <input
              id="cta-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn cta__btn magnetic">
              Let’s talk <ArrowRight />
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
