import * as THREE from 'three'
import { LOGO_PATHS, LOGO_VIEWBOX } from '../brand/logo.js'

// Canvas-drawn textures for the story board and task cards.

const finish = (canvas) => {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}
const canvas2d = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  // CPU-backed: drawing these never syncs with a GPU that is busy compiling shaders
  return [c, c.getContext('2d', { willReadFrequently: true })]
}
const rr = (g, x, y, w, h, r) => {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/* Board top: world size TOP_W × TOP_D maps onto the canvas. */
export const TOP_W = 5.5
export const TOP_D = 3.6
const BW = 1100
const BH = 720
const cx = (wx) => ((wx + TOP_W / 2) / TOP_W) * BW
const cy = (wz) => ((wz + TOP_D / 2) / TOP_D) * BH

export function makeBoardTexture(pal, { cols, rows, slots, cardW, cardD, sidebarX }) {
  const [c, g] = canvas2d(BW, BH)
  g.fillStyle = pal.panel
  g.fillRect(0, 0, BW, BH)

  // sidebar
  const sx = cx(sidebarX)
  g.fillStyle = pal.panelLine
  g.fillRect(sx, 28, 2, BH - 56)

  g.save()
  g.translate(32, 38)
  g.scale(32 / LOGO_VIEWBOX[2], 32 / LOGO_VIEWBOX[2])
  g.translate(-LOGO_VIEWBOX[0], -LOGO_VIEWBOX[1])
  g.fillStyle = '#BCFA03'
  LOGO_PATHS.forEach((d) => g.fill(new Path2D(d)))
  g.restore()
  g.fillStyle = pal.panelText
  g.font = '700 32px Quicksand, "Varela Round", sans-serif'
  g.fillText('Apheleia', 74, 64)

  const items = ['Overview', 'Projects', 'Boards', 'Analytics', 'Team', 'Settings']
  g.font = '500 19px Inter, system-ui, sans-serif'
  items.forEach((t, i) => {
    const y = 150 + i * 54
    const active = i === 2
    if (active) {
      g.fillStyle = pal.panelLine
      rr(g, 24, y - 30, sx - 48, 44, 12)
      g.fill()
    }
    g.fillStyle = active ? pal.accent : pal.panelMuted
    rr(g, 42, y - 17, 16, 16, 4)
    g.fill()
    g.fillStyle = active ? pal.panelText : pal.panelMuted
    g.fillText(t, 72, y - 2)
  })

  g.fillStyle = pal.cards[0].bg
  g.beginPath()
  g.arc(56, BH - 62, 20, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = pal.panelText
  g.font = '600 18px Inter, system-ui, sans-serif'
  g.fillText('Your team', 88, BH - 66)
  g.fillStyle = pal.panelMuted
  g.font = '400 15px Inter, system-ui, sans-serif'
  g.fillText('7 co-founders', 88, BH - 45)

  // header
  const mx = sx + 34
  g.fillStyle = pal.panelText
  g.font = '700 36px Quicksand, "Varela Round", sans-serif'
  g.fillText('Project board', mx, 70)
  g.font = '500 15px Inter, system-ui, sans-serif'
  ;['Board', 'List', 'Timeline'].forEach((t, i) => {
    const x = BW - 330 + i * 100
    g.fillStyle = i === 0 ? pal.panelLine : 'transparent'
    rr(g, x, 44, 88, 34, 17)
    g.fill()
    g.fillStyle = i === 0 ? pal.panelText : pal.panelMuted
    g.fillText(t, x + 20, 67)
  })

  // columns
  const names = ['Discover', 'Design', 'Develop']
  cols.forEach((x, i) => {
    const left = cx(x - cardW / 2)
    g.fillStyle = pal.panelText
    g.font = '600 19px Inter, system-ui, sans-serif'
    g.fillText(names[i], left, cy(rows[0] - cardD / 2) - 26)
    const count = slots.filter(([col]) => col === i).length
    g.fillStyle = pal.panelLine
    rr(g, left + g.measureText(names[i]).width + 12, cy(rows[0] - cardD / 2) - 46, 30, 26, 13)
    g.fill()
    g.fillStyle = pal.panelMuted
    g.font = '600 14px Inter, system-ui, sans-serif'
    g.fillText(String(count), left + g.measureText(names[i]).width + 22 + (count > 9 ? -4 : 0), cy(rows[0] - cardD / 2) - 28)
  })

  // empty slots the cards land into
  g.setLineDash([8, 8])
  g.lineWidth = 2
  g.strokeStyle = pal.panelMuted
  slots.forEach(([col, row]) => {
    rr(g, cx(cols[col] - cardW / 2), cy(rows[row] - cardD / 2), (cardW / TOP_W) * BW, (cardD / TOP_D) * BH, 18)
    g.stroke()
  })
  return finish(c)
}

export function makeCardTexture({ bg, ink }, seed, avatarColors) {
  const [c, g] = canvas2d(512, 318)
  g.globalAlpha = 0.4
  g.fillStyle = bg
  g.fillRect(0, 0, 512, 318)
  g.globalAlpha = 1

  g.globalAlpha = 0.16
  g.fillStyle = ink
  rr(g, 30, 30, 104, 30, 15)
  g.fill()
  g.globalAlpha = 0.9
  g.font = '600 15px Inter, system-ui, sans-serif'
  g.fillText(['Research', 'UI kit', 'API', 'Sprint 4'][seed % 4], 46, 51)

  g.globalAlpha = 0.92
  rr(g, 30, 84, 330 - (seed % 3) * 50, 20, 10)
  g.fill()
  rr(g, 30, 116, 230 + (seed % 2) * 60, 20, 10)
  g.fill()
  g.globalAlpha = 0.45
  rr(g, 30, 156, 190, 13, 6.5)
  g.fill()

  g.globalAlpha = 1
  for (let k = 0; k < 3; k++) {
    g.fillStyle = avatarColors[(seed + k) % avatarColors.length]
    g.strokeStyle = bg
    g.lineWidth = 5
    g.beginPath()
    g.arc(54 + k * 32, 262, 20, 0, Math.PI * 2)
    g.fill()
    g.stroke()
  }
  g.globalAlpha = 0.75
  g.strokeStyle = ink
  g.lineWidth = 4
  g.setLineDash([6, 6])
  g.beginPath()
  g.arc(452, 262, 20, 0, Math.PI * 2)
  g.stroke()
  g.setLineDash([])
  rr(g, 376, 250, 40, 24, 6)
  g.stroke()
  return finish(c)
}

export function makeShadowTexture(color) {
  const [c, g] = canvas2d(256, 256)
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128)
  grd.addColorStop(0, color)
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  return finish(c)
}
