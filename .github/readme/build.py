#!/usr/bin/env python3
"""
Builds the animated SVG panels that make up the repository README.

    python .github/readme/build.py

Needs Python 3.9+, Pillow, numpy and fontTools. Quicksand and Inter (both SIL OFL)
are downloaded from Google Fonts into .github/readme/.cache on the first run and
embedded, subset, into each SVG so the panels render the same everywhere.

Team cards are generated from public/team/<name>_<email>.jpeg: add or replace a
photo there, run this script, and commit the regenerated SVGs.
"""
from __future__ import annotations

import base64
import glob
import io
import math
import os
import random
import re
import urllib.request
from collections import defaultdict
from xml.sax.saxutils import escape, quoteattr

import numpy as np
from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CACHE = os.path.join(HERE, '.cache')
OUT = HERE

# ---- brand ("Eternal flame") ------------------------------------------------
BG, RAISED, NAVY, SLATE = '#030503', '#0a120c', '#0f2416', '#1c3a24'
IVORY, SAGE, MIST = '#eef4ec', '#aecbaa', '#d6e6d4'
ACCENT, LIME, SOFT, DEEP, ON = '#46d35b', '#bcfa03', '#e2f7b8', '#239447', '#041307'

LOGO = [
    'M725 318 C740 292 792 292 807 318 L913 499 C875 493 790 503 731 528 C680 548 555 655 530 727 '
    'C518 724 502 708 511 688 Z',
    'M645 727 C663 658 758 547 921 515 L1022 682 C1034 700 1024 727 1000 727 L902 727 C890 727 882 722 '
    '876 713 L822 628 C808 611 780 612 762 626 C722 650 668 690 645 727 Z',
]
SPARKLE = 'M12 0C12.7 6.4 17.6 11.3 24 12C17.6 12.7 12.7 17.6 12 24C11.3 17.6 6.4 12.7 0 12C6.4 11.3 11.3 6.4 12 0Z'
ICONS = {
    'design': 'M11 3l1.9 4.9L17.8 9.8l-4.9 1.9L11 16.6l-1.9-4.9L4.2 9.8l4.9-1.9zM18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
    'code': 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16',
    'nodes': 'M10.3 3h3.4A1.3 1.3 0 0 1 15 4.3v2.4A1.3 1.3 0 0 1 13.7 8h-3.4A1.3 1.3 0 0 1 9 6.7V4.3A1.3 1.3 0 0 1 10.3 3z'
             'M4.3 16h3.4A1.3 1.3 0 0 1 9 17.3v2.4A1.3 1.3 0 0 1 7.7 21H4.3A1.3 1.3 0 0 1 3 19.7v-2.4A1.3 1.3 0 0 1 4.3 16z'
             'M16.3 16h3.4a1.3 1.3 0 0 1 1.3 1.3v2.4a1.3 1.3 0 0 1-1.3 1.3h-3.4a1.3 1.3 0 0 1-1.3-1.3v-2.4a1.3 1.3 0 0 1 1.3-1.3z'
             'M12 8v6M6 16v-2h12v2',
    'compass': 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15.5 8.5l-2 5-5 2 2-5z',
    'search': 'M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0zM20 20l-4.2-4.2',
    'pen': 'M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16zM14 6l3 3',
    'rocket': 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1.5-4 5-8.5 12-9-.5 7-5 10.5-9 12zM16 9.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
    'right': 'M5 12h14M13 6l6 6-6 6',
    'upright': 'M7 17 17 7M8 7h9v9',
    'down': 'M12 5v14M6 13l6 6 6-6',
    'mail': 'M4 6h16v12H4zM4 7l8 6 8-6',
    'automation': 'M19.6 13.5a8 8 0 0 1-13.9 3.4M4.4 10.5a8 8 0 0 1 13.9-3.4M18.6 3.6v3.8h-3.8M5.4 20.4v-3.8h3.8M12.8 8.4 10.6 12h3l-2.2 3.6',
    'instagram': 'M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM17.2 6.6v.01',
}

# ---- fonts ------------------------------------------------------------------
FONTS = {
    'q500': ('Quicksand', 500), 'q600': ('Quicksand', 600), 'q700': ('Quicksand', 700),
    'i400': ('Inter', 400), 'i500': ('Inter', 500), 'i600': ('Inter', 600), 'i700': ('Inter', 700),
}


def font_file(k):
    fam, w = FONTS[k]
    return os.path.join(CACHE, f'{fam}-{w}.ttf')


def ensure_fonts():
    if all(os.path.exists(font_file(k)) for k in FONTS):
        return
    os.makedirs(CACHE, exist_ok=True)
    url = ('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700'
           '&family=Inter:wght@400;500;600;700')
    css = urllib.request.urlopen(url).read().decode()
    for fam, w, src in re.findall(r"font-family: '(\w+)';.*?font-weight: (\d+);.*?src: url\((\S+?)\)", css, re.S):
        urllib.request.urlretrieve(src, os.path.join(CACHE, f'{fam}-{w}.ttf'))


_metrics = {}


def tw(s, k, size, ls=0.0):
    """Approximate rendered width of `s` (advance widths, no kerning)."""
    if k not in _metrics:
        f = TTFont(font_file(k))
        _metrics[k] = (f.getBestCmap(), f['hmtx'].metrics, f['head'].unitsPerEm)
    cmap, hmtx, upem = _metrics[k]
    w = sum(hmtx[cmap.get(ord(c)) or cmap[32]][0] for c in s)
    return w * size / upem + ls * len(s)


def wrap(s, k, size, maxw):
    lines, cur = [], ''
    for word in s.split():
        t = f'{cur} {word}'.strip()
        if cur and tw(t, k, size) > maxw:
            lines.append(cur)
            cur = word
        else:
            cur = t
    return lines + [cur] if cur else lines


_faces = {}


def face(k, chars):
    key = (k, chars)
    if key not in _faces:
        f = TTFont(font_file(k))
        o = subset.Options()
        o.layout_features = ['kern', 'liga', 'calt']
        o.hinting = False
        o.desubroutinize = True
        sub = subset.Subsetter(o)
        sub.populate(text=chars)
        sub.subset(f)
        f.flavor = 'woff'
        b = io.BytesIO()
        f.save(b)
        _faces[key] = ("@font-face{font-family:'%s';src:url(data:font/woff;base64,%s) format('woff')}"
                       % (k, base64.b64encode(b.getvalue()).decode()))
    return _faces[key]


# ---- svg builder --------------------------------------------------------------
BASE_CSS = """
.tw{animation:tw 4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.12}50%{opacity:.95}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
.breathe{animation:breathe 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes breathe{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
.spin{animation:spin 60s linear infinite;transform-box:fill-box;transform-origin:center}
.spinr{animation:spin 80s linear infinite reverse;transform-box:fill-box;transform-origin:center}
@keyframes spin{to{transform:rotate(360deg)}}
.sweep{animation:sweep 7s cubic-bezier(.4,0,.2,1) infinite}
@keyframes sweep{0%{transform:translateX(-120%)}22%,100%{transform:translateX(220%)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
"""

COMMON_DEFS = f"""
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".085"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
<linearGradient id="ghi" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="gbtn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{SOFT}"/><stop offset=".3" stop-color="{LIME}"/><stop offset=".68" stop-color="{ACCENT}"/><stop offset="1" stop-color="{DEEP}"/></linearGradient>
<linearGradient id="gi" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24"><stop offset="0" stop-color="{SOFT}"/><stop offset=".5" stop-color="{LIME}"/><stop offset="1" stop-color="{ACCENT}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="{ACCENT}" stop-opacity=".55"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>
<radialGradient id="glowl"><stop offset="0" stop-color="{LIME}" stop-opacity=".55"/><stop offset="1" stop-color="{LIME}" stop-opacity="0"/></radialGradient>
<radialGradient id="glowd"><stop offset="0" stop-color="{DEEP}" stop-opacity=".5"/><stop offset="1" stop-color="{DEEP}" stop-opacity="0"/></radialGradient>
<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="{BG}" stop-opacity="0"/><stop offset="1" stop-color="{BG}" stop-opacity=".75"/></radialGradient>
"""


class Svg:
    def __init__(self, w, h, label, frame=True, rx=28):
        self.w, self.h, self.label, self.frame, self.rx = w, h, label, frame, rx
        self.defs, self.body, self.css = [], [], [BASE_CSS]
        self.chars = defaultdict(set)
        self.n = 0

    def uid(self, p='u'):
        self.n += 1
        return f'{p}{self.n}'

    def add(self, *parts):
        self.body.extend(parts)

    def style(self, css):
        self.css.append(css)

    def text(self, x, y, s, k='i400', size=16, fill=IVORY, op=None, anchor=None, ls=None, extra=''):
        pieces = s if isinstance(s, list) else [(s, '')]
        inner = []
        for t, attrs in pieces:
            self.chars[k].update(t)
            inner.append(f'<tspan {attrs}>{escape(t)}</tspan>' if attrs else escape(t))
        a = f'x="{x:g}" y="{y:g}" font-family="{k}, sans-serif" font-size="{size:g}" fill="{fill}"'
        if op is not None:
            a += f' fill-opacity="{op}"'
        if anchor:
            a += f' text-anchor="{anchor}"'
        if ls:
            a += f' letter-spacing="{ls:g}"'
        return f'<text {a} {extra}>{"".join(inner)}</text>'

    def micro(self, x, y, s, anchor=None, op=.62, fill=MIST, size=11):
        return self.text(x, y, s.upper(), 'i600', size, fill, op=op, anchor=anchor, ls=1.9)

    def tgrad(self, x0, x1, shimmer=True):
        gid = self.uid('tg')
        anim = (f'<animateTransform attributeName="gradientTransform" type="translate" '
                f'values="0 0;{(x1 - x0) * .55:.0f} 0;0 0" dur="8s" repeatCount="indefinite"/>') if shimmer else ''
        self.defs.append(
            f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x0:.0f}" y1="0" x2="{x1:.0f}" y2="0" spreadMethod="reflect">'
            f'<stop offset="0" stop-color="{SOFT}"/><stop offset=".38" stop-color="{LIME}"/>'
            f'<stop offset=".8" stop-color="{ACCENT}"/><stop offset="1" stop-color="#2fae4c"/>{anim}</linearGradient>')
        return gid

    def heading(self, x, y, lines, size=50, lh=None, anchor=None, k='q700'):
        """lines: list of strings; wrap a word in *asterisks* to give it the flame gradient."""
        lh = lh or size * 1.12
        out = []
        for i, line in enumerate(lines):
            parts = re.split(r'(\*[^*]+\*)', line)
            pieces, cx = [], 0
            total = tw(line.replace('*', ''), k, size, -1)
            start = x - total / 2 if anchor == 'middle' else x
            for p in parts:
                if not p:
                    continue
                if p.startswith('*'):
                    t = p[1:-1]
                    g = self.tgrad(start + cx, start + cx + tw(t, k, size))
                    pieces.append((t, f'fill="url(#{g})"'))
                    cx += tw(t, k, size, -1)
                else:
                    pieces.append((p, ''))
                    cx += tw(p, k, size, -1)
            out.append(self.text(x, y + i * lh, pieces, k, size, IVORY, anchor=anchor, ls=-1))
        return ''.join(out)

    def para(self, x, y, s, maxw, size=16, lh=None, op=.74, k='i400', anchor=None, fill=MIST):
        lh = lh or size * 1.6
        lines = wrap(s, k, size, maxw)
        return ''.join(self.text(x, y + i * lh, ln, k, size, fill, op=op, anchor=anchor) for i, ln in enumerate(lines)), len(lines) * lh

    def glass(self, x, y, w, h, r=20, tint=.6, edge=.13, cls=''):
        c = f' class="{cls}"' if cls else ''
        return (f'<g{c}><rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{r}" fill="{RAISED}" fill-opacity="{tint}"/>'
                f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{r}" fill="url(#glass)" stroke="#fff" stroke-opacity="{edge}"/>'
                f'<rect x="{x + r:g}" y="{y:g}" width="{w - 2 * r:g}" height="1" fill="url(#ghi)"/></g>')

    def pill(self, x, y, label, anchor='start'):
        w, h = tw(label, 'i600', 12.5) + 42, 30
        if anchor == 'middle':
            x -= w / 2
        return (f'<rect x="{x:g}" y="{y:g}" width="{w:.1f}" height="{h}" rx="15" fill="{ACCENT}" fill-opacity=".08" '
                f'stroke="{ACCENT}" stroke-opacity=".38"/>'
                f'<circle cx="{x + 15:g}" cy="{y + 15:g}" r="3.2" fill="{LIME}" class="pulse"/>'
                + self.text(x + 27, y + 19.6, label, 'i600', 12.5, IVORY))

    def button(self, cx, cy, label, h=54, size=17, primary=True, icon='right'):
        lw = tw(label, 'q700', size)
        w = lw + 92
        x, y = cx - w / 2, cy - h / 2
        cid = self.uid('bc')
        self.defs.append(f'<clipPath id="{cid}"><rect x="{x:g}" y="{y:g}" width="{w:.1f}" height="{h}" rx="{h / 2}"/></clipPath>')
        fg = ON if primary else IVORY
        out = []
        if primary:
            out.append(f'<ellipse cx="{cx:g}" cy="{cy + 12:g}" rx="{w * .62:.0f}" ry="{h:.0f}" fill="url(#glowl)" class="pulse" opacity=".7"/>')
            out.append(f'<rect x="{x:g}" y="{y:g}" width="{w:.1f}" height="{h}" rx="{h / 2}" fill="url(#gbtn)"/>')
            out.append(f'<rect x="{x + h / 2:g}" y="{y + 1:g}" width="{w - h:.1f}" height="1.2" fill="#fff" fill-opacity=".7"/>')
        else:
            out.append(self.glass(x, y, w, h, r=h / 2, edge=.22))
        out.append(f'<g clip-path="url(#{cid})"><rect class="sweep" x="{x:g}" y="{y - 10:g}" width="{w * .45:.0f}" height="{h + 20}" '
                   f'fill="url(#shine)" transform="skewX(-20)" style="transform-box:fill-box"/></g>')
        sx = cx - (lw + 26) / 2
        out.append(self.text(sx, cy + size * .36, label, 'q700', size, fg))
        out.append(icon_path(icon, sx + lw + 10, cy - 8, 16, fg, 2.1))
        return ''.join(out)

    def render(self):
        faces = ''.join(face(k, ''.join(sorted(c))) for k, c in sorted(self.chars.items()))
        body = ''.join(self.body)
        clip = ''
        if self.frame:
            clip = f'<clipPath id="frame"><rect width="{self.w}" height="{self.h}" rx="{self.rx}"/></clipPath>'
            body = (f'<g clip-path="url(#frame)"><rect width="{self.w}" height="{self.h}" fill="{BG}"/>{body}</g>'
                    f'<rect x=".5" y=".5" width="{self.w - 1}" height="{self.h - 1}" rx="{self.rx - .5}" fill="none" '
                    f'stroke="{MIST}" stroke-opacity=".12"/>')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
                f'viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" role="img" aria-label={quoteattr(self.label)}>'
                f'<title>{escape(self.label)}</title><defs><style>{faces}{"".join(self.css)}</style>{clip}{COMMON_DEFS}'
                f'{"".join(self.defs)}</defs>{body}</svg>')

    def save(self, name):
        path = os.path.join(OUT, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(self.render())
        print(f'{os.path.relpath(path, ROOT):48s} {os.path.getsize(path) / 1024:7.1f} KB')


# ---- drawing helpers ------------------------------------------------------------
def logo(x, y, h, fill=LIME, extra=''):
    s = h / 442
    return (f'<g transform="translate({x:g} {y:g}) scale({s:.5f}) translate(-500 -290)" fill="{fill}" {extra}>'
            + ''.join(f'<path d="{d}"/>' for d in LOGO) + '</g>')


def sparkle(x, y, size, fill=LIME, extra=''):
    return f'<path transform="translate({x:g} {y:g}) scale({size / 24:.4f})" d="{SPARKLE}" fill="{fill}" {extra}/>'


def icon_path(name, x, y, size, stroke='url(#gi)', sw=1.7):
    s = size / 24
    return (f'<path transform="translate({x:g} {y:g}) scale({s:.4f})" d="{ICONS[name]}" fill="none" stroke="{stroke}" '
            f'stroke-width="{sw / s:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')


def stars(n, box, seed, rmax=1.25, avoid=()):
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    out = []
    while len(out) < n:
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        if any(ax0 < x < ax1 and ay0 < y < ay1 for ax0, ay0, ax1, ay1 in avoid):
            continue
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(.35, rmax):.2f}" fill="{IVORY}" class="tw" '
                   f'style="animation-delay:-{rnd.uniform(0, 5):.1f}s;animation-duration:{rnd.uniform(2.5, 6):.1f}s"/>')
    return ''.join(out)


def flatten(d, steps=18):
    """Absolute M/L/C/Z path -> list of polygons."""
    toks = re.findall(r'[MLCZ]|-?\d+\.?\d*', d)
    polys, cur, pos, i = [], [], (0, 0), 0
    while i < len(toks):
        t = toks[i]
        if t == 'M':
            pos = (float(toks[i + 1]), float(toks[i + 2])); cur = [pos]; i += 3
        elif t == 'L':
            pos = (float(toks[i + 1]), float(toks[i + 2])); cur.append(pos); i += 3
        elif t == 'C':
            p = [pos] + [(float(toks[i + 1 + 2 * j]), float(toks[i + 2 + 2 * j])) for j in range(3)]
            for k in range(1, steps + 1):
                u = k / steps
                cur.append(tuple((1 - u) ** 3 * p[0][a] + 3 * (1 - u) ** 2 * u * p[1][a] + 3 * (1 - u) * u * u * p[2][a] + u ** 3 * p[3][a] for a in (0, 1)))
            pos = p[3]; i += 7
        elif t == 'Z':
            polys.append(cur); i += 1
        else:
            i += 1
    return polys


def logo_points(h, step, seed=3):
    """Points that fill the logo, scaled to height h, as (x, y) in logo-local px."""
    k = 4 * h / 442
    img = Image.new('L', (int(535 * k) + 2, int(442 * k) + 2), 0)
    dr = ImageDraw.Draw(img)
    for d in LOGO:
        for poly in flatten(d):
            dr.polygon([((px - 500) * k, (py - 290) * k) for px, py in poly], fill=255)
    a = np.asarray(img)
    rnd = random.Random(seed)
    pts = []
    y = step / 2
    while y < h:
        x = step / 2 + (step / 2 if int(y / step) % 2 else 0)
        while x < 535 * h / 442:
            jx, jy = x + rnd.uniform(-1.2, 1.2), y + rnd.uniform(-1.2, 1.2)
            if a[min(a.shape[0] - 1, int(jy * 4)), min(a.shape[1] - 1, int(jx * 4))] > 128:
                pts.append((jx, jy))
            x += step
        y += step * .87
    return pts


# ---- sections ---------------------------------------------------------------------
def hero():
    W, H = 1200, 740
    s = Svg(W, H, 'Apheleia — Ideas to Impact. We design and build digital products that feel effortless: '
                  'simple on the surface, engineered to scale underneath.')
    s.style("""
.sl{animation:twist 10s linear infinite;animation-delay:var(--d);transform-box:fill-box;transform-origin:center}
.ff{animation:face 10s linear infinite;animation-delay:var(--d)}
@keyframes twist{0%{transform:scaleX(1)}12.5%{transform:scaleX(.72)}25%{transform:scaleX(.06)}37.5%{transform:scaleX(.72)}50%{transform:scaleX(1)}62.5%{transform:scaleX(.72)}75%{transform:scaleX(.06)}87.5%{transform:scaleX(.72)}100%{transform:scaleX(1)}}
@keyframes face{0%,24.9%{opacity:1}25%,74.9%{opacity:0}75%,100%{opacity:1}}
.flow{animation:flow 5s linear infinite}
@keyframes flow{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
.hot{animation:hot 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes hot{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.15);opacity:1}}
.rise{animation:rise 1.2s cubic-bezier(.2,.7,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
""")
    rnd = random.Random(11)
    s.add(f'<ellipse cx="260" cy="440" rx="420" ry="260" fill="url(#glowd)" opacity=".5"/>')
    s.add(stars(90, (0, 0, W, H), 5, avoid=[(60, 100, 760, 300)]))

    # energy strands: a bundle falling from the top, pinched to a white-hot point, then fanning out
    paths = []
    n = 46
    for i in range(n):
        t = i / (n - 1)
        p0 = (470 + t * 300, -30)
        c1 = (p0[0] - 70, 190 + 30 * t)
        c2 = (200 + 46 * t, 300 + 12 * t)
        p1 = (232 + 18 * t, 432 + 5 * t)
        c3 = (2 * p1[0] - c2[0], 2 * p1[1] - c2[1])
        c4 = (350 + 170 * t, 650)
        p2 = (400 + 330 * t, H + 30)
        paths.append('M{:.0f} {:.0f}C{:.0f} {:.0f} {:.0f} {:.0f} {:.0f} {:.0f}C{:.0f} {:.0f} {:.0f} {:.0f} {:.0f} {:.0f}'.format(
            *p0, *c1, *c2, *p1, *c3, *c4, *p2))
    mid = paths[n // 2]
    s.add(f'<g fill="none" stroke-linecap="round"><path d="{mid}" stroke="{LIME}" stroke-width="90" stroke-opacity=".035"/>'
          f'<path d="{mid}" stroke="{LIME}" stroke-width="34" stroke-opacity=".05"/>'
          f'<path d="{mid}" stroke="{SOFT}" stroke-width="10" stroke-opacity=".08"/></g>')
    g = ['<g fill="none">']
    for i, d in enumerate(paths):
        t = i / (n - 1)
        col = LIME if t < .42 else SOFT if t < .58 else ACCENT
        g.append(f'<path d="{d}" stroke="{col}" stroke-width=".9" stroke-opacity="{.1 + .5 * math.sin(math.pi * t):.2f}"/>')
    for i in rnd.sample(range(n), 14):
        g.append(f'<path d="{paths[i]}" pathLength="1000" stroke="{SOFT}" stroke-width="1.8" stroke-linecap="round" '
                 f'stroke-dasharray="28 972" class="flow" style="animation-delay:-{rnd.uniform(0, 5):.2f}s;'
                 f'animation-duration:{rnd.uniform(3.2, 6):.1f}s"/>')
    g.append('</g>')
    s.add(''.join(g))

    # twisting glass ribbon
    PAL = ['#c9f57a', None, None, '#e2f7b8', LIME, None, None, ACCENT, '#7fe06a', None, LIME, '#c9f57a', None, None, ACCENT]
    rib = ['<g>']
    n = 122
    for i in range(n):
        x = -26 + i * 10.3
        ph = x / W
        yc = 470 + 36 * math.sin(2 * math.pi * ph * 1.1 + .7)
        slope = 36 * 2 * math.pi * 1.1 / W * math.cos(2 * math.pi * ph * 1.1 + .7)
        ang = -9 + math.degrees(math.atan(slope)) * 1.4 + 7 * math.sin(ph * 6.5)
        hh = 148 + 20 * math.sin(ph * 5 + 1)
        col = PAL[int((x + 60) // 82) % len(PAL)]
        d = -(i / n) * 10 * 1.7
        face_ = (f'<rect class="ff" x="-4.7" y="{-hh / 2:.1f}" width="9.4" height="{hh:.1f}" rx="1.8" fill="{col}" fill-opacity=".92"/>'
                 f'<rect class="ff" x="-4.7" y="{-hh / 2:.1f}" width="1.3" height="{hh:.1f}" fill="#fff" fill-opacity=".6"/>') if col else \
            (f'<rect class="ff" x="-4.7" y="{-hh / 2:.1f}" width="9.4" height="{hh:.1f}" rx="1.8" fill="#24352a" fill-opacity=".9" '
             f'stroke="#fff" stroke-opacity=".28" stroke-width=".6"/>')
        rib.append(f'<g transform="translate({x:.1f} {yc:.1f}) rotate({ang:.1f})"><g class="sl" style="--d:{d:.2f}s">'
                   f'<rect x="-4.7" y="{-hh / 2:.1f}" width="9.4" height="{hh:.1f}" rx="1.8" fill="#0b140e" '
                   f'stroke="#fff" stroke-opacity=".16" stroke-width=".6"/>{face_}</g></g>')
    rib.append('</g>')
    s.add(''.join(rib))

    # the white-hot point where the strands pinch
    s.defs.append(f'<radialGradient id="hs"><stop offset="0" stop-color="#fff"/><stop offset=".12" stop-color="{SOFT}" stop-opacity=".9"/>'
                  f'<stop offset=".38" stop-color="{LIME}" stop-opacity=".35"/><stop offset="1" stop-color="{LIME}" stop-opacity="0"/></radialGradient>')
    s.add(f'<g style="mix-blend-mode:screen"><circle cx="242" cy="436" r="150" fill="url(#hs)" class="hot"/>'
          f'<ellipse cx="242" cy="436" rx="115" ry="2.4" fill="#fff" opacity=".4" class="pulse"/></g>')
    s.add(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')

    for x, y, v in [(505, 335, '159'), (850, 318, '203'), (950, 352, '261'), (1110, 366, '397')]:
        s.add(s.text(x, y, v, 'i600', 10, MIST, op=.35, ls=.5))

    # copy
    s.add('<g class="rise">' + s.micro(80, 92, '001 — 004') + '</g>')
    ts = 94
    w1, w2 = tw('Ideas to ', 'q700', ts, -2), tw('Impact.', 'q700', ts, -2)
    s.add(f'<ellipse cx="{80 + w1 + w2 / 2:.0f}" cy="170" rx="{w2 * .7:.0f}" ry="80" fill="url(#glowl)" opacity=".22"/>')
    gid = s.tgrad(80 + w1, 80 + w1 + w2)
    s.add('<g class="rise" style="animation-delay:.1s">'
          + s.text(80, 202, [('Ideas to ', ''), ('Impact.', f'fill="url(#{gid})"')], 'q700', ts, IVORY, ls=-2) + '</g>')
    s.add('<g class="rise" style="animation-delay:.25s">' + s.pill(80, 252, 'Crafting digital simplicity') + '</g>')
    lines = wrap('At Apheleia, we design and build digital products that feel effortless — simple on the surface, '
                 'engineered to scale underneath.', 'i400', 15, 258)
    card = s.glass(822, 86, 298, 44 + 24 * len(lines))
    card += ''.join(s.text(842, 119 + i * 24, ln, 'i400', 15, MIST, op=.82) for i, ln in enumerate(lines))
    s.add(f'<g class="rise" style="animation-delay:.2s">{card}</g>')

    q = 'Have an idea worth building? Let’s give it shape.'
    qw = tw(q, 'i500', 16) + 52
    s.add(s.glass(600 - qw / 2, 568, qw, 46, r=23, edge=.2) + s.text(600, 597, q, 'i500', 16, IVORY, op=.88, anchor='middle'))
    s.add(s.button(600, 654, 'Start a Project'))
    s.add(icon_path('down', 80, 704, 14, IVORY, 1.8) + s.micro(102, 715, 'Discover more', op=.9, fill=IVORY))
    s.add(s.micro(1120, 715, 'Tamil Nadu, India — Est. 2026', anchor='end', op=.5))
    s.save('hero.svg')


def marquee():
    W, H = 1200, 212
    s = Svg(W, H, 'Discover, Design, Develop, Launch, Refine, Repeat. Ideas to impact, product design, engineering, '
                  'system architecture, brand and strategy, simplicity at scale.')
    s.add(f'<ellipse cx="600" cy="100" rx="520" ry="120" fill="url(#glowd)" opacity=".6"/>')
    s.add(stars(30, (0, 0, W, H), 9))

    def band(items, k, size, color, sep, gap=64):
        parts, x = [], 0
        for it in items:
            parts.append(s.text(x, 0, it, k, size, color))
            x += tw(it, k, size)
            parts.append(sparkle(x + gap / 2 - 8, -size * .36 - 8, 16, sep))
            x += gap
        return ''.join(parts), x

    for idx, (items, k, cy, rot, fill, col, sep, speed, rev) in enumerate([
        (['Discover', 'Design', 'Develop', 'Launch', 'Refine', 'Repeat'], 'q700', 60, -1.3, None, IVORY, LIME, 70, False),
        (['Ideas to impact', 'Product design', 'Engineering', 'System architecture', 'Brand & strategy', 'Simplicity at scale'],
         'q700', 152, 1.3, 'url(#gbtn)', ON, ON, 55, True),
    ]):
        content, period = band(items, k, 26, col, sep)
        copies = math.ceil((W + 200) / period) + 1
        name = f'mq{idx}'
        frm, to = (f'translateX(-{period:.1f}px)', 'translateX(0)') if rev else ('translateX(0)', f'translateX(-{period:.1f}px)')
        s.style(f'@keyframes {name}{{from{{transform:{frm}}}to{{transform:{to}}}}}')
        bg = (s.glass(-80, cy - 29, W + 160, 58, r=0, tint=.75, edge=.16) if fill is None else
              f'<rect x="-80" y="{cy - 29}" width="{W + 160}" height="58" fill="{fill}"/>'
              f'<rect x="-80" y="{cy - 29}" width="{W + 160}" height="1.2" fill="#fff" fill-opacity=".6"/>')
        row = ''.join(f'<g transform="translate({-100 + c * period:.1f} {cy + 9.5})">{content}</g>' for c in range(copies))
        s.add(f'<g transform="rotate({rot} 600 {cy})">{bg}<g style="animation:{name} {period / speed:.1f}s linear infinite">{row}</g></g>')
    s.save('marquee.svg')


def odometer(s, x, y, digits, size=46, lh=54, delay=0.0):
    dw = tw('0', 'q700', size) + 1
    cid = s.uid('oc')
    s.defs.append(f'<clipPath id="{cid}"><rect x="{x - 4:g}" y="{y - size * .86:.0f}" width="{dw * len(digits) + 8:.0f}" height="{size * 1.08:.0f}"/></clipPath>')
    out, cx = [], x
    for j, ch in enumerate(digits):
        d = int(ch)
        seq = list(range(10)) + list(range(d + 1))
        name = s.uid('od')
        s.style(f'@keyframes {name}{{0%{{transform:translateY(0)}}26%,100%{{transform:translateY(-{(len(seq) - 1) * lh}px)}}}}')
        col = ''.join(s.text(cx + dw / 2, y + k * lh, str(v), 'q700', size, IVORY, anchor='middle') for k, v in enumerate(seq))
        out.append(f'<g style="animation:{name} 10s cubic-bezier(.2,.75,.15,1) {delay + j * .15:.2f}s infinite both">{col}</g>')
        cx += dw
    return f'<g clip-path="url(#{cid})">{"".join(out)}</g>'


def about():
    W, H = 1200, 620
    s = Svg(W, H, 'About Apheleia — a creative studio for what’s next. A creative technology studio from Tamil Nadu, India: '
                  'designers, engineers and strategists building digital products that feel effortless — and the systems and '
                  'automations that keep them that way at scale.')
    s.add(stars(40, (0, 0, W, H), 21))
    s.add(f'<ellipse cx="300" cy="320" rx="330" ry="300" fill="url(#glowd)" opacity=".7"/>')
    # stage
    s.add(s.glass(60, 60, 480, 500, r=26, tint=.5))
    sc = s.uid('st')
    s.defs.append(f'<clipPath id="{sc}"><rect x="60" y="60" width="480" height="500" rx="26"/></clipPath>')
    s.add(s.micro(88, 100, 'The mark'))
    for (x, y, dx, dy) in [(84, 120, 1, 1), (516, 500, -1, -1)]:
        s.add(f'<path d="M{x} {y + 22 * dy}V{y}H{x + 22 * dx}" fill="none" stroke="{LIME}" stroke-opacity=".6" stroke-width="1.5"/>')
    s.add(f'<g clip-path="url(#{sc})">'
          f'<circle cx="300" cy="320" r="150" fill="url(#glowl)" opacity=".28" class="breathe"/>'
          f'<circle cx="300" cy="320" r="190" fill="none" stroke="{MIST}" stroke-opacity=".14" stroke-dasharray="2 9" class="spin"/>'
          f'<circle cx="300" cy="320" r="222" fill="none" stroke="{LIME}" stroke-opacity=".12" stroke-dasharray="60 30 4 30" class="spinr"/>')
    lh = 250
    lw = 535 * lh / 442
    ox, oy = 300 - lw / 2, 320 - lh / 2
    rnd = random.Random(4)
    parts = []
    for (px, py) in logo_points(lh, 8.6):
        ang, rad = rnd.uniform(0, 2 * math.pi), rnd.uniform(120, 330)
        dx, dy = math.cos(ang) * rad, math.sin(ang) * rad
        ang2, rad2 = rnd.uniform(0, 2 * math.pi), rnd.uniform(80, 260)
        ex, ey = math.cos(ang2) * rad2, math.sin(ang2) * rad2
        a = rnd.uniform(.2, .36)
        col = rnd.choice([LIME, LIME, LIME, ACCENT, ACCENT, SOFT])
        parts.append(
            f'<circle cx="{ox + px:.1f}" cy="{oy + py:.1f}" r="{rnd.uniform(1.4, 2.7):.1f}" fill="{col}">'
            f'<animateTransform attributeName="transform" type="translate" values="{dx:.0f} {dy:.0f};0 0;0 0;{ex:.0f} {ey:.0f}" '
            f'keyTimes="0;{a:.2f};.82;1" calcMode="spline" keySplines=".2 .8 .2 1;0 0 1 1;.6 0 .9 .5" dur="11s" repeatCount="indefinite"/>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;{a:.2f};.84;1" dur="11s" repeatCount="indefinite"/></circle>')
    s.add(''.join(parts) + '</g>')

    # copy
    s.add(s.pill(620, 92, 'About Apheleia'))
    s.add(s.heading(620, 186, ['A creative studio', 'for *what’s next.*'], size=52))
    p, ph = s.para(620, 290, 'Apheleia is a creative technology studio from Tamil Nadu, India. We’re designers, engineers and '
                              'strategists building digital products that feel effortless — and the systems and automations '
                              'that keep them that way at scale.', 500, size=17, lh=28)
    s.add(p)
    s.add(s.glass(620, 436, 520, 124, r=22))
    for i, (val, label) in enumerate([('05', 'Core disciplines'), ('2026', 'Founded in Tamil Nadu')]):
        x = 666 + i * 250
        if i:
            s.add(f'<rect x="{x - 18}" y="458" width="1" height="80" fill="{MIST}" fill-opacity=".12"/>')
        s.add(odometer(s, x, 508, val, delay=i * .25))
        s.add(s.micro(x, 538, label, op=.55, size=10))
    s.save('about.svg')


def process():
    W, H = 1200, 660
    s = Svg(W, H, 'Our process — a simple process, a powerful outcome. 01 Discover: every great product starts fluid. '
                  '02 Design: then we give it structure. 03 Develop: every piece lands where it belongs. '
                  '04 Launch: shipped, measured, improving.')
    s.style("""
.act{opacity:0;animation:act 8s ease-in-out infinite}
@keyframes act{0%{opacity:0}5%,22%{opacity:1}30%,100%{opacity:0}}
.trav{animation:trav 8s cubic-bezier(.45,0,.55,1) infinite}
@keyframes trav{0%{transform:translateX(0);opacity:0}4%{opacity:1}75%{transform:translateX(825px);opacity:1}86%,100%{transform:translateX(825px);opacity:0}}
.fill{animation:fill 8s cubic-bezier(.45,0,.55,1) infinite;transform-box:fill-box;transform-origin:left center}
@keyframes fill{0%{transform:scaleX(0);opacity:1}75%{transform:scaleX(1);opacity:1}88%,100%{transform:scaleX(1);opacity:0}}
""")
    s.add(stars(36, (0, 0, W, H), 31))
    s.add(f'<ellipse cx="900" cy="80" rx="420" ry="200" fill="url(#glowd)" opacity=".7"/>')
    s.add(s.pill(60, 64, 'Our Process'))
    s.add(s.heading(60, 156, ['A simple process.', 'A *powerful outcome.*'], size=50))
    p, _ = s.para(700, 140, 'From first conversation to launch, we keep things clear and seamless — and every step builds '
                             'on the last.', 440, size=17, lh=28)
    s.add(p)
    steps = [
        ('search', 'Discover', 'Every great product starts fluid.',
         'We dig into your goals, users and constraints until the shape of the idea comes into focus.'),
        ('pen', 'Design', 'Then we give it structure.', 'Systems, flows and interfaces — laid out on a grid and designed for ease.'),
        ('code', 'Develop', 'Every piece lands where it belongs.', 'Resilient code and clean architecture, assembled with precision.'),
        ('rocket', 'Launch', 'Shipped. Measured. Improving.', 'We go live, watch what matters, and keep refining as you grow.'),
    ]
    cw, gap, top = 255, 20, 330
    xs = [60 + i * (cw + gap) for i in range(4)]
    cxs = [x + cw / 2 for x in xs]
    ty = 285
    s.add(f'<line x1="{cxs[0]}" y1="{ty}" x2="{cxs[3]}" y2="{ty}" stroke="{MIST}" stroke-opacity=".18" stroke-dasharray="3 6"/>')
    s.add(f'<rect class="fill" x="{cxs[0]}" y="{ty - 1}" width="{cxs[3] - cxs[0]}" height="2" fill="url(#gbtn)"/>')
    for i, (ic, step, title, body) in enumerate(steps):
        x = xs[i]
        s.add(s.glass(x, top, cw, 290, r=22))
        s.add(f'<g class="act" style="animation-delay:{i * 2}s">'
              f'<rect x="{x}" y="{top}" width="{cw}" height="290" rx="22" fill="{ACCENT}" fill-opacity=".06" stroke="{LIME}" stroke-opacity=".55"/>'
              f'<circle cx="{cxs[i]}" cy="{ty}" r="16" fill="url(#glowl)"/></g>')
        s.add(f'<circle cx="{cxs[i]}" cy="{ty}" r="6.5" fill="{BG}" stroke="{LIME}" stroke-opacity=".7" stroke-width="1.5"/>')
        s.add(f'<line x1="{cxs[i]}" y1="{ty + 7}" x2="{cxs[i]}" y2="{top}" stroke="{MIST}" stroke-opacity=".12"/>')
        s.add(s.micro(x + 24, top + 40, f'0{i + 1} — {step}', op=.7))
        s.add(f'<rect x="{x + 22}" y="{top + 58}" width="44" height="44" rx="13" fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".12"/>')
        s.add(icon_path(ic, x + 31, top + 67, 26))
        tl = wrap(title, 'q700', 21, cw - 46)
        s.add(''.join(s.text(x + 24, top + 136 + j * 26, ln, 'q700', 21, IVORY) for j, ln in enumerate(tl)))
        p, _ = s.para(x + 24, top + 136 + len(tl) * 26 + 16, body, cw - 46, size=14.5, lh=22, op=.68)
        s.add(p)
    s.add(f'<g class="trav"><circle cx="{cxs[0]}" cy="{ty}" r="22" fill="url(#glowl)"/><circle cx="{cxs[0]}" cy="{ty}" r="4.5" fill="#fff"/></g>')
    s.save('process.svg')


def services():
    W, H = 1200, 800
    s = Svg(W, H, 'Our services — end-to-end solutions for your digital journey. UI/UX Design, Web & App Development, '
                  'System Architecture, Automation, Brand & Strategy.')
    s.style("""
.hx{animation:hx 7s ease-in-out infinite;animation-delay:var(--d)}
@keyframes hx{0%,100%{transform:translateY(-120px)}50%{transform:translateY(120px)}}
.hd{animation:hd 7s ease-in-out infinite;animation-delay:var(--e)}
@keyframes hd{0%,100%{opacity:.15}50%{opacity:1}}
.rg{animation:rg 7s ease-in-out infinite;animation-delay:var(--d);transform-box:fill-box;transform-origin:center}
@keyframes rg{0%,100%{transform:scaleY(1)}50%{transform:scaleY(-1)}}
""")
    s.add(stars(40, (0, 0, W, H), 41))
    # DNA helix weaving behind the cards
    cy = H // 2
    helix = ['<g>']
    for i in range(64):
        x = -10 + i * 19.5
        d = -(i / 64) * 7 * 2.2
        if i % 3 == 0:
            helix.append(f'<rect class="rg" style="--d:{d:.2f}s" x="{x - .5:.1f}" y="{cy - 120}" width="1" height="240" '
                         f'fill="{ACCENT}" fill-opacity=".14"/>')
        for k, off in enumerate((0, -3.5)):
            col = LIME if k == 0 else ACCENT
            helix.append(f'<g class="hx" style="--d:{d + off:.2f}s"><circle class="hd" style="--e:{d + off + 1.75:.2f}s" '
                         f'cx="{x:.1f}" cy="{cy}" r="{3.2 if k == 0 else 2.6}" fill="{col}"/></g>')
    helix.append('</g>')
    s.add(''.join(helix))
    s.add(f'<rect x="0" y="0" width="450" height="{H}" fill="{BG}" fill-opacity=".55"/>')

    s.add(s.pill(60, 70, 'Our Services'))
    s.add(s.heading(60, 160, ['End-to-end', 'solutions for your', '*digital journey.*'], size=46))
    p, _ = s.para(60, 330, 'From strategy to scale, we’ve got you covered.', 340, size=17, lh=28)
    s.add(p)
    s.add(s.text(60, 400, 'Discuss your project', 'i600', 15, LIME) + icon_path('right', 60 + tw('Discuss your project', 'i600', 15) + 8, 388, 16, LIME, 2))
    cards = [
        ('design', 'UI/UX Design', 'Intuitive interfaces and design systems that make complex things feel simple.'),
        ('code', 'Web & App Development', 'Fast, scalable and secure products built on modern stacks.'),
        ('nodes', 'System Architecture', 'Resilient backends, clean APIs and infrastructure that grows with you.'),
        ('automation', 'Automation', 'Workflows, integrations and AI agents that cut out repetitive work.'),
        ('compass', 'Brand & Strategy', 'Positioning, voice and identity grounded in purpose.'),
    ]
    for i, (ic, title, body) in enumerate(cards):
        x, y = 470 + (i % 2) * 345, 36 + (i // 2) * 250
        w, h = (670 if i == 4 else 325), 232
        cid = s.uid('sc')
        s.defs.append(f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22"/></clipPath>')
        s.add(s.glass(x, y, w, h, r=22, tint=.72))
        s.add(f'<g clip-path="url(#{cid})"><circle cx="{x + w - 30}" cy="{y + 20}" r="120" fill="url(#glow)" opacity=".35" class="breathe" '
              f'style="animation-delay:-{i * 1.5}s"/>'
              f'<rect class="sweep" style="animation-delay:{i * .5}s;transform-box:fill-box" x="{x}" y="{y - 20}" width="140" height="{h + 40}" '
              f'fill="url(#shine)" transform="skewX(-18)"/></g>')
        s.add(f'<rect x="{x + 24}" y="{y + 24}" width="52" height="52" rx="15" fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".14"/>')
        s.add(icon_path(ic, x + 34, y + 34, 32))
        s.add(s.micro(x + w - 24, y + 48, f'0{i + 1}', anchor='end', op=.4))
        s.add(s.text(x + 24, y + 112, title, 'q700', 22, IVORY))
        p, _ = s.para(x + 24, y + 140, body, w - 48, size=15, lh=22, op=.7)
        s.add(p)
        s.add(s.text(x + 24, y + h - 26, 'Learn more', 'i600', 14, LIME) + icon_path('right', x + 24 + tw('Learn more', 'i600', 14) + 6, y + h - 38, 15, LIME, 2))
    s.save('services.svg')


def team_header(people):
    W, H = 1200, 330
    s = Svg(W, H, 'The team — the people behind Apheleia: ' + ', '.join(p[0] for p in people) + '.')
    s.add(stars(50, (0, 0, W, H), 51))
    s.add(f'<ellipse cx="600" cy="330" rx="520" ry="170" fill="url(#glowd)" opacity=".9"/>')
    s.add(f'<ellipse cx="600" cy="330" rx="300" ry="70" fill="url(#glowl)" opacity=".22" class="breathe"/>')
    s.add(s.pill(600, 64, 'The Team', anchor='middle'))
    s.add(s.heading(600, 166, ['The minds behind *Apheleia.*'], size=58, anchor='middle'))
    p, _ = s.para(600, 214, 'Seven co-founders from Tamil Nadu — designers, engineers and strategists with one obsession: '
                             'making complex things feel simple.', 660, size=17, lh=28, anchor='middle')
    s.add(p)
    # avatar rail
    n = len(people)
    x0 = 600 - (n - 1) * 34 / 2
    for i in range(n):
        s.add(f'<circle cx="{x0 + i * 34:.0f}" cy="290" r="4" fill="{LIME if i % 2 == 0 else ACCENT}" class="pulse" '
              f'style="animation-delay:{i * .25}s"/>')
    s.add(f'<line x1="{x0 - 30:.0f}" y1="290" x2="{x0 + (n - 1) * 34 + 30:.0f}" y2="290" stroke="{MIST}" stroke-opacity=".12"/>')
    s.save('team.svg')


def portrait(path, size=(540, 720)):
    im = ImageOps.exif_transpose(Image.open(path)).convert('L')
    W, H = im.size
    a = np.asarray(im)
    dark = a < 90
    top = int(np.argmax(dark.sum(1) > 0.03 * W))
    cx = float(np.nonzero(dark[top: top + int(.12 * H)])[1].mean())
    xs = np.nonzero(dark[top + int(.04 * H): top + int(.08 * H)])[1]
    hw = float(np.percentile(xs, 97) - np.percentile(xs, 3))
    cw = min(W, hw * 2.9)
    ch = cw * 4 / 3
    if ch > H:
        ch, cw = H, H * 3 / 4
    y0 = min(max(0, top - .3 * hw), H - ch)
    x0 = min(max(0, cx - cw / 2), W - cw)
    im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize(size, Image.LANCZOS)
    lo, hi = (3, 5, 3), (238, 244, 236)
    bands = [im.point([round(lo[c] + (hi[c] - lo[c]) * (v / 255) ** 1.08) for v in range(256)]) for c in range(3)]
    buf = io.BytesIO()
    Image.merge('RGB', bands).save(buf, 'JPEG', quality=80, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode()


def team_card(i, total, name, email, b64):
    w, h = 360, 480
    s = Svg(w, h, f'{name}, co-founder — {email}', rx=24)
    s.style(f"""
.kb{{animation:kb 14s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 30%}}
@keyframes kb{{from{{transform:scale(1)}}to{{transform:scale(1.06)}}}}
.scan{{animation:scan 8s cubic-bezier(.5,0,.5,1) infinite;animation-delay:{i * 1.1:.1f}s;opacity:0}}
@keyframes scan{{0%{{transform:translateY(0);opacity:0}}3%{{opacity:1}}28%{{transform:translateY({h + 70}px);opacity:1}}29%,100%{{opacity:0;transform:translateY({h + 70}px)}}}}
.comet{{animation:comet 7s linear infinite;animation-delay:-{i * 1.3:.1f}s}}
@keyframes comet{{from{{stroke-dashoffset:1000}}to{{stroke-dashoffset:0}}}}
""")
    s.defs.append(f'<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BG}" stop-opacity="0"/>'
                  f'<stop offset=".55" stop-color="{BG}" stop-opacity=".82"/><stop offset="1" stop-color="{BG}" stop-opacity=".97"/></linearGradient>'
                  f'<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{LIME}" stop-opacity="0"/>'
                  f'<stop offset="1" stop-color="{LIME}" stop-opacity=".28"/></linearGradient>'
                  f'<linearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{SOFT}"/><stop offset=".5" stop-color="{LIME}"/>'
                  f'<stop offset="1" stop-color="{ACCENT}"/></linearGradient>')
    s.add(f'<image class="kb" xlink:href="data:image/jpeg;base64,{b64}" x="0" y="0" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>')
    s.add(f'<rect y="{h * .5:.0f}" width="{w}" height="{h * .5:.0f}" fill="url(#fade)"/>')
    s.add(f'<g class="scan"><rect x="0" y="-70" width="{w}" height="70" fill="url(#beam)" style="mix-blend-mode:screen"/>'
          f'<rect x="0" y="-1.5" width="{w}" height="1.5" fill="{LIME}"/></g>')
    chip = f'{i + 1:02d} / {total:02d}'
    cw_ = tw(chip, 'i600', 11, 1.9) + 26
    s.add(f'<rect x="18" y="18" width="{cw_:.0f}" height="28" rx="14" fill="{BG}" fill-opacity=".6" stroke="#fff" stroke-opacity=".2"/>')
    s.add(s.micro(31, 36.5, chip, op=.95, fill=IVORY))
    s.add(f'<circle cx="{w - 34}" cy="32" r="16" fill="{BG}" fill-opacity=".7" stroke="#fff" stroke-opacity=".2"/>' + logo(w - 34 - 11, 23, 18))
    s.add(f'<rect x="24" y="{h - 118}" width="22" height="3" rx="1.5" fill="{LIME}"/>' + s.micro(54, h - 113, 'Co-founder', op=.85, fill=IVORY))
    size = 38 if tw(name, 'q700', 38) < w - 48 else 31
    s.add(s.text(24, h - 66, name, 'q700', size, IVORY, ls=-.5))
    s.add(icon_path('mail', 24, h - 46, 17, LIME, 1.8) + s.text(48, h - 32, email, 'i600', 16, LIME, op=.95))
    s.add(f'<rect x="1" y="1" width="{w - 2}" height="{h - 2}" rx="23" fill="none" stroke="url(#cm)" stroke-width="2.4" '
          f'pathLength="1000" stroke-dasharray="150 850" stroke-linecap="round" class="comet"/>')
    s.save(f'team/{name.lower()}.svg')


# ---- work art (ported from src/components/Work.jsx) -----------------------------
def art_kurinji(s):
    g1, g2, g3 = s.uid('k'), s.uid('k'), s.uid('k')
    s.defs.append(f'<radialGradient id="{g1}"><stop offset="0" stop-color="{ACCENT}" stop-opacity=".55"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>'
                  f'<linearGradient id="{g2}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{LIME}"/><stop offset="1" stop-color="{ACCENT}"/></linearGradient>'
                  f'<linearGradient id="{g3}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{LIME}" stop-opacity=".35"/><stop offset="1" stop-color="{LIME}" stop-opacity="0"/></linearGradient>')
    tiles = ''.join(f'<rect x="{166 + (i % 2) * 38}" y="{134 + (i // 2) * 38}" width="34" height="32" rx="7" fill="#fff" opacity=".06"/>' for i in range(4))
    rows = ''.join(f'<rect x="70" y="{212 + i * 24}" width="80" height="18" rx="6" fill="#fff" opacity=".05"/>'
                   f'<circle cx="80" cy="{221 + i * 24}" r="4" fill="{ACCENT}"/><rect x="90" y="{219 + i * 24}" width="34" height="4" rx="2" fill="#fff" opacity=".4"/>' for i in range(3))
    return f'''<rect width="300" height="345" fill="{RAISED}"/><circle cx="160" cy="140" r="160" fill="url(#{g1})" class="breathe"/>
<g transform="translate(0 -20)"><g class="bobA"><g transform="rotate(10 205 165)">
<rect x="150" y="50" width="104" height="212" rx="20" fill="{BG}" stroke="{SOFT}" stroke-opacity=".25"/>
<rect x="156" y="56" width="92" height="200" rx="15" fill="{NAVY}"/><rect x="166" y="78" width="72" height="44" rx="8" fill="url(#{g2})"/>
<rect x="174" y="108" width="30" height="4" rx="2" fill="#fff" opacity=".7"/>{tiles}<rect x="166" y="214" width="72" height="22" rx="11" fill="{ACCENT}"/></g></g>
<g class="bobB"><g transform="rotate(-12 110 190)">
<rect x="56" y="80" width="108" height="220" rx="21" fill="{BG}" stroke="{SOFT}" stroke-opacity=".3"/>
<rect x="62" y="86" width="96" height="208" rx="16" fill="{NAVY}"/><rect x="96" y="92" width="28" height="6" rx="3" fill="{BG}"/>
<rect x="72" y="112" width="38" height="4" rx="2" fill="#fff" opacity=".45"/><rect x="72" y="122" width="62" height="11" rx="3" fill="#fff" opacity=".9"/>
<path d="M70 186L84 176 96 181 110 164 124 170 138 152 150 156V200H70Z" fill="url(#{g3})"/>
<path d="M70 186L84 176 96 181 110 164 124 170 138 152 150 156" fill="none" stroke="{LIME}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100 100" class="draw"/>
{rows}</g></g></g>'''


def art_engine(s):
    g1, g2 = s.uid('e'), s.uid('e')
    s.defs.append(f'<radialGradient id="{g1}"><stop offset="0" stop-color="{ACCENT}" stop-opacity=".5"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>'
                  f'<linearGradient id="{g2}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{NAVY}"/><stop offset="1" stop-color="{BG}"/></linearGradient>')
    nodes = [(86, 118), (86, 176), (150, 102), (150, 146), (150, 190), (214, 120), (214, 172)]
    edges = [(0, 2), (0, 3), (1, 3), (1, 4), (2, 5), (3, 5), (3, 6), (4, 6)]
    hot = {(0, 3), (3, 5), (3, 6)}
    out = [f'<rect width="300" height="345" fill="{RAISED}"/><circle cx="150" cy="140" r="160" fill="url(#{g1})" class="breathe"/>',
           f'<rect x="34" y="50" width="232" height="156" rx="10" fill="{BG}" stroke="{SOFT}" stroke-opacity=".3"/>',
           f'<rect x="42" y="58" width="216" height="140" rx="5" fill="url(#{g2})"/>']
    out += [f'<circle cx="{x}" cy="68" r="2.3" fill="#fff" opacity=".25"/>' for x in (52, 60, 68)]
    for k, (a, b) in enumerate(edges):
        (x1, y1), (x2, y2) = nodes[a], nodes[b]
        h = (a, b) in hot
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LIME if h else SOFT}" stroke-width="{1.6 if h else 1.2}" stroke-opacity="{1 if h else .25}"/>')
        if h or k % 2:
            out.append(f'<path d="M{x1} {y1}L{x2} {y2}" pathLength="100" stroke="#fff" stroke-width="2.4" stroke-linecap="round" '
                       f'stroke-dasharray="10 90" class="flow2" style="animation-delay:-{k * .37:.2f}s" fill="none"/>')
    for i, (x, y) in enumerate(nodes):
        if i == 3:
            out.append(f'<circle cx="{x}" cy="{y}" r="18" fill="url(#glowl)" class="breathe"/><circle cx="{x}" cy="{y}" r="9" fill="{LIME}"/>')
        else:
            out.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{BG}" stroke="{LIME}" stroke-width="1.5"/>')
    out.append(f'<path d="M18 212H282L270 228H30Z" fill="{SLATE}"/><rect x="128" y="212" width="44" height="4" rx="2" fill="{BG}" opacity=".6"/>')
    return ''.join(out)


def art_idea(s):
    g1 = s.uid('i')
    s.defs.append(f'<radialGradient id="{g1}"><stop offset="0" stop-color="{ACCENT}" stop-opacity=".6"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>')
    out = [f'<rect width="300" height="345" fill="{RAISED}"/><circle cx="150" cy="140" r="150" fill="url(#{g1})" class="breathe"/>']
    for i, r in enumerate((36, 62, 90, 120, 152)):
        out.append(f'<circle cx="150" cy="140" r="{r}" fill="none" stroke="{SOFT}" stroke-opacity="{.22 - i * .03:.2f}"'
                   + (' stroke-dasharray="2 6"' if i % 2 else '') + '/>')
    for i in range(3):
        out.append(f'<circle cx="150" cy="140" r="40" fill="none" stroke="{LIME}" stroke-width="1.5" class="ring" style="animation-delay:{i * 1.3:.1f}s"/>')
    out.append(f'<g class="spin" style="animation-duration:24s"><path transform="translate(120 110) scale(2.5)" d="{SPARKLE}" fill="url(#gi)"/></g>')
    out.append(sparkle(222, 60, 14, SOFT, 'class="tw"') + sparkle(64, 196, 11, SOFT, 'class="tw" style="animation-delay:1.6s"'))
    return ''.join(out)


def work():
    W, H = 1200, 720
    s = Svg(W, H, 'Our work — ideas we’ve brought to life: Kurinji (mobile app, digital product), Grounding Engine '
                  '(platform, system architecture), and your idea next.')
    s.style("""
.bobA{animation:bob 6s ease-in-out infinite}
.bobB{animation:bob 6s ease-in-out infinite;animation-delay:-3s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.draw{animation:draw 6s ease-in-out infinite}
@keyframes draw{0%{stroke-dashoffset:100}40%,80%{stroke-dashoffset:0}100%{stroke-dashoffset:-100}}
.flow2{animation:flow2 2.2s linear infinite}
@keyframes flow2{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
.ring{animation:ring 3.9s ease-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}
@keyframes ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(3.4);opacity:0}}
""")
    s.add(stars(40, (0, 0, W, H), 61))
    s.add(f'<ellipse cx="600" cy="720" rx="640" ry="160" fill="url(#glowd)"/>')
    s.add(f'<ellipse cx="600" cy="690" rx="560" ry="18" fill="url(#glowl)" opacity=".35" class="pulse"/>')
    s.add(s.pill(60, 64, 'Our Work'))
    s.add(s.heading(60, 152, ['Ideas we’ve brought *to life.*'], size=50))
    p, _ = s.para(60, 196, 'A glimpse into what we’ve been building.', 500, size=17)
    s.add(p)
    s.add(s.micro(1140, 196, '01 / 03', anchor='end', op=.5))
    projects = [(art_kurinji, 'Kurinji', 'Mobile app · Digital product'),
                (art_engine, 'Grounding Engine', 'Platform · System architecture'),
                (art_idea, 'Your idea', 'Next up — let’s build it')]
    cw, ch, top = 340, 430, 240
    for i, (art, name, kind) in enumerate(projects):
        x = 60 + i * (cw + 30)
        cid = s.uid('wc')
        s.defs.append(f'<clipPath id="{cid}"><rect x="{x}" y="{top}" width="{cw}" height="{ch}" rx="22"/></clipPath>')
        scale = cw / 300
        s.add(f'<g clip-path="url(#{cid})"><rect x="{x}" y="{top}" width="{cw}" height="{ch}" fill="{RAISED}"/>'
              f'<g transform="translate({x} {top - 26}) scale({scale:.4f})">{art(s)}</g>'
              f'<rect x="{x}" y="{top + 340}" width="{cw}" height="{ch - 340}" fill="{BG}" fill-opacity=".72"/>'
              f'<rect class="sweep" style="animation-delay:{1 + i * .6:.1f}s;transform-box:fill-box" x="{x}" y="{top - 20}" width="150" '
              f'height="{ch + 40}" fill="url(#shine)" transform="skewX(-18)"/></g>')
        s.add(f'<rect x="{x + .5}" y="{top + .5}" width="{cw - 1}" height="{ch - 1}" rx="21.5" fill="none" stroke="#fff" stroke-opacity=".13"/>')
        s.add(f'<rect x="{x}" y="{top + 340}" width="{cw}" height="1" fill="#fff" fill-opacity=".1"/>')
        s.add(s.text(x + 24, top + 380, name, 'q700', 23, IVORY))
        s.add(s.micro(x + 24, top + 406, kind, op=.55, size=10))
        bx, by = x + cw - 44, top + 385
        hot = i == 2
        s.add(f'<circle cx="{bx}" cy="{by}" r="21" fill="{"url(#gbtn)" if hot else BG}" stroke="#fff" stroke-opacity="{0 if hot else .2}"/>'
              + icon_path('upright', bx - 8, by - 8, 16, ON if hot else IVORY, 2))
    s.save('work.svg')


def principles():
    W, H = 1200, 560
    s = Svg(W, H, 'Our principles — simple by design, built to last. 01 Design for ease: simplicity isn’t the absence of '
                  'features, it’s the absence of friction. 02 Engineer for scale: we build systems that are calm to operate '
                  'and a delight to use. 03 Ship with purpose: every pixel and every endpoint has to earn its place.')
    s.style("""
.q{opacity:0;animation:q 18s ease-in-out infinite}
@keyframes q{0%{opacity:0;transform:translateY(10px)}4%,30%{opacity:1;transform:none}34%,100%{opacity:0;transform:translateY(-10px)}}
.dot{opacity:0;animation:q2 18s ease-in-out infinite}
@keyframes q2{0%{opacity:0}4%,30%{opacity:1}34%,100%{opacity:0}}
""")
    s.add(stars(60, (0, 0, W, H), 71))
    # black-hole vortex
    cx, cy = 1030, 290
    rnd = random.Random(8)
    s.defs.append(f'<radialGradient id="ph"><stop offset=".55" stop-color="{BG}"/><stop offset=".72" stop-color="{LIME}" stop-opacity=".9"/>'
                  f'<stop offset=".8" stop-color="{ACCENT}" stop-opacity=".35"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>')
    rings = []
    for k in range(9):
        r = 92 + k * 30
        cnt = int(2 * math.pi * r / 15)
        dots = ''.join(
            f'<circle cx="{r * math.cos(a):.1f}" cy="{r * math.sin(a):.1f}" r="{rnd.uniform(.8, 2.1):.1f}" '
            f'fill="{rnd.choice([LIME, ACCENT, SOFT, LIME])}" fill-opacity="{rnd.uniform(.25, .95) * (1 - k * .07):.2f}"/>'
            for a in (2 * math.pi * j / cnt + rnd.uniform(-.05, .05) for j in range(cnt)))
        rings.append(f'<g style="animation:spin {14 + k * 7}s linear infinite;transform-origin:0 0">{dots}</g>')
    disk = ''.join(rings)
    tilt = f'translate({cx} {cy}) rotate(-14) scale(1 .3)'
    s.add(f'<ellipse cx="{cx}" cy="{cy}" rx="380" ry="200" fill="url(#glowd)"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="96" fill="url(#ph)" class="breathe"/>')
    s.add(f'<g transform="{tilt}">{disk}</g>')
    s.add(f'<ellipse cx="{cx}" cy="{cy - 6}" rx="70" ry="64" fill="none" stroke="{SOFT}" stroke-opacity=".55" stroke-width="2"/>')

    s.add(s.pill(60, 70, 'Our Principles'))
    s.add(s.heading(60, 162, ['Simple by design.', '*Built to last.*'], size=50))
    p, _ = s.para(60, 268, 'The ideas we hold ourselves to on every project, big or small.', 360, size=17, lh=28)
    s.add(p)
    s.add(s.text(60, 360, 'Work with us', 'i600', 15, LIME) + icon_path('right', 60 + tw('Work with us', 'i600', 15) + 8, 348, 16, LIME, 2))
    qx, qy, qw, qh = 490, 110, 480, 320
    s.add(s.glass(qx, qy, qw, qh, r=26, tint=.55))
    s.add(s.text(qx + 30, qy + 92, '“', 'q700', 110, LIME, op=.9))
    quotes = [('Simplicity isn’t the absence of features. It’s the absence of friction.', 'Principle 01', 'Design for ease'),
              ('We build systems that are calm to operate and a delight to use.', 'Principle 02', 'Engineer for scale'),
              ('Every pixel and every endpoint has to earn its place.', 'Principle 03', 'Ship with purpose')]
    for i, (qt, nm, role) in enumerate(quotes):
        lines = wrap(qt, 'q600', 26, qw - 68)
        g = ''.join(s.text(qx + 34, qy + 126 + j * 35, ln, 'q600', 26, IVORY) for j, ln in enumerate(lines))
        g += (f'<circle cx="{qx + 54}" cy="{qy + qh - 52}" r="20" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-opacity=".15"/>'
              + logo(qx + 54 - 10.9, qy + qh - 61, 18)
              + s.text(qx + 86, qy + qh - 56, nm, 'q700', 16, IVORY) + s.text(qx + 86, qy + qh - 36, role, 'i400', 14, MIST, op=.62))
        s.add(f'<g class="q" style="animation-delay:{i * 6}s">{g}</g>')
    for i in range(3):
        x = qx + qw / 2 - 30 + i * 24
        s.add(f'<rect x="{x}" y="{qy + qh + 24}" width="8" height="8" rx="4" fill="{MIST}" fill-opacity=".25"/>'
              f'<rect class="dot" style="animation-delay:{i * 6}s" x="{x - 4}" y="{qy + qh + 24}" width="16" height="8" rx="4" fill="{LIME}"/>')
    s.save('principles.svg')


def cta():
    W, H = 1200, 560
    s = Svg(W, H, 'Ready to create something extraordinary? Let’s turn your ideas into impact.')
    s.style("""
.float{animation:float 6s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
""")
    cx, cy = 600, 200
    s.add(stars(80, (0, 0, W, H), 81))
    s.add(f'<ellipse cx="{cx}" cy="{cy}" rx="420" ry="300" fill="url(#glowd)"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="150" fill="url(#glowl)" opacity=".35" class="breathe"/>')
    rnd = random.Random(2)
    s.add(f'<circle cx="{cx}" cy="{cy}" r="118" fill="none" stroke="{LIME}" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="1 7" class="spin" style="animation-duration:40s"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="142" fill="none" stroke="{SOFT}" stroke-opacity=".25" stroke-dasharray="70 26 6 26" class="spinr" style="animation-duration:50s"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="96" fill="none" stroke="{ACCENT}" stroke-opacity=".35"/>')
    ring = ''.join(f'<circle cx="{cx + r * math.cos(a):.1f}" cy="{cy + r * math.sin(a):.1f}" r="{rnd.uniform(.6, 2):.1f}" fill="{rnd.choice([LIME, SOFT, ACCENT])}" '
                   f'fill-opacity="{rnd.uniform(.3, 1):.2f}"/>'
                   for a, r in ((rnd.uniform(0, 2 * math.pi), rnd.gauss(170, 9)) for _ in range(260)))
    s.add(f'<g class="spin" style="animation-duration:90s">{ring}</g>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="58" fill="{BG}" stroke="#fff" stroke-opacity=".14"/>')
    s.add(f'<g class="float">{logo(cx - 38.7, cy - 32, 64)}</g>')
    s.add(s.micro(cx, 392, 'Start here', anchor='middle', op=.7, fill=LIME))
    s.add(s.heading(cx, 452, ['Ready to create something *extraordinary?*'], size=50, anchor='middle'))
    p, _ = s.para(cx, 500, 'Let’s turn your ideas into impact. Tell us what you’re building — we’ll take it from there.', 700,
                  size=17, anchor='middle')
    s.add(p)
    s.save('cta.svg')


def footer():
    W, H = 1200, 360
    s = Svg(W, H, 'Apheleia — © 2026 Apheleia. All rights reserved. Made with care in Tamil Nadu, India. '
                  'apheleia.team@gmail.com · Instagram @apheleia.team')
    s.style("""
.mark{animation:mark 9s ease-in-out infinite}
@keyframes mark{0%,100%{opacity:.75}50%{opacity:1}}
""")
    s.add(stars(40, (0, 0, W, H), 91))
    s.add(s.glass(40, 36, W - 80, 150, r=24, tint=.6))
    s.add(logo(72, 70, 26) + s.text(110, 92, 'Apheleia', 'q700', 24, IVORY))
    links = ['Process', 'About', 'Services', 'Team', 'Work', 'Principles']
    x = 440
    for l in links:
        s.add(s.text(x, 90, l, 'i500', 15, MIST, op=.72))
        x += tw(l, 'i500', 15) + 30
    s.add(icon_path('mail', 1128 - tw('apheleia.team@gmail.com', 'i500', 15) - 26, 77, 16, LIME, 1.8)
          + s.text(1128, 90, 'apheleia.team@gmail.com', 'i500', 15, IVORY, anchor='end'))
    s.add(f'<rect x="72" y="122" width="{W - 144}" height="1" fill="#fff" fill-opacity=".1"/>')
    s.add(s.text(72, 158, '© 2026 Apheleia. All rights reserved.', 'i400', 13.5, MIST, op=.55))
    s.add(s.text(W - 72, 158, 'Made with care in Tamil Nadu, India', 'i400', 13.5, MIST, op=.55, anchor='end'))
    ig = '@apheleia.team'
    igx = W / 2 - (tw(ig, 'i500', 13.5) + 22) / 2
    s.add(icon_path('instagram', igx, 145, 16, LIME, 1.8) + s.text(igx + 22, 158, ig, 'i500', 13.5, MIST, op=.8))
    big = 'Apheleia'
    size = 290
    bw = tw(big, 'q700', size, -8)
    s.defs.append(f'<linearGradient id="fm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{LIME}" stop-opacity=".95"/>'
                  f'<stop offset=".55" stop-color="{ACCENT}" stop-opacity=".35"/><stop offset="1" stop-color="{BG}" stop-opacity="0"/></linearGradient>')
    s.add(f'<g class="mark">' + s.text(600, 420, big, 'q700', size, 'url(#fm)', anchor='middle', ls=-8) + '</g>')
    s.add(f'<g style="mix-blend-mode:overlay"><rect class="sweep" style="animation-duration:6s;transform-box:fill-box" x="{600 - bw / 2:.0f}" y="210" '
          f'width="260" height="200" fill="url(#shine)" transform="skewX(-20)"/></g>')
    s.save('footer.svg')


def nav():
    H = 64
    pieces = [('brand', 250, None)] + [(l, 112, None) for l in ('Process', 'About', 'Services', 'Team', 'Work', 'Principles')] + [('talk', 278, None)]
    for key, w, _ in pieces:
        s = Svg(w, H, 'Apheleia' if key == 'brand' else 'Let’s talk' if key == 'talk' else key, frame=False)
        r = H / 2
        if key == 'brand':
            shape = f'M{r} .5H{w}V{H - .5}H{r}A{r - .5} {r - .5} 0 0 1 {r} .5Z'
        elif key == 'talk':
            shape = f'M0 .5H{w - r}A{r - .5} {r - .5} 0 0 1 {w - r} {H - .5}H0Z'
        else:
            shape = f'M0 .5H{w}V{H - .5}H0Z'
        s.add(f'<path d="{shape}" fill="{RAISED}"/>')
        s.add(f'<path d="{shape}" fill="url(#glass)"/>')
        # borders: only top/bottom (and the rounded caps) so the pieces join seamlessly
        if key == 'brand':
            s.add(f'<path d="M{w} .5H{r}A{r - .5} {r - .5} 0 0 0 {r} {H - .5}H{w}" fill="none" stroke="#fff" stroke-opacity=".16"/>')
            s.add(logo(30, 19, 26) + s.text(66, 41, 'Apheleia', 'q700', 22, IVORY, ls=-.3))
        elif key == 'talk':
            s.add(f'<path d="M0 .5H{w - r}A{r - .5} {r - .5} 0 0 1 {w - r} {H - .5}H0" fill="none" stroke="#fff" stroke-opacity=".16"/>')
            bw, bh = 150, 42
            bx, by = w - 11 - bw, (H - bh) / 2
            s.add(s.glass(bx, by, bw, bh, r=bh / 2, tint=.3, edge=.28))
            s.add(s.text(bx + bw / 2, by + 26.5, '[ Let’s Talk ]', 'q700', 15, IVORY, anchor='middle'))
        else:
            s.add(f'<path d="M0 .5H{w}M0 {H - .5}H{w}" fill="none" stroke="#fff" stroke-opacity=".16"/>')
            s.add(s.text(w / 2, 37.5, key, 'i500', 15, MIST, op=.78, anchor='middle'))
        s.save(f'nav/{key.lower()}.svg')


def buttons():
    for name, label, primary, icon in [('start', 'Start a Project', True, 'right'), ('site', 'Visit the website', False, 'upright')]:
        s = Svg(300, 92, label, frame=False)
        if not primary:  # solid backing so the glass pill reads the same on light and dark pages
            bw = tw(label, 'q700', 18) + 92
            s.add(f'<rect x="{150 - bw / 2:.1f}" y="12" width="{bw:.1f}" height="56" rx="28" fill="{BG}"/>')
        s.add(s.button(150, 40, label, h=56, size=18, primary=primary, icon=icon))
        s.save(f'btn-{name}.svg')


def main():
    ensure_fonts()
    people = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'public', 'team', '*.jp*g'))):
        stem = os.path.splitext(os.path.basename(f))[0]
        name, email = stem.split('_', 1)
        people.append((name.strip().title(), email.strip(), f))
    nav()
    hero()
    marquee()
    about()
    process()
    services()
    team_header(people)
    for i, (name, email, f) in enumerate(people):
        team_card(i, len(people), name, email, portrait(f))
    work()
    principles()
    cta()
    buttons()
    footer()


if __name__ == '__main__':
    main()
