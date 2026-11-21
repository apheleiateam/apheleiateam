import { useState } from 'react'

const EMAIL = 'hello@apheleia.com'

export default function Contact() {
  const [status, setStatus] = useState('')

  // No backend yet — opens the visitor's mail client with the form contents.
  const onSubmit = (e) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const subject = encodeURIComponent(`Project enquiry from ${data.get('name')}`)
    const body = encodeURIComponent(`${data.get('details')}\n\n— ${data.get('name')} (${data.get('email')})`)
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`
    setStatus('Opening your email app…')
  }

  return (
    <section className="section section--sage contact" id="enquire">
      <div className="container">
        <div className="contact__grid">
          <div className="reveal">
            <h2>05 / Let’s build.</h2>
            <a className="contact__email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <p>Based in Tamil Nadu, IN</p>
          </div>

          <form className="form reveal" onSubmit={onSubmit}>
            <div className="form__row">
              <input name="name" placeholder="your name" aria-label="Your name" required />
              <input name="email" type="email" placeholder="your email" aria-label="Your email" required />
            </div>
            <textarea name="details" placeholder="project details" aria-label="Project details" required />
            <button type="submit" className="btn btn--teal">Send message</button>
            {status && <p className="form__status" role="status">{status}</p>}
          </form>
        </div>

        <footer className="footer">
          <span>APHELEIA © {new Date().getFullYear()} / simple, purposeful.</span>
          <a href="#top">Back to top ↑</a>
        </footer>
      </div>
    </section>
  )
}
