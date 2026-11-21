import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../theme.jsx'
import { useQuality } from '../perf.js'
import { afterIntroBeat, hold, release } from '../splash.js'
import CanvasBoundary from './CanvasBoundary.jsx'
import { hasWebGL, seeded } from '../three/utils.js'
import { ArrowDown, ArrowRight } from './Icons.jsx'
import './Hero.css'

const RibbonCanvas = lazy(() => import('../three/RibbonCanvas.jsx'))
const LABELS = 22

const heroReady = () => release('hero')

export default function Hero({ onContact }) {
  const { theme } = useTheme()
  const labels = useRef([])
  const numbers = useMemo(() => {
    const rnd = seeded(2026)
    return Array.from({ length: LABELS }, () => String(Math.floor(100 + rnd() * 900)))
  }, [])
  const { features } = useQuality()
  const webgl = useMemo(hasWebGL, []) && features !== 'static'
  if (webgl) hold('hero')
  const [mount, setMount] = useState(false)
  useEffect(() => {
    let on = true
    if (webgl) afterIntroBeat().then(() => on && setMount(true))
    return () => {
      on = false
    }
  }, [webgl])

  return (
    <section className="hero" id="home">
      <div className="hero__stage" aria-hidden="true">
        {webgl && mount && (
          <CanvasBoundary>
            <Suspense fallback={null}>
              <RibbonCanvas theme={theme} labels={labels} labelCount={LABELS} onReady={heroReady} />
            </Suspense>
          </CanvasBoundary>
        )}
        <div className="hero__labels">
          {numbers.map((n, i) => (
            <span key={i} ref={(el) => (labels.current[i] = el)}>{n}</span>
          ))}
        </div>
      </div>

      <div className="container hero__top">
        <p className="micro hero__index reveal">001 — 004</p>
        <div className="hero__row">
          <h1 className="hero__title reveal" style={{ '--d': '.06s' }}>
            Ideas to <span className="text-gradient">Impact.</span>
          </h1>
          <div className="hero__aside glass reveal" style={{ '--d': '.14s' }}>
            <p>
              At Apheleia, we design and build digital products that feel effortless — simple on the
              surface, engineered to scale underneath.
            </p>
          </div>
        </div>
        <span className="pill reveal" style={{ '--d': '.2s' }}>Crafting digital simplicity</span>
      </div>

      <div className="container hero__bottom">
        <p className="hero__question glass reveal" style={{ '--d': '.3s' }}>
          Have an idea worth building? Let’s give it shape.
        </p>
        <button type="button" className="btn btn--primary reveal" style={{ '--d': '.36s' }} onClick={() => onContact()}>
          Start a Project <ArrowRight />
        </button>
      </div>

      <div className="container hero__foot">
        <a href="#process" className="micro hero__discover">
          <ArrowDown /> Discover more
        </a>
        <span className="micro hero__est">Tamil Nadu, India — Est. 2026</span>
      </div>
    </section>
  )
}
