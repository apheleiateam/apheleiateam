/*
  Reliable "refresh keeps your place".

  The browser restores the scroll position while the page is still just the intro
  (React hasn't rendered the tall content yet), so sometimes there is nothing to
  scroll to and a refresh lands back at the top. Same for a shared #section link.
  Instead: remember the position when leaving, and restore it ourselves once the
  page has rendered — behind the intro, so the visitor never sees the jump.
*/
const KEY = 'apheleia-scroll'

try {
  history.scrollRestoration = 'manual'
} catch {}

addEventListener('pagehide', () => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path: location.pathname, y: Math.round(window.scrollY) }))
  } catch {}
})

// Call once, after the first render.
export function restoreScroll() {
  let saved = null
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    sessionStorage.removeItem(KEY)
  } catch {}
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))
  if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY)
  else if (saved && saved.path === location.pathname && saved.y > 0) window.scrollTo(0, saved.y)
}
