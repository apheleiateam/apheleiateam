/*
  Intro splash controller. The splash itself is inline in index.html (it paints
  before any JS). While it is up, the page does its heavy one-time work behind
  it: mounting the WebGL scenes, compiling every shader, building the 3D models.
  Each piece `hold(name)`s the splash and `release(name)`s it when ready; the
  splash leaves once nothing is held and its minimum time has passed — or at the
  hard cap, so a slow device never waits long.
*/

const el = document.getElementById('splash')
const root = document.documentElement
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
let quick = false
try {
  quick = !!sessionStorage.getItem('apheleia-intro')
} catch {}

const MIN = reduced ? 500 : quick ? 1000 : 2150 // ms since navigation start: lets the animation finish
const MAX = 4000 // hard cap

const held = new Set()
const released = new Set()
let finished = !el
let resolveDone
export const splashDone = new Promise((r) => (resolveDone = r))
if (finished) {
  root.classList.remove('is-loading')
  resolveDone()
}

export const splashActive = () => !finished

// Resolves once the intro's opening beat (drop → splash) has played, so heavy GPU
// start-up work doesn't freeze it. Immediate when there is no intro.
export const afterIntroBeat = () =>
  new Promise((resolve) => {
    const wait = finished || quick || reduced ? 0 : Math.max(0, 680 - performance.now())
    setTimeout(resolve, wait)
  })

function finish() {
  if (finished) return
  log?.push(`exit ${Math.round(performance.now())} held=[${[...held]}]`)
  finished = true
  el.classList.add('splash--out')
  root.classList.remove('is-loading')
  try {
    sessionStorage.setItem('apheleia-intro', '1')
  } catch {}
  resolveDone()
  setTimeout(() => el.remove(), 1200)
}

function check() {
  if (!finished && held.size === 0 && performance.now() >= MIN) finish()
}

// Keep the splash up until release(name). Idempotent per name.
export function hold(name) {
  if (finished || released.has(name)) return
  held.add(name)
}
const log = /[?&]debug=splash/.test(location.search) ? (window.__splashLog = []) : null
export function release(name) {
  log?.push(`${name} ${Math.round(performance.now())}`)
  released.add(name)
  if (held.delete(name)) check()
}

if (!finished) {
  hold('fonts')
  ;(document.fonts?.ready ?? Promise.resolve()).then(() => release('fonts'))
  setTimeout(check, Math.max(0, MIN - performance.now()) + 16)
  setTimeout(finish, Math.max(0, MAX - performance.now()))
}
