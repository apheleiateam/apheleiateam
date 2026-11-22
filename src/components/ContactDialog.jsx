import { useEffect, useRef, useState } from 'react'
import { play } from '../sound.js'
import { EMAIL, INSTAGRAM, INTERESTS } from '../content.js'
import { ArrowRight, Close } from './Icons.jsx'
import './ContactDialog.css'

// "Start a project" modal. Submitting posts to /api/contact, which emails the team
// (see api/_lib/mail.js). If that can't be reached, the visitor's email app opens
// with the message pre-filled instead, so an enquiry is never lost.
const mailtoFor = (f, interest) => {
  const subject = `Project enquiry${interest ? ` (${interest})` : ''} from ${f.get('name')}`
  const body = `${f.get('details')}\n\nInterested in: ${interest || 'Not specified'}\n\n— ${f.get('name')} (${f.get('email')})`
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function ContactDialog({ open, topic, email, onClose }) {
  const ref = useRef(null)
  const openedAt = useRef(0)
  const [interest, setInterest] = useState('')
  // idle | sending | sent | fallback | busy | error
  const [status, setStatus] = useState('idle')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const d = ref.current
    if (open) {
      setInterest(topic || '')
      setStatus('idle')
      setFieldErrors({})
      openedAt.current = Date.now()
      if (!d.open) {
        d.showModal()
        play('open') // a splash as the dialog appears
      }
    } else if (d.open) {
      d.close()
      play('close')
    }
  }, [open, topic])

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    const form = e.currentTarget
    const f = new FormData(form)
    setStatus('sending')
    setFieldErrors({})
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'),
          email: f.get('email'),
          interest,
          details: f.get('details'),
          website: f.get('website'), // honeypot
          t: openedAt.current,
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (res.ok && out.ok) {
        setStatus('sent')
        play('open')
        form.reset()
        setInterest('')
        return
      }
      if (res.status === 422 && out.fields) {
        setFieldErrors(out.fields)
        setStatus('idle')
        return
      }
      if (res.status === 429) {
        setStatus('busy')
        return
      }
      throw new Error(out.error || `HTTP ${res.status}`)
    } catch {
      // service unreachable or not set up: hand the message to the visitor's email app
      setStatus('fallback')
      window.location.href = mailtoFor(f, interest)
    }
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
        <button type="button" data-sound="none" className="round-btn dialog__close" aria-label="Close" onClick={onClose}>
          <Close />
        </button>

        <span className="pill">Start a project</span>
        <h2 id="dialog-title">Let’s build something simple.</h2>
        <p className="dialog__sub">Tell us a little about your idea and we’ll get back to you.</p>

        <div className="field-row">
          <label className="field">
            <span>Name</span>
            <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Your name" aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <em className="field__error">{fieldErrors.name}</em>}
          </label>
          <label className="field">
            <span>Email</span>
            <input key={email || 'blank'} name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" defaultValue={email} aria-invalid={!!fieldErrors.email} />
            {fieldErrors.email && <em className="field__error">{fieldErrors.email}</em>}
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
          <textarea name="details" required minLength={10} maxLength={5000} placeholder="What are you building? Goals, timelines, anything helpful." aria-invalid={!!fieldErrors.details} />
          {fieldErrors.details && <em className="field__error">{fieldErrors.details}</em>}
        </label>

        {/* honeypot: hidden from people, irresistible to bots */}
        <input className="dialog__hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <button type="submit" data-sound="tap" className="btn btn--primary dialog__submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'} <ArrowRight />
        </button>
        <p className={`dialog__status dialog__status--${status}`} role="status" aria-live="polite">
          {status === 'sent' && 'Message sent — thank you! We’ll get back to you soon.'}
          {status === 'fallback' && 'Couldn’t reach our mail service, so we opened your email app with your message instead.'}
          {status === 'busy' && 'That’s a lot of messages in a short time — please try again in a few minutes, or email us directly.'}
        </p>
        <p className="dialog__note">
          Prefer email? Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · or DM{' '}
          <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer">{INSTAGRAM.handle}</a>
        </p>
      </form>
    </dialog>
  )
}
