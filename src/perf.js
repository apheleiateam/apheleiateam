import { useEffect, useState } from 'react'
import { splashDone } from './splash.js'

/*
  Quality manager — keeps the page smooth on every device.

  1. A starting level is picked from device hints (cores, memory, GPU name,
     touch screen, data-saver). `?perf=high|low|static` forces one for testing.
  2. A frame-time monitor then watches real frames. When the page keeps missing
     its refresh rate it steps quality DOWN (never back up, so nothing flickers):

       level 0  high    full effects
       level 1  high    · lower render resolution
       level 2  low     · no glass refraction, lighter bloom, fewer particles,
                          no CSS backdrop blur
       level 3  low     · lower resolution again
       level 4  static  · no WebGL at all — plain HTML/CSS, like a static site

  `features` ('high' | 'low' | 'static') is mirrored on <html data-perf>, so CSS
  can drop expensive effects too.
*/

const FEATURES = ['high', 'high', 'low', 'low', 'static']
const DPR_SCALE = [1, 0.75, 1, 0.75, 0]

// Max device-pixel-ratio and pixel budget per canvas kind and feature tier.
// The background is all glow, so it tolerates (and hides) low resolution well.
const CAP = { bg: { high: 1.25, low: 1 }, scene: { high: 1.75, low: 1.25 } }
const BUDGET = { bg: { high: 2.4e6, low: 0.75e6 }, scene: { high: 3.4e6, low: 1.2e6 } }
const FLOOR = { bg: 0.5, scene: 0.75 }

let gpuName = ''
const forced = new URLSearchParams(location.search).get('perf')

// No throwaway WebGL context to sniff the GPU (creating one stalls the page while the
// GPU process starts up). Device hints pick the start level; the first real canvas
// then reports its GPU through noteRenderer().
function detect() {
  if (forced in { high: 1, low: 1, static: 1 }) return { high: 0, low: 2, static: 4 }[forced]
  if (!webglApi()) return 4
  const nav = navigator
  if (nav.connection?.saveData) return 4
  let weak = 0
  if ((nav.hardwareConcurrency || 8) <= 4) weak++
  if ((nav.deviceMemory || 8) <= 4) weak++
  // phones & tablets: high-DPR screens, small GPUs, batteries → start light
  if (matchMedia('(pointer: coarse)').matches) weak += 2
  return weak >= 2 ? 2 : 0
}

export const webglApi = () => typeof window !== 'undefined' && !!(window.WebGL2RenderingContext || window.WebGLRenderingContext)

const WEAK_GPU = /Mali-(4|T|G3|G5[12]|G57)|Adreno \(TM\) ([2-5]\d\d|6[0-1]\d)|PowerVR|Intel.*(HD Graphics|GMA)|Apple A(9|1[0-2])\b/i
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render|software/i

// Called with each canvas's real WebGL context; the first one refines the level.
export function noteRenderer(gl) {
  if (gpuName || forced) return
  try {
    const ctx = gl.getContext()
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    gpuName = String(ctx.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : ctx.RENDERER) || '?')
  } catch {
    gpuName = '?'
  }
  if (SOFTWARE_GPU.test(gpuName)) apply(4)
  else if (WEAK_GPU.test(gpuName) && state.level < 2) apply(2)
}

const state = { level: 0, features: 'high', dprScale: 1 }
const subs = new Set()

function apply(level) {
  state.level = level
  state.features = FEATURES[level]
  state.dprScale = DPR_SCALE[level]
  document.documentElement.dataset.perf = state.features
  subs.forEach((fn) => fn(state))
}

export const quality = state
export const gpu = () => gpuName

export function onQuality(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function stepDown(reason = '') {
  if (state.level >= 4) return
  // an already-light device skips straight past the resolution-only step
  apply(state.level === 0 && reason === 'severe' ? 2 : state.level + 1)
}

// Device-pixel-ratio for a canvas of `kind` ('bg' | 'scene') at the current level.
export function dprFor(kind, width = window.innerWidth, height = window.innerHeight) {
  const f = state.features === 'static' ? 'low' : state.features
  const device = Math.min(window.devicePixelRatio || 1, CAP[kind][f])
  const budget = Math.sqrt(BUDGET[kind][f] / Math.max(1, width * height))
  return Math.max(FLOOR[kind], Math.min(device, budget) * state.dprScale)
}

export function useQuality() {
  const [s, set] = useState(() => ({ ...state }))
  useEffect(() => onQuality((n) => set({ ...n })), [])
  return s
}

/* ---------- frame-time monitor ---------- */
let started = false
function monitor() {
  let last = 0
  let samples = []
  let best = 1000 / 60
  let strikes = 0
  let windowStart = performance.now()
  // ignore page-load work: judge only after the intro has gone (and a moment more)
  let settleUntil = Infinity
  splashDone.then(() => (settleUntil = performance.now() + 1200))
  // one-off bursts (theme switch) are not a verdict on the device
  addEventListener('perf:busy', () => {
    settleUntil = Math.max(settleUntil, performance.now() + 1800)
    samples = []
    strikes = 0
  })

  const evaluate = () => {
    const now = performance.now()
    const sorted = samples.sort((a, b) => a - b)
    samples = []
    best = Math.min(best, sorted[Math.floor(sorted.length * 0.1)]) // ≈ the display's refresh interval
    if (now < settleUntil || document.hidden) return
    // trimmed mean: one-off hiccups (a GC, a decode) shouldn't cost quality
    const kept = sorted.slice(0, Math.ceil(sorted.length * 0.94))
    const mean = kept.reduce((a, b) => a + b, 0) / kept.length
    const limit = Math.max(best * 1.3, 18.5)
    const severe = mean > Math.max(best * 2.4, 38) // below ~25 fps
    if (severe && state.level >= 2) {
      // already on the light tier and still struggling: the CPU is the limit, and
      // lower resolution won't help — go straight to plain HTML
      apply(4)
      return
    }
    if (mean > limit) strikes += severe ? 2 : 1
    else strikes = Math.max(0, strikes - 1)
    if (strikes >= 2) {
      stepDown(severe ? 'severe' : '')
      strikes = 0
      settleUntil = now + 2000 // give the new level time to take effect
    }
  }

  const frame = (ts) => {
    if (last) {
      const d = ts - last
      if (d < 250) samples.push(d) // gaps above that are tab switches, not jank
    }
    last = ts
    // judge in ~1 s windows (a slow device would otherwise take many seconds per window)
    if (samples.length >= 90 || (samples.length >= 12 && ts - windowStart > 1000)) {
      evaluate()
      windowStart = ts
    }
    if (state.level < 4) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

export function initQuality() {
  if (started) return state
  started = true
  apply(detect())
  // a level forced with ?perf= stays put (for testing); otherwise watch real frames
  if (state.level < 4 && !forced) monitor()
  return state
}

// Debug aid (?debug=progs): logs every shader program a canvas creates, with time and
// scroll position — any created mid-scroll is a stall to precompile.
export function debugPrograms(gl, label) {
  if (!/[?&]debug=progs/.test(location.search)) return
  const list = gl.info.programs
  const push = list.push
  list.push = function (...ps) {
    for (const p of ps) (window.__progLog ||= []).push({ label, name: p.name, t: Math.round(performance.now()), y: Math.round(scrollY) })
    return push.apply(this, ps)
  }
}
