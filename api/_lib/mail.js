import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'
import { EMAIL, INTERESTS } from '../../src/content.js'

/*
  "Start a project" enquiries → a branded email in the team inbox.

  The message is real MIME, built by Nodemailer:
    multipart/mixed
      └─ multipart/alternative
           ├─ text/plain          (readable in any client)
           └─ multipart/related
                ├─ text/html      (branded, table layout + inline styles for email clients)
                └─ image/png      (the Apheleia mark, inline via Content-ID "cid:")
  Reply-To is the visitor, so "Reply" in Gmail answers them directly.

  Sending: Gmail SMTP with an App Password, from environment variables only
  (never in the browser):  GMAIL_USER, GMAIL_APP_PASSWORD, optional CONTACT_TO.
  Without them in development, the email is written to .mail-previews/*.eml
  (and an .html preview) instead of being sent.
*/

const here = dirname(fileURLToPath(import.meta.url))
const LOGO = readFileSync(join(here, 'logo.png'))
const DEFAULT_TO = EMAIL // the same list + address the site uses (src/content.js)

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const clean = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').trim().slice(0, max)
const oneLine = (s, max) => clean(s, max).replace(/\s+/g, ' ')

/* ---------- validation + spam checks ---------- */
export function validate(body) {
  const data = {
    name: oneLine(body?.name, 100),
    email: oneLine(body?.email, 200).toLowerCase(),
    interest: oneLine(body?.interest, 60),
    details: clean(body?.details, 5000),
  }
  // honeypot: a hidden field people never see, but form-filling bots do
  if (body?.website) return { spam: true }
  // humans need a few seconds to read the dialog and type
  const age = Date.now() - Number(body?.t || 0)
  if (!(age > 2500 && age < 6 * 3600e3)) return { spam: true }

  const errors = {}
  if (data.name.length < 2) errors.name = 'Please add your name.'
  if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(data.email)) errors.email = 'Please check your email address.'
  if (data.details.length < 10) errors.details = 'Tell us a little more (at least 10 characters).'
  if (data.interest && !INTERESTS.includes(data.interest)) data.interest = ''
  return Object.keys(errors).length ? { errors } : { data }
}

/* ---------- the email ---------- */
export function compose({ name, email, interest, details }, meta = {}) {
  const topic = interest || 'Not sure yet'
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  const subject = `New project enquiry · ${topic} · ${name}`
  const replyHref = `mailto:${email}?subject=${encodeURIComponent(`Re: your project enquiry (${topic})`)}`

  const text = [
    'NEW PROJECT ENQUIRY — apheleia website',
    '',
    `Name:        ${name}`,
    `Email:       ${email}`,
    `Interested:  ${topic}`,
    `Received:    ${when} IST`,
    '',
    'Project details',
    '---------------',
    details,
    '',
    `Reply directly to this email to answer ${name}.`,
  ].join('\n')

  const row = (label, value) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e3ebe0;width:120px;font:600 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5d7363;vertical-align:top">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e3ebe0;font:15px/1.5 Arial,Helvetica,sans-serif;color:#0c1f12">${value}</td>
          </tr>`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2ec">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(`${name} · ${topic} — ${details.slice(0, 120)}`)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ec">
    <tr><td align="center" style="padding:32px 14px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 40px rgba(12,31,18,.08)">
        <tr>
          <td style="background:#030503;background-image:linear-gradient(135deg,#0b1a0f 0%,#030503 60%);padding:28px 32px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle">
                <img src="cid:logo@apheleia" width="44" height="36" alt="Apheleia" style="display:inline-block;vertical-align:middle;border:0">
                <span style="display:inline-block;vertical-align:middle;margin-left:10px;font:700 22px/1 Arial,Helvetica,sans-serif;color:#f1f7ee">Apheleia</span>
              </td>
              <td align="right" style="vertical-align:middle;font:600 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#bcfa03">New enquiry</td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="height:4px;line-height:4px;font-size:0;background:#bcfa03;background-image:linear-gradient(90deg,#bcfa03,#46d35b)">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px 32px 8px">
            <p style="margin:0 0 6px;font:600 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#23a045">Start a project</p>
            <h1 style="margin:0 0 22px;font:700 24px/1.25 Arial,Helvetica,sans-serif;color:#0c1f12">${esc(name)} wants to talk about ${esc(topic === 'Not sure yet' ? 'a new project' : topic)}</h1>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row('Name', esc(name))}
              ${row('Email', `<a href="mailto:${esc(email)}" style="color:#1b8a3a;text-decoration:none">${esc(email)}</a>`)}
              ${row('Interested in', `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eaf8d0;color:#2b5d0c;font:600 13px/1.3 Arial,Helvetica,sans-serif">${esc(topic)}</span>`)}
              ${row('Received', `${esc(when)} IST`)}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 8px">
            <p style="margin:0 0 10px;font:600 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5d7363">Project details</p>
            <div style="padding:18px 20px;border-radius:12px;background:#f4f8f2;border:1px solid #e3ebe0;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0c1f12;white-space:pre-wrap">${esc(details)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 32px">
            <a href="${esc(replyHref)}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#bcfa03;color:#031006;font:700 15px/1 Arial,Helvetica,sans-serif;text-decoration:none">Reply to ${esc(name)} &rarr;</a>
            <p style="margin:14px 0 0;font:13px/1.5 Arial,Helvetica,sans-serif;color:#5d7363">Or just hit Reply — it goes straight to ${esc(email)}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background:#f4f8f2;border-top:1px solid #e3ebe0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#7a8c7e">
            Sent from the contact form on the Apheleia website${meta.page ? ` · ${esc(meta.page)}` : ''}.<br>Apheleia · Tamil Nadu, India
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return {
    subject,
    text,
    html,
    replyTo: { name, address: email },
    attachments: [{ filename: 'apheleia.png', content: LOGO, contentType: 'image/png', cid: 'logo@apheleia', contentDisposition: 'inline' }],
  }
}

/* ---------- delivery ---------- */
let transport
export async function deliver(message, env = process.env) {
  const user = env.GMAIL_USER
  const pass = env.GMAIL_APP_PASSWORD
  const to = env.CONTACT_TO || DEFAULT_TO
  if (!user || !pass) {
    if (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') return { ok: false, reason: 'not-configured' }
    return preview({ ...message, to, from: `Apheleia website <${DEFAULT_TO}>` })
  }
  transport ??= nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  const info = await transport.sendMail({ ...message, from: { name: 'Apheleia website', address: user }, to })
  return { ok: true, id: info.messageId }
}

// development without credentials: write the exact MIME message (.eml) + an HTML preview
async function preview(message) {
  const raw = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' }).sendMail(message)
  const dir = join(process.cwd(), '.mail-previews')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await writeFile(join(dir, `${stamp}.eml`), raw.message)
  await writeFile(join(dir, `${stamp}.html`), message.html.replace('cid:logo@apheleia', `data:image/png;base64,${LOGO.toString('base64')}`))
  return { ok: true, preview: `.mail-previews/${stamp}.eml` }
}
