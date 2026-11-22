#!/usr/bin/env node
/*
  Scene regression check — proves the 3D never goes missing.

    npm run check:scenes          builds, serves the build, runs every scenario
    node scripts/check-scenes.mjs reload --repeat 5    (after a build) one scenario, 5 times

  For each scenario it loads the site in real Chrome (hardware GPU), scrolls through
  every section and asserts, at each stop:
    · the quality tier never changes after the intro (what is drawn is fixed per visit)
    · the background, hero and story scenes are mounted and actually drawing
    · the particle shapes are visible in the sections that have them
    · no errors in the console

  Scenarios cover what broke it before: Chrome's 30 fps battery-saver cap, jank
  bursts, a 4× slower CPU, a phone, theme switches, and a reload mid-page.
  Set CHROME=/path/to/chrome if Chrome isn't in the default location.
*/
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4179
const BASE = `http://localhost:${PORT}/`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chromePath =
  process.env.CHROME ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p))
if (!chromePath) {
  console.error('Chrome not found — set CHROME=/path/to/chrome')
  process.exit(2)
}
if (typeof WebSocket === 'undefined') {
  console.error('Node 22+ is required (global WebSocket)')
  process.exit(2)
}

/* ---------- serve the production build ---------- */
const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
for (let i = 0; ; i++) {
  try {
    if ((await fetch(BASE)).ok) break
  } catch {}
  if (i > 80) throw new Error('preview server did not start')
  await sleep(250)
}

/* ---------- Chrome over the DevTools protocol ---------- */
const profile = mkdtempSync(join(tmpdir(), 'scene-check-'))
const gpuFlags = process.platform === 'win32' ? ['--use-angle=d3d11'] : []
const chrome = spawn(chromePath, ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', ...gpuFlags, '--hide-scrollbars', '--remote-debugging-port=9399', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
let target
for (let i = 0; i < 80 && !target; i++) {
  try {
    target = (await (await fetch('http://127.0.0.1:9399/json')).json()).find((t) => t.type === 'page')
  } catch {}
  if (!target) await sleep(250)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let seq = 0
const pending = new Map()
let errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 240))
}
const send = (method, params = {}) => new Promise((r) => (pending.set(++seq, r), ws.send(JSON.stringify({ id: seq, method, params }))))
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable')
await send('Page.enable')
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__tiers = []
    new MutationObserver(() => window.__tiers.push(document.documentElement.dataset.perf))
      .observe(document, { attributes: true, subtree: true, attributeFilter: ['data-perf'] })`,
})

/* ---------- helpers ---------- */
const STOPS = [
  { id: 'home', need: ['bg', 'hero'] },
  { id: 'process', at: 0.5, need: ['bg', 'story'] },
  { id: 'about', need: ['bg'], particles: true },
  { id: 'services', need: ['bg'], particles: true },
  { id: 'work', need: ['bg'], particles: true },
  { id: 'team', need: ['bg'], particles: true },
  { id: 'principles', need: ['bg'], particles: true },
  { id: 'contact', need: ['bg'], particles: true },
]

async function load(url) {
  errors = []
  await evaluate('window.__previousPage = true') // so we never mistake the old page for the new one
  if (url) await send('Page.navigate', { url })
  else await send('Page.reload') // a browser refresh: keeps the scroll position
  for (let i = 0; i < 80; i++) {
    await sleep(250)
    if (await evaluate(`!window.__previousPage && document.readyState === 'complete' && !document.getElementById('splash')`)) break
  }
  await sleep(1500)
}

async function scrollTo(stop) {
  await evaluate(`(() => {
    const el = document.getElementById('${stop.id}')
    const top = el.getBoundingClientRect().top + scrollY
    const y = ${stop.at ?? 'null'} === null ? top : top + ${stop.at ?? 0} * (el.offsetHeight - innerHeight)
    window.scrollTo(0, y)
  })()`)
  await sleep(1600) // let the scenes settle at the new position
}

async function inspect(stop, problems, label) {
  const s = await evaluate(`({
    tier: document.documentElement.dataset.perf,
    canvases: document.querySelectorAll('canvas').length,
    scenes: window.__scenes,
    now: performance.now(),
    scrollY: Math.round(scrollY),
    cachedY: Math.round(window.__viewport?.y ?? -1),
  })`)
  if (!s.scenes) return problems.push(`${label}: no scene data (page failed to start?)`)
  if (s.tier === 'static') return problems.push(`${label}: switched to plain HTML — 3D gone`)
  if (s.canvases < 3) problems.push(`${label}: only ${s.canvases} of 3 canvases mounted`)
  for (const name of stop.need) {
    const h = s.scenes[name]
    const age = Math.round(s.now - h.at)
    if (!h.alive) problems.push(`${label}: ${name} scene not alive`)
    else if (age > 700) problems.push(`${label}: ${name} scene stopped drawing (${age} ms ago)${h.gate ? ' gate ' + JSON.stringify(h.gate) : ''}`)
  }
  if (stop.particles && s.scenes.bg.particles < 0.5) {
    const b = s.scenes.bg
    problems.push(`${label}: particles faded out (alpha ${b.particles.toFixed(2)}; morph ${b.morph?.toFixed(2)} → ${b.want?.toFixed(2)}, scroll ${s.scrollY}, cached ${s.cachedY})`)
  }
}

async function walk(problems, prefix, between) {
  for (const stop of STOPS) {
    await scrollTo(stop)
    if (between) await between(stop)
    await inspect(stop, problems, `${prefix}${stop.id}`)
  }
}

async function finish(problems) {
  const tiers = (await evaluate('window.__tiers')) || []
  if (new Set(tiers).size > 1) problems.push(`tier changed during the visit: ${tiers.join(' → ')}`)
  for (const e of new Set(errors.map((e) => String(e).split(/\r?\n/)[0]))) problems.push(`console error: ${e}`)
}

/* ---------- scenarios ---------- */
const desktop = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }
const SCENARIOS = [
  { name: 'desktop', view: desktop },
  {
    name: '30 fps cap (battery saver)',
    view: desktop,
    after: `(function burn() { const t = performance.now(); while (performance.now() - t < 22) {} requestAnimationFrame(burn) })()`,
  },
  {
    name: 'jank bursts',
    view: desktop,
    after: `setInterval(() => { const t = performance.now(); while (performance.now() - t < 260) {} }, 1100)`,
  },
  { name: 'slow CPU ×4', view: desktop, cpu: 4 },
  { name: 'phone', view: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, touch: true },
  { name: 'theme switching', view: desktop, themeSwitch: true },
  { name: 'reload mid-page', view: desktop, reload: 'work' },
]

// optional: `node scripts/check-scenes.mjs reload --repeat 5` runs matching scenarios N times
const args = process.argv.slice(2)
const repeat = Math.max(1, Number(args[args.indexOf('--repeat') + 1]) || 1)
const filter = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--repeat')
const chosen = SCENARIOS.filter((sc) => !filter.length || filter.some((f) => sc.name.includes(f)))
const runs = chosen.flatMap((sc) => Array.from({ length: repeat }, (_, i) => (repeat > 1 ? { ...sc, name: `${sc.name} #${i + 1}` } : sc)))

const results = []
let gpuNote = ''
for (const sc of runs) {
  const problems = []
  await send('Emulation.setDeviceMetricsOverride', sc.view)
  await send('Emulation.setTouchEmulationEnabled', { enabled: !!sc.touch, maxTouchPoints: sc.touch ? 5 : 1 })
  await send('Emulation.setCPUThrottlingRate', { rate: sc.cpu || 1 })
  await send('Page.navigate', { url: 'about:blank' })
  await load(`${BASE}?debug=scenes`)

  const tier = await evaluate('document.documentElement.dataset.perf')
  if (tier === 'static' && !gpuNote) {
    gpuNote = 'Chrome has no hardware GPU here (software rendering) — the site correctly shows plain HTML, so scene checks were skipped.'
  }
  if (tier === 'static') {
    results.push({ name: sc.name, ok: null, problems: [] })
    continue
  }

  if (sc.after) await evaluate(sc.after)
  if (sc.reload) {
    await scrollTo({ id: sc.reload })
    await load(null)
    await inspect({ id: sc.reload, need: ['bg'], particles: true }, problems, `after reload @${sc.reload}`)
  }
  await walk(problems, '', sc.themeSwitch
    ? async () => {
        await evaluate(`document.querySelector('.tswitch')?.click()`)
        await sleep(1400)
      }
    : null)
  await finish(problems)
  results.push({ name: sc.name, ok: problems.length === 0, problems })
}

/* ---------- report ---------- */
console.log('\nScene check')
for (const r of results) {
  console.log(`  ${r.ok === null ? '–' : r.ok ? '✔' : '✘'} ${r.name}`)
  for (const p of r.problems) console.log(`      ${p}`)
}
if (gpuNote) console.log(`\n  ${gpuNote}`)
const failed = results.some((r) => r.ok === false)
console.log(failed ? '\nFAILED\n' : '\nAll scenes stayed on screen.\n')

ws.close()
chrome.kill()
// the preview server runs under a shell on Windows: end the whole process tree
if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
else server.kill()
await sleep(400)
try {
  rmSync(profile, { recursive: true, force: true })
} catch {}
process.exit(failed ? 1 : 0)
