/*
  Layout cache: document positions of elements, measured once and re-measured only
  when layout can have changed (resize, fonts, images, body size). Per frame,
  `rectOf(el)` derives the viewport rect from scrollY alone — no forced layout,
  unlike calling getBoundingClientRect() every frame.

  Positions come from the offset chain, so in-flight transforms (reveal animations,
  tilt) don't make 3D anchors wobble.

  `viewport` holds the scroll position and window size. Reading window.scrollY /
  innerHeight forces a synchronous style + layout pass whenever anything wrote to
  the DOM earlier in the frame, so they are read ONCE, in the scroll / resize
  event (registered first, before any other listener), and shared from here.
*/

const boxes = new Map() // el → { x, y, w, h, rect }
let dirty = true
let watching = false

export const viewport = { x: 0, y: 0, w: 0, h: 0 }
function readScroll() {
  viewport.x = window.scrollX
  viewport.y = window.scrollY
  // the read above already brought layout up to date: re-measure now, for free,
  // rather than later inside an animation frame after other code wrote styles
  if (dirty && watching) refresh()
}
function readSize() {
  viewport.w = window.innerWidth
  viewport.h = window.innerHeight
  readScroll()
}
readSize()
addEventListener('scroll', readScroll, { passive: true, capture: true })
addEventListener('resize', () => {
  invalidateLayout()
  readSize()
})

function measure(el, box) {
  let x = 0
  let y = 0
  for (let n = el; n; n = n.offsetParent) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  box.x = x
  box.y = y
  box.w = el.offsetWidth
  box.h = el.offsetHeight
  return box
}

function refresh() {
  for (const [el, box] of boxes) {
    if (el.isConnected) measure(el, box)
    else boxes.delete(el)
  }
  dirty = false
}

export function invalidateLayout() {
  dirty = true
}

function watch() {
  watching = true
  const ro = new ResizeObserver(invalidateLayout)
  ro.observe(document.body)
  addEventListener('load', () => {
    invalidateLayout()
    readSize()
  })
  document.fonts?.ready.then(invalidateLayout)
  // late layout shifts that don't resize <body> (carousels, lazy content)
  setInterval(invalidateLayout, 4000)
}

// Viewport rect of `el` (same fields as getBoundingClientRect). The returned object is reused.
export function rectOf(el) {
  if (!watching) watch()
  if (dirty) refresh()
  let box = boxes.get(el)
  if (!box) {
    box = measure(el, { rect: {} })
    boxes.set(el, box)
  }
  const r = box.rect
  r.top = box.y - viewport.y
  r.left = box.x - viewport.x
  r.width = box.w
  r.height = box.h
  r.bottom = r.top + box.h
  r.right = r.left + box.w
  return r
}
