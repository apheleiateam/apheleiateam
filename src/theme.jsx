import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// Light / dark theme. index.html sets data-theme before first paint (no flash);
// this keeps React in sync, follows the OS until the visitor picks, and remembers the choice.

const KEY = 'apheleia-theme'
const META = { dark: '#030503', light: '#eef2ec' }
const ThemeContext = createContext({ theme: 'dark', toggle: () => {} })

const stored = () => {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}
const system = () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
const initial = () => {
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : stored() || system()
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
  }, [theme])

  // Follow OS changes until the visitor chooses explicitly.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!mq) return
    const onChange = (e) => !stored() && setTheme(e.matches ? 'light' : 'dark')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // toggle(origin?) — with an origin {x, y} the new theme spreads from that point
  // in a circle (View Transitions API); otherwise it simply switches.
  const toggle = useCallback(
    (origin) => {
      const next = theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {}
      const apply = () => {
        document.documentElement.dataset.theme = next
        flushSync(() => setTheme(next))
      }
      // a theme switch is a one-off burst of work: don't let it count as a slow device
      window.dispatchEvent(new Event('perf:busy'))
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (!origin || calm || !document.startViewTransition) return apply()
      const root = document.documentElement
      const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
      root.style.setProperty('--vt-x', `${origin.x}px`)
      root.style.setProperty('--vt-y', `${origin.y}px`)
      root.style.setProperty('--vt-r', `${r}px`)
      const vt = document.startViewTransition(async () => {
        apply()
        // give the WebGL scenes a couple of frames to repaint in the new palette (never wait long)
        await Promise.race([
          new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))),
          new Promise((res) => setTimeout(res, 150)),
        ])
      })
      // a skipped/aborted transition is harmless — the theme has already switched
      vt.ready.catch(() => {})
      vt.finished.catch(() => {})
    },
    [theme],
  )

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
