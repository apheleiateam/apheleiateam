import { useEffect, useState } from 'react'
import { NAV_LINKS } from '../content.js'
import useScrollSpy from '../hooks/useScrollSpy.js'
import { ArrowRight, Close, Menu, Sparkle } from './Icons.jsx'
import './Nav.css'

const IDS = NAV_LINKS.map((l) => l.id)

export default function Nav({ onContact }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const active = useScrollSpy(IDS)

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

  const close = () => setOpen(false)

  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}${open ? ' nav--open' : ''}`}>
      <div className="container nav__inner">
        <a href="#home" className="brand" onClick={close}>
          <Sparkle />
          <span>Apheleia</span>
        </a>

        <div className="nav__menu" id="nav-menu">
          <nav aria-label="Primary">
            <ul className="nav__links">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} aria-current={active === l.id ? 'true' : undefined} onClick={close}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="btn btn--outline btn--sm nav__cta"
            onClick={() => {
              close()
              onContact()
            }}
          >
            Let’s Talk <ArrowRight />
          </button>
        </div>

        <button
          type="button"
          className="nav__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <Close /> : <Menu />}
        </button>
      </div>
    </header>
  )
}
