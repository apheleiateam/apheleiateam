import { useEffect, useState } from 'react'
import { webglApi } from '../perf.js'

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const range = (p, a, b) => clamp01((p - a) / (b - a))
export const smooth = (p, a, b) => {
  const t = range(p, a, b)
  return t * t * (3 - 2 * t)
}
export const easeOutCubic = (t) => 1 - (1 - t) ** 3
export const easeOutBack = (t) => {
  const c1 = 1.5
  const c3 = c1 + 1
  return t <= 0 ? 0 : 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

// Small seeded PRNG so "random" layouts are stable between renders.
export const seeded = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// WebGL API present (an actual context failing is caught by the canvas error boundary)
export const hasWebGL = webglApi

export function useInView(ref, rootMargin = '150px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return setInView(true)
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = (e) => setReduced(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

// Resolves when the browser is idle (or after `timeout` ms at the latest).
export const whenIdle = (timeout = 1500) =>
  new Promise((resolve) => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout })
    else setTimeout(resolve, 60)
  })
