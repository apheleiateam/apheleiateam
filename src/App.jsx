import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useState } from 'react'
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
import { useQuality } from './perf.js'
import { restoreScroll } from './scrollRestore.js'
import { afterIntroBeat, hold, splashActive } from './splash.js'
import SceneGuard from './components/SceneGuard.jsx'
import { hasWebGL, whenIdle } from './three/utils.js'

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

// The living background. It alone reads the theme here, so a theme switch
// re-renders only the pieces that use it — not the whole page.
function Background() {
  const { theme } = useTheme()
  const webgl = useMemo(hasWebGL, [])
  const { features } = useQuality()
  const live = webgl && features !== 'static'
  if (live) hold('bg') // the intro stays up until the background has warmed up
  // behind the intro the background mounts at once; otherwise at the first idle moment
  const [bgReady, setBgReady] = useState(false)
  useEffect(() => {
    let on = true
    if (live) (splashActive() ? afterIntroBeat() : whenIdle(900)).then(() => on && setBgReady(true))
    return () => {
      on = false
    }
  }, [live])

  if (live)
    return (
      bgReady && (
        <SceneGuard name="bg">
          <Suspense fallback={null}>
            <StrandsBackground theme={theme} />
          </Suspense>
        </SceneGuard>
      )
    )
  return (
    <div className="ambient" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

// The page sections; memoised so opening the contact dialog doesn't re-render them.
const Sections = memo(function Sections({ onContact }) {
  return (
    <main>
      <Hero onContact={onContact} />
      <Story />
      <Marquee />
      <About />
      <Services onContact={onContact} />
      <Work onContact={onContact} />
      <Team />
      <Principles onContact={onContact} />
      <CTA onContact={onContact} />
    </main>
  )
})

export default function App() {
  const [contact, setContact] = useState({ open: false, topic: '', email: '' })

  // onContact() · onContact('UI/UX Design') to preselect an interest · onContact({ email }) to prefill
  const openContact = useCallback((arg) => {
    const o = typeof arg === 'string' ? { topic: arg } : arg && typeof arg === 'object' && !arg.nativeEvent ? arg : {}
    setContact({ open: true, topic: o.topic || '', email: o.email || '' })
  }, [])
  const closeContact = useCallback(() => setContact((c) => ({ ...c, open: false })), [])

  useEffect(restoreScroll, []) // after the first render: the page is tall enough now
  useReveal()
  useMagnetic()

  return (
    <>
      <SvgDefs />
      <Background />
      <Nav onContact={openContact} />
      <Sections onContact={openContact} />
      <Footer />
      <ContactDialog open={contact.open} topic={contact.topic} email={contact.email} onClose={closeContact} />
    </>
  )
}
