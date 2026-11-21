import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Services from './components/Services.jsx'
import Work from './components/Work.jsx'
import Story from './components/Story.jsx'
import Principles from './components/Principles.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'
import ContactDialog from './components/ContactDialog.jsx'
import Marquee from './components/Marquee.jsx'
import Team from './components/Team.jsx'
import useReveal from './hooks/useReveal.js'
import { useMagnetic } from './hooks/interactions.js'
import { useTheme } from './theme.jsx'
import { hasWebGL } from './three/utils.js'

const StrandsBackground = lazy(() => import('./three/StrandsBackground.jsx'))

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
  const { theme } = useTheme()
  const webgl = useMemo(hasWebGL, [])
  const [contact, setContact] = useState({ open: false, topic: '', email: '' })

  // onContact() · onContact('UI/UX Design') to preselect an interest · onContact({ email }) to prefill
  const openContact = useCallback((arg) => {
    const o = typeof arg === 'string' ? { topic: arg } : arg && typeof arg === 'object' && !arg.nativeEvent ? arg : {}
    setContact({ open: true, topic: o.topic || '', email: o.email || '' })
  }, [])
  const closeContact = useCallback(() => setContact((c) => ({ ...c, open: false })), [])

  useReveal()
  useMagnetic()

  return (
    <>
      <SvgDefs />
      {webgl ? (
        <Suspense fallback={null}>
          <StrandsBackground theme={theme} />
        </Suspense>
      ) : (
        <div className="ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <Nav onContact={openContact} />
      <main>
        <Hero onContact={openContact} />
        <Story />
        <Marquee />
        <About />
        <Services onContact={openContact} />
        <Work onContact={openContact} />
        <Team />
        <Principles onContact={openContact} />
        <CTA onContact={openContact} />
      </main>
      <Footer />
      <ContactDialog open={contact.open} topic={contact.topic} email={contact.email} onClose={closeContact} />
    </>
  )
}
