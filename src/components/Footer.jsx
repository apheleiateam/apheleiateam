import { EMAIL, NAV_LINKS, SOCIALS } from '../content.js'
import { Instagram, LinkedIn, Sparkle, XLogo } from './Icons.jsx'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__panel glass">
        <div className="footer__row">
          <a href="#home" className="brand">
            <Sparkle />
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
            <a href={SOCIALS.linkedin} aria-label="Apheleia on LinkedIn"><LinkedIn /></a>
            <a href={SOCIALS.x} aria-label="Apheleia on X"><XLogo /></a>
            <a href={SOCIALS.instagram} aria-label="Apheleia on Instagram"><Instagram /></a>
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
