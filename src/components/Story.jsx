import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../theme.jsx'
import { rectOf, viewport } from '../layout.js'
import { useQuality } from '../perf.js'
import { afterIntroBeat, hold, release, splashActive } from '../splash.js'
import SceneGuard from './SceneGuard.jsx'
import { hasWebGL, whenIdle } from '../three/utils.js'
import { ArrowDown } from './Icons.jsx'
import './Story.css'

const StoryCanvas = lazy(() => import('../three/StoryCanvas.jsx'))

const STAGES = [
  {
    step: 'Discover',
    title: 'Every great product starts fluid.',
    body: 'We dig into your goals, users and constraints until the shape of the idea comes into focus.',
  },
  {
    step: 'Design',
    title: 'Then we give it structure.',
    body: 'Systems, flows and interfaces — laid out on a grid and designed for ease.',
  },
  {
    step: 'Develop',
    title: 'Every piece lands where it belongs.',
    body: 'Resilient code and clean architecture, assembled with precision.',
  },
  {
    step: 'Launch',
    title: 'Shipped. Measured. Improving.',
    body: 'We go live, watch what matters, and keep refining as you grow.',
  },
]
const DIM_LABELS = 6

// Pinned section: scroll position drives the 3D scene from idea → product.
const storyReady = () => release('story')

export default function Story() {
  const { theme } = useTheme()
  const section = useRef(null)
  const progress = useRef(0)
  const labels = useRef([])
  const [stage, setStage] = useState(0)
  const { features } = useQuality()
  const webgl = useMemo(hasWebGL, []) && features !== 'static'
  // build the story scene behind the intro (or at the first idle moment), never when it scrolls in
  if (webgl) hold('story')
  const [mount, setMount] = useState(false)
  useEffect(() => {
    let on = true
    if (webgl) (splashActive() ? afterIntroBeat() : whenIdle(1500)).then(() => on && setMount(true))
    return () => {
      on = false
    }
  }, [webgl])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = section.current
      if (!el) return
      const r = rectOf(el)
      const total = r.height - viewport.h
      const p = Math.min(1, Math.max(0, -r.top / total))
      // outside the pinned range p is clamped: skip the style writes entirely
      if (p === progress.current && el.style.getPropertyValue('--sp')) return
      progress.current = p
      el.style.setProperty('--sp', p.toFixed(4))
      el.style.setProperty('--gobo', Math.min(1, Math.max(0, (p - 0.3) / 0.2)).toFixed(3))
      setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const s = STAGES[stage]

  return (
    <section className="story" id="process" ref={section} aria-label="Our process">
      <div className="story__sticky">
        {webgl && mount && (
          <SceneGuard name="story">
          <Suspense fallback={null}>
            <StoryCanvas theme={theme} progress={progress} labels={labels} onReady={storyReady} />
          </Suspense>
          </SceneGuard>
        )}
        <div className="story__light" aria-hidden="true" />
        <div className="story__labels" aria-hidden="true">
          {Array.from({ length: DIM_LABELS }, (_, i) => (
            <span key={i} ref={(el) => (labels.current[i] = el)} />
          ))}
        </div>

        <div className="container story__overlay">
          <div className="story__card glass">
          <div className="story__copy" key={stage}>
            <p className="micro story__counter">
              00{stage + 1} — 004 <span>· {s.step}</span>
            </p>
            <h2 className="story__title">
              {s.title.split(' ').map((w, i) => (
                <span className="story__word" style={{ '--i': i }} key={i}>
                  {w}&nbsp;
                </span>
              ))}
            </h2>
            <p className="story__body">{s.body}</p>
          </div>
          </div>

          <div className="story__progress glass" aria-hidden="true">
            <span className="micro story__scroll">
              <ArrowDown /> Scroll
            </span>
            <ol>
              {STAGES.map((x, i) => (
                <li key={x.step} className={i === stage ? 'is-active' : i < stage ? 'is-done' : ''} style={{ '--k': i }}>
                  <span className="micro">{x.step}</span>
                  <i />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Static, screen-reader friendly version of the steps */}
      <ol className="visually-hidden">
        {STAGES.map((x) => (
          <li key={x.step}>
            {x.step}: {x.title} {x.body}
          </li>
        ))}
      </ol>
    </section>
  )
}
