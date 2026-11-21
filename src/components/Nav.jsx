import { useEffect, useState } from 'react'
import { NAV_LINKS } from '../content.js'
import useScrollSpy from '../hooks/useScrollSpy.js'
import { ArrowRight, Close, Menu } from './Icons.jsx'
import ThemeSwitch from './ThemeSwitch.jsx'
import Logo from './Logo.jsx'
import './Nav.css'

const IDS = NAV_LINKS.map((l) => l.id)

function Links({ active, onNavigate }) {
  return (
    <ul className="nav__links">
      {NAV_LINKS.map((l) => (
        <li key={l.id}>
          <a href={`#${l.id}`} aria-current={active === l.id ? 'true' : undefined} onClick={onNavigate}>
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function Nav({ onContact }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const active = useScrollSpy(IDS)
  const close = () => setOpen(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const talk = () => {
    close()
    onContact()
  }

  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}${open ? ' nav--open' : ''}`}>
      <div className="container">
        <div className="nav__bar glass">
        <a href="#home" className="brand nav__side" onClick={close}>
          <Logo className="brand__mark" />
          <span>Apheleia</span>
        </a>

        <nav className="nav__center" aria-label="Primary">
          <Links active={active} />
        </nav>

        <div className="nav__side nav__actions">
          <ThemeSwitch />
          <button type="button" className="btn btn--outline btn--sm nav__cta" onClick={talk}>
            [ Let’s Talk ]
          </button>
          <button
            type="button"
            className="nav__toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="nav-panel"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
        </div>

        <div className="nav__panel glass" id="nav-panel" hidden={!open}>
          <nav aria-label="Mobile">
            <Links active={active} onNavigate={close} />
          </nav>
          <button type="button" className="btn btn--primary btn--sm" onClick={talk}>
            Let’s Talk <ArrowRight />
          </button>
        </div>
      </div>
    </header>
  )
}
