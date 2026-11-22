import { EMAIL, INSTAGRAM, NAV_LINKS } from '../content.js'
import { Instagram } from './Icons.jsx'
import Logo from './Logo.jsx'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__panel glass">
        <div className="footer__row">
          <a href="#home" className="brand">
            <Logo className="brand__mark" />
            <span>Apheleia</span>
          </a>
          <nav aria-label="Footer">
            <ul className="footer__links">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="socials">
            <a className="socials__ig" href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" aria-label={`Apheleia on Instagram, ${INSTAGRAM.handle}`}>
              <Instagram />
              <span>{INSTAGRAM.handle}</span>
            </a>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Apheleia. All rights reserved.</span>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <span>Made with care in Tamil Nadu, India</span>
        </div>
        <div className="footer__mark" aria-hidden="true">Apheleia</div>
        </div>
      </div>
    </footer>
  )
}
