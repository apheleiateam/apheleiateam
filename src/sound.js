import { useEffect, useState } from 'react'

/*
  Liquid UI sounds, synthesized live with the Web Audio API — no audio files.

  A water "drop" is a sine bubble whose pitch sweeps upward as it decays (that
  rising ring is what makes a drop sound wet); a "slosh" is noise through a
  sweeping band-pass filter. A short filtered echo gives everything a little
  liquid space. All sounds are quiet and short.

  Any element can opt in with data-sound="tap|soft|card|theme|open|close|none";
  plain buttons get a soft tap by default. One capture-phase listener handles
  every click, so components don't need to import anything.
*/

const KEY = 'apheleia-sound'
let enabled = true
try {
  enabled = localStorage.getItem(KEY) !== 'off'
} catch {}
const subs = new Set()

let ctx = null
let out = null
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC({ latencyHint: 'interactive' })
    out = ctx.createGain()
    out.gain.value = 0.9
    out.connect(ctx.destination)
    // wet echo: delay → low-pass → feedback, mixed in quietly
    const delay = ctx.createDelay(0.5)
    delay.delayTime.value = 0.085
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2200
    const feedback = ctx.createGain()
    feedback.gain.value = 0.24
    const wet = ctx.createGain()
    wet.gain.value = 0.2
    out.connect(delay)
    delay.connect(tone)
    tone.connect(feedback)
    feedback.connect(delay)
    tone.connect(wet)
    wet.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const jitter = (amount = 0.08) => 1 + (Math.random() - 0.5) * amount

// one water drop: pitch f0 → f1 over the first half, gain decays over `dur` seconds
function drop(t, f0, f1, dur, vol) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const j = jitter()
  o.type = 'sine'
  o.frequency.setValueAtTime(f0 * j, t)
  o.frequency.exponentialRampToValueAtTime(f1 * j, t + dur * 0.55)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.03)
}

let noise = null
function slosh(t, from, to, dur, vol) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noise
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 5
  bp.frequency.setValueAtTime(from, t)
  bp.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g).connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

const SOUNDS = {
  // a single bright drop — buttons
  tap: (t) => drop(t, 520, 1350, 0.09, 0.1),
  // a smaller, quieter drop — links, dots, chips
  soft: (t) => drop(t, 760, 1600, 0.07, 0.055),
  // "blip-blop": two drops — the team ring / carousels moving on
  card: (t) => {
    drop(t, 300, 900, 0.11, 0.11)
    drop(t + 0.05, 640, 1500, 0.08, 0.07)
  },
  // light: a rising pour of three bubbles
  'theme-light': (t) => {
    slosh(t, 380, 1900, 0.34, 0.045)
    ;[0, 0.07, 0.14].forEach((d, i) => drop(t + d, 260 * (1 + i * 0.55), 760 * (1 + i * 0.55), 0.12, 0.09))
  },
  // dark: the same pour, sinking
  'theme-dark': (t) => {
    slosh(t, 1900, 380, 0.34, 0.045)
    ;[0, 0.07, 0.14].forEach((d, i) => drop(t + d, 260 * (1 + (2 - i) * 0.55), 760 * (1 + (2 - i) * 0.55), 0.12, 0.09))
  },
  // a splash — dialogs opening, sending the email
  open: (t) => {
    slosh(t, 520, 2600, 0.24, 0.06)
    drop(t + 0.03, 240, 820, 0.16, 0.11)
    drop(t + 0.11, 520, 1400, 0.09, 0.07)
  },
  // a falling drop — closing
  close: (t) => drop(t, 1100, 480, 0.11, 0.07),
}

export function play(name) {
  if (!enabled || !SOUNDS[name]) return
  const c = audio()
  if (!c) return
  SOUNDS[name](c.currentTime + 0.005)
}

export const soundEnabled = () => enabled
export function setSoundEnabled(on) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {}
  subs.forEach((fn) => fn(on))
  if (on) play('tap')
}
export function useSound() {
  const [on, set] = useState(enabled)
  useEffect(() => {
    subs.add(set)
    return () => subs.delete(set)
  }, [])
  return [on, setSoundEnabled]
}

/* one listener for every click on the page */
function onClick(e) {
  if (!enabled) return
  const el = e.target.closest?.('[data-sound], button, a.btn, a[href^="#"]')
  if (!el || el.disabled) return
  let name = el.dataset.sound || (el.tagName === 'A' ? 'soft' : 'tap')
  if (name === 'none') return
  // capture phase runs before React's handler, so this is still the theme being left
  if (name === 'theme') name = document.documentElement.dataset.theme === 'dark' ? 'theme-light' : 'theme-dark'
  play(name)
}
document.addEventListener('click', onClick, true)
