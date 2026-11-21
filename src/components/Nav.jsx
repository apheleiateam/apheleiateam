import { useState } from 'react'

const links = [
  { href: '#story', label: 'story' },
  { href: '#capabilities', label: 'capabilities' },
  { href: '#studio', label: 'studio' },
  { href: '#enquire', label: 'enquire' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="nav">
      <div className="container nav__inner">
        <a href="#top" className="nav__logo" onClick={close}>APHELEIA</a>

        <button
          className="nav__toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <ul className={`nav__links ${open ? 'is-open' : ''}`}>
          {links.map((l) => (
            <li key={l.href}><a href={l.href} onClick={close}>{l.label}</a></li>
          ))}
          <li><a href="#enquire" className="btn btn--light" onClick={close}>partner with us</a></li>
        </ul>
      </div>
    </header>
  )
}
