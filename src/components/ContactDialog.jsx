import { useEffect, useRef, useState } from 'react'
import { EMAIL, INTERESTS } from '../content.js'
import { ArrowRight, Close } from './Icons.jsx'
import './ContactDialog.css'

// "Start a project" modal. No backend yet: submitting opens the visitor's
// email app with the message pre-filled.
export default function ContactDialog({ open, topic, onClose }) {
  const ref = useRef(null)
  const [interest, setInterest] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (open) {
      setInterest(topic || '')
      setSent(false)
      if (!d.open) d.showModal()
    } else if (d.open) {
      d.close()
    }
  }, [open, topic])

  const submit = (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const subject = `Project enquiry${interest ? ` (${interest})` : ''} from ${f.get('name')}`
    const body = `${f.get('details')}\n\nInterested in: ${interest || 'Not specified'}\n\n— ${f.get('name')} (${f.get('email')})`
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <form className="dialog__panel" onSubmit={submit}>
        <button type="button" className="round-btn dialog__close" aria-label="Close" onClick={onClose}>
          <Close />
        </button>

        <span className="pill">Start a project</span>
        <h2 id="dialog-title">Let’s build something simple.</h2>
        <p className="dialog__sub">Tell us a little about your idea and we’ll get back to you.</p>

        <div className="field-row">
          <label className="field">
            <span>Name</span>
            <input name="name" required autoComplete="name" placeholder="Your name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
          </label>
        </div>

        <fieldset className="chips">
          <legend>I’m interested in</legend>
          <div className="chips__list">
            {INTERESTS.map((x) => (
              <label className="chip" key={x}>
                <input type="radio" name="interest" value={x} checked={interest === x} onChange={() => setInterest(x)} />
                <span>{x}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Project details</span>
          <textarea name="details" required placeholder="What are you building? Goals, timelines, anything helpful." />
        </label>

        <button type="submit" className="btn btn--primary dialog__submit">
          Send message <ArrowRight />
        </button>
        {sent && (
          <p className="dialog__status" role="status">
            Opening your email app…
          </p>
        )}
        <p className="dialog__note">
          Prefer email? Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
      </form>
    </dialog>
  )
}
