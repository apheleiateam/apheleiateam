import { useEffect, useState } from 'react'
import { useTheme } from '../theme.jsx'
import { Moon, Sun } from './Icons.jsx'
import './ThemeSwitch.css'

function Content() {
  return (
    <span className="tswitch__content">
      <span className="tswitch__label tswitch__label--light">Light</span>
      <span className="tswitch__label tswitch__label--dark">Dark</span>
      <Sun className="tswitch__icon tswitch__icon--sun" />
      <Moon className="tswitch__icon tswitch__icon--moon" />
    </span>
  )
}

/*
  Liquid-glass theme switch: a glass lens glides along the track, squashing as it
  moves, and magnifies whatever is underneath (a scaled copy of the track inside
  the lens). The new theme then spreads from the switch in a circle (theme.jsx).
*/
export default function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={`Switch to ${dark ? 'light' : 'dark'} theme`}
      className={`tswitch ${dark ? 'is-dark' : 'is-light'}${ready ? ' is-ready' : ''}`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }}
    >
      <span className="tswitch__track">
        <Content />
      </span>
      <span className="tswitch__lens" aria-hidden="true">
        <span className="tswitch__view">
          <Content />
        </span>
      </span>
    </button>
  )
}
