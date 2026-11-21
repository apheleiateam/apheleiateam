import { useEffect } from 'react'
import { splashDone } from '../splash.js'

// Animates any `.reveal` element in once it scrolls into view — starting only when
// the intro splash lifts, so the hero animates in as it is revealed.
export default function useReveal() {
  useEffect(() => {
    let live = true
    let io
    splashDone.then(() => {
      if (live) io = observe()
    })
    return () => {
      live = false
      io?.disconnect()
    }
  }, [])
}

function observe() {
  {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return null
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => io.observe(el))
    return io
  }
}
