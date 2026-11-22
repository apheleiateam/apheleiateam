/*
  Scene heartbeat. Each WebGL scene records when it last actually drew a frame, and
  the background records how visible its particles are. Used:
    · by the background, to know whether the hero / story canvas really covers it
      (it only eases off when the canvas on top is alive and drawing), and
    · by scripts/check-scenes.mjs (with ?debug=scenes) to prove that no scene goes
      missing while scrolling, theme-switching, throttling or reloading.
*/
const scene = () => ({ alive: false, frames: 0, at: 0 })
export const health = { bg: { ...scene(), particles: 0 }, hero: scene(), story: scene() }

export function beat(name) {
  const h = health[name]
  h.frames++
  h.at = performance.now()
}

// alive and drew within the last `ms`
export const drawing = (name, ms = 400) => health[name].alive && performance.now() - health[name].at < ms

if (/[?&]debug=scenes/.test(location.search)) window.__scenes = health

