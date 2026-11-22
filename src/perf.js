import { useEffect, useState } from 'react'
import { splashDone } from './splash.js'

/*
  Quality: WHAT each device draws, and HOW SHARP.

  The trade-off, and the rule that comes out of it
  ------------------------------------------------
  lever                  saves                 visible?               safe to change mid-visit?
  render resolution      GPU fill (biggest)    barely (glowing art)   yes: cheap, reversible
  bloom blur passes      GPU                   subtle                 —  (fixed per tier)
  particle count         GPU                   yes                    no
  glass refraction       a 2nd scene render    yes, look changes      no: shader recompile stall
  CSS backdrop blur      compositor            yes                    no
  dropping the 3D        everything            CONTENT DISAPPEARS     never

  An earlier version stepped down through ALL of these while you browsed, judged
  by frame times. Any busy moment, or Chrome's 30 fps battery-saver cap, read as
  "slow device" and the particles / hero animation switched off. So now:

  1. WHAT is drawn (`features`) is chosen once, from what the device can do, and
     frozen when the intro lifts. It never changes in front of the visitor.
       high    desktop / laptop GPUs: everything
       low     phones, tablets, low-memory devices, known-weak GPUs: glass without
               refraction, lighter bloom, 70% particles, no CSS backdrop blur
       static  no WebGL, Data Saver, or a software renderer: plain HTML/CSS
  2. Only HOW SHARP (render resolution, 100% → 85% → 70%) adapts while browsing,
     and it steps back up once frames are smooth again.
  3. "Janky" means frames arriving late compared with the browser's own cadence,
     so a 30 fps cap (battery saver) or a 120 Hz screen is not mistaken for jank.

  `?perf=high|low|static` forces a tier (and disables adaptation) for testing.
  `features` is mirrored on <html data-perf> so CSS can match.
*/

const forced = new URLSearchParams(location.search).get('perf')
const SCALES = [1, 0.85, 0.7]

// Max device-pixel-ratio and pixel budget per canvas kind and feature tier.
// The background is all glow, so it tolerates (and hides) low resolution well.
const CAP = { bg: { high: 1.25, low: 1 }, scene: { high: 1.75, low: 1.25 } }
const BUDGET = { bg: { high: 2.4e6, low: 0.75e6 }, scene: { high: 3.4e6, low: 1.2e6 } }
const FLOOR = { bg: 0.5, scene: 0.75 }

const state = { features: 'high', dprScale: 1 }
const subs = new Set()
let locked = false // once the intro lifts, what is drawn never changes
let gpuName = ''

export const quality = state
export const gpu = () => gpuName
export const webglApi = () => typeof window !== 'undefined' && !!(window.WebGL2RenderingContext || window.WebGLRenderingContext)

function notify() {
  document.documentElement.dataset.perf = state.features
  subs.forEach((fn) => fn(state))
}
function setFeatures(f) {
  if (locked || f === state.features) return
  state.features = f
  notify()
}

export function onQuality(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}
export function useQuality() {
  const [s, set] = useState(() => ({ ...state }))
  useEffect(() => onQuality((n) => set({ ...n })), [])
  return s
}

// Device-pixel-ratio for a canvas of `kind` ('bg' | 'scene') right now.
export function dprFor(kind, width = window.innerWidth, height = window.innerHeight) {
  const f = state.features === 'static' ? 'low' : state.features
  const device = Math.min(window.devicePixelRatio || 1, CAP[kind][f])
  const budget = Math.sqrt(BUDGET[kind][f] / Math.max(1, width * height))
  return Math.max(FLOOR[kind], Math.min(device, budget) * state.dprScale)
}

/* ---------- 1. capability → tier (no throwaway WebGL context: that stalls start-up) ---------- */
function detect() {
  if (forced in { high: 1, low: 1, static: 1 }) return forced
  if (!webglApi()) return 'static'
  const nav = navigator
  if (nav.connection?.saveData) return 'static'
  let weak = 0
  if ((nav.hardwareConcurrency || 8) <= 4) weak++
  if ((nav.deviceMemory || 8) <= 4) weak++
  // phones & tablets: high-DPR screens, small GPUs, batteries → start light
  if (matchMedia('(pointer: coarse)').matches) weak += 2
  return weak >= 2 ? 'low' : 'high'
}

// Old / entry-level mobile and desktop GPUs. (Careful: plain "HD Graphics" would also
// match modern Intel UHD/Iris laptops, which handle the full tier fine.)
const WEAK_GPU = /Mali-(4\d\d|T\d|G3\d|G5[12]|G57)|Adreno \(TM\) ([2-5]\d\d|6[0-1]\d)\b|PowerVR|Intel\(R\) HD Graphics( [2-5]\d{3})?\b|Intel.*GMA|Apple A(9|1[0-2])\b/i
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render|software/i

// The first real canvas reports its GPU (behind the intro, before anything is shown).
export function noteRenderer(gl) {
  if (gpuName || forced) return
  try {
    const ctx = gl.getContext()
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    gpuName = String(ctx.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : ctx.RENDERER) || '?')
  } catch {
    gpuName = '?'
  }
  if (SOFTWARE_GPU.test(gpuName)) setFeatures('static')
  else if (WEAK_GPU.test(gpuName) && state.features === 'high') setFeatures('low')
}

/* ---------- 2. resolution-only adaptation ---------- */
let step = 0
function setStep(n) {
  step = n
  state.dprScale = SCALES[n]
  notify()
}

function monitor() {
  let last = 0
  let samples = []
  let windowStart = 0
  let cadence = Infinity // the browser's frame interval: refresh rate, or a cap (30 fps battery saver)
  let late = 0 // consecutive janky windows
  let calm = 0 // consecutive smooth windows
  let changes = 0
  let judgeFrom = Infinity // judge only after the intro, and never right after a known burst
  const pause = (ms) => {
    if (judgeFrom !== Infinity) judgeFrom = Math.max(judgeFrom, performance.now() + ms)
    samples = []
    late = 0
  }
  splashDone.then(() => (judgeFrom = performance.now() + 1500))
  addEventListener('perf:busy', () => pause(2000)) // theme switch
  addEventListener('resize', () => pause(1500))
  document.addEventListener('visibilitychange', () => {
    last = 0
    pause(1500)
  })

  const evaluate = (now) => {
    const s = samples.sort((a, b) => a - b)
    samples = []
    if (s.length < 10) return
    // learn the cadence from the fastest typical frames (the intro, idle moments);
    // never aim above 60 fps — chasing 120 Hz would only blur the scenes
    cadence = Math.max(1000 / 60, Math.min(cadence, s[Math.floor(s.length * 0.25)]))
    if (now < judgeFrom || document.hidden) return
    const share = s.filter((d) => d > cadence * 1.5 + 2).length / s.length
    if (share > 0.3) {
      late++
      calm = 0
    } else if (share < 0.06) {
      calm++
      late = 0
    } else {
      late = 0
      calm = 0
    }
    if (changes >= 8) return // never ping-pong
    if (late >= 2 && step < SCALES.length - 1) {
      setStep(step + 1)
      changes++
      pause(2500)
    } else if (calm >= 12 && step > 0) {
      setStep(step - 1) // smooth again: sharpen back up
      changes++
      calm = 0
      pause(2500)
    }
  }

  const frame = (ts) => {
    if (last) {
      const d = ts - last
      if (d < 250) samples.push(d) // longer gaps are tab switches / one-off stalls, not cadence
    }
    last = ts
    if (!windowStart) windowStart = ts
    if (samples.length >= 90 || (samples.length >= 12 && ts - windowStart > 1000)) {
      evaluate(performance.now())
      windowStart = ts
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

let started = false
export function initQuality() {
  if (started) return state
  started = true
  state.features = detect()
  notify()
  if (forced) locked = true
  else splashDone.then(() => (locked = true))
  if (!forced && state.features !== 'static') monitor()
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
