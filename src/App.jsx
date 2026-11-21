import { useCallback, useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Services from './components/Services.jsx'
import Work from './components/Work.jsx'
import Process from './components/Process.jsx'
import Principles from './components/Principles.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'
import ContactDialog from './components/ContactDialog.jsx'
import useReveal from './hooks/useReveal.js'

// Shared gradient used by icons and sparkles (userSpaceOnUse so it also works on straight lines).
function SvgDefs() {
  return (
    <svg className="svg-defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g-accent" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" className="sc-soft" />
          <stop offset=".5" className="sc-bright" />
          <stop offset="1" className="sc-accent" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function App() {
  const [contact, setContact] = useState({ open: false, topic: '' })

  // Components call onContact() or onContact('UI/UX Design') to preselect an interest.
  const openContact = useCallback(
    (topic) => setContact({ open: true, topic: typeof topic === 'string' ? topic : '' }),
    [],
  )
  const closeContact = useCallback(() => setContact((c) => ({ ...c, open: false })), [])

  useReveal()

  return (
    <>
      <SvgDefs />
      <Nav onContact={openContact} />
      <main>
        <Hero onContact={openContact} />
        <About />
        <Services onContact={openContact} />
        <Work onContact={openContact} />
        <Process onContact={openContact} />
        <Principles onContact={openContact} />
        <CTA onContact={openContact} />
      </main>
      <Footer />
      <ContactDialog open={contact.open} topic={contact.topic} onClose={closeContact} />
    </>
  )
}
