import { compose, deliver, validate } from './_lib/mail.js'

/*
  POST /api/contact — the "Start a project" form.
  Runs as a Vercel serverless function in production; in development `npm run dev`
  serves it through the dev server (see vite.config.js). Written against plain
  Node req/res so it works in both.
*/

// best-effort flood protection per warm instance: 5 enquiries / 10 min / IP
const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60e3)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 5
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body // Vercel parses JSON already
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 64e3) throw new Error('too large')
  }
  return JSON.parse(raw || '{}')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { ok: false, error: 'method' })
  }
  // only accept posts from our own pages
  const origin = req.headers.origin || ''
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  let sameOrigin = true
  if (origin) {
    try {
      sameOrigin = new URL(origin).host === host
    } catch {
      sameOrigin = false
    }
  }
  if (!sameOrigin) return send(res, 403, { ok: false, error: 'origin' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  if (limited(ip)) return send(res, 429, { ok: false, error: 'busy' })

  let body
  try {
    body = await readJson(req)
  } catch {
    return send(res, 400, { ok: false, error: 'bad-request' })
  }

  const v = validate(body)
  if (v.spam) return send(res, 200, { ok: true }) // look successful; send nothing
  if (v.errors) return send(res, 422, { ok: false, error: 'invalid', fields: v.errors })

  try {
    const result = await deliver(compose(v.data, { page: req.headers.referer }))
    if (!result.ok) return send(res, 503, { ok: false, error: result.reason })
    return send(res, 200, { ok: true, ...(result.preview ? { preview: result.preview } : {}) })
  } catch (err) {
    console.error('[contact] send failed', err)
    return send(res, 502, { ok: false, error: 'send-failed' })
  }
}
