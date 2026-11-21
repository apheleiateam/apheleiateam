import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Light / dark theme. index.html sets data-theme before first paint (no flash);
// this keeps React in sync, follows the OS until the visitor picks, and remembers the choice.

const KEY = 'apheleia-theme'
const META = { dark: '#060d12', light: '#f5f7f4' }
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

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(KEY, next)
    } catch {}
    setTheme(next)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
