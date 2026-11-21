import { useEffect } from 'react'

const fine = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/*
  Glassy 3D tilt: rotates the card toward the cursor and moves a glare highlight.
  Also sets --mx/--my (px) for cards that draw a cursor spotlight.
*/
export const tilt = {
  onPointerMove(e) {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
    if (e.pointerType !== 'mouse' || calm()) return
    const max = Number(el.dataset.tilt || 7)
    el.style.setProperty('--ry', `${((x / r.width) * 2 - 1) * max}deg`)
    el.style.setProperty('--rx', `${-((y / r.height) * 2 - 1) * max}deg`)
    el.style.setProperty('--gx', `${(x / r.width) * 100}%`)
    el.style.setProperty('--gy', `${(y / r.height) * 100}%`)
  },
  onPointerLeave(e) {
    const el = e.currentTarget
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  },
}

// Primary buttons (and anything with .magnetic) lean toward the cursor.
export function useMagnetic() {
  useEffect(() => {
    if (!fine() || calm()) return
    let active = null
    const reset = (el) => {
      el.style.setProperty('--mag-x', '0px')
      el.style.setProperty('--mag-y', '0px')
    }
    const move = (e) => {
      const el = e.target.closest?.('.btn--primary, .magnetic')
      if (active && active !== el) reset(active)
      active = el
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mag-x', `${(e.clientX - (r.left + r.width / 2)) * 0.22}px`)
      el.style.setProperty('--mag-y', `${(e.clientY - (r.top + r.height / 2)) * 0.32}px`)
    }
    const leave = () => active && reset(active)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])
}
