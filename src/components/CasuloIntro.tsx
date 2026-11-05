import { useEffect, useRef } from 'react'
import { tr } from '../i18n'

/** Animação de entrada do Casulo (15 s em ciclo): a bolinha sai do casulo, encontra outras
 *  e ficam todas num abraço. Com "reduzir movimento" mostra só a imagem final. */
export function CasuloIntro({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => (ref.current ? start(ref.current) : undefined), [])
  return (
    <svg ref={ref} className={className} viewBox="0 0 1080 1080" role="img" aria-label={tr('Casulo: não estás sozinhe.')}>
      <defs>
        <linearGradient id="cz-bgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5bcefa" /><stop offset="1" stopColor="#fbe9f0" /></linearGradient>
        <radialGradient id="cz-vig" cx="50%" cy="52%" r="62%"><stop offset="0" stopColor="#1d3a52" /><stop offset="1" stopColor="#0b1622" /></radialGradient>
        <radialGradient id="cz-spot" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#7cc8f0" stopOpacity=".35" /><stop offset="1" stopColor="#7cc8f0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#cz-vig)" />
      <rect data-id="bgLight" width="1080" height="1080" fill="url(#cz-bgL)" opacity="0" />
      <g data-id="world">
        <circle data-id="spotC" cx="540" cy="560" r="330" fill="url(#cz-spot)" opacity="0" />
        <g data-id="bigArms" />
        <g data-id="balls" />
        <g data-id="logoArms" />
      </g>
      <g data-id="sparks" />
      <text data-id="word" x="540" y="215" textAnchor="middle" fontFamily="Fredoka, ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" fontWeight="700" fontSize="150" letterSpacing="-2" opacity="0">casulo</text>
      <text data-id="tag" x="540" y="985" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="58" opacity="0">{tr('Não estás sozinhe.')}</text>
      <rect data-id="fade" width="1080" height="1080" fill="#0b1622" opacity="0" />
    </svg>
  )
}

/* ---------- motor da animação (SVG puro, sem bibliotecas) ---------- */
type Attrs = Record<string, string | number>
const NS = 'http://www.w3.org/2000/svg', T = 15, INK = '#0e1a23'
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const ease = (x: number) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eout = (x: number) => 1 - Math.pow(1 - x, 3)
const back = (x: number) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',') + ')' }
const blinkAt = (t: number, list: number[]) => { let v = 0; for (const b of list) { const d = Math.abs(t - b); if (d < .09) v = Math.max(v, 1 - d / .09) } return v }
const nums = (s: string) => s.match(/-?[\d.]+/g)!.map(Number)
const toD = (n: number[]) => `M${n[0]} ${n[1]}C${n[2]} ${n[3]} ${n[4]} ${n[5]} ${n[6]} ${n[7]}`
const mixN = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t))
const ARM = { cB: nums('M24 30C6 46 14 82 62 82'), cP: nums('M62 18C92 28 92 76 40 84'), oB: nums('M40 70C14 74 2 50 8 22'), oP: nums('M60 70C86 74 98 50 92 22') }

function start(svg: SVGSVGElement): () => void {
  const $ = (id: string) => svg.querySelector(`[data-id="${id}"]`) as SVGElement
  const el = (tag: string, a: Attrs, p?: Element) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, String(a[k])); if (p) p.appendChild(e); return e }
  const set = (e: Element, a: Attrs) => { for (const k in a) e.setAttribute(k, String(a[k])) }

  type Ball = ReturnType<typeof makeBall>
  function makeBall(parent: Element) {
    const g = el('g', {}, parent)
    const shadow = el('ellipse', { fill: '#0b1622' }, g)
    const s = el('g', {}, g)
    const body = el('circle', { cx: 0, cy: 0 }, s)
    const hl = el('ellipse', { fill: '#fff' }, s)
    const cheeks = [el('ellipse', { fill: '#ff7fa3' }, s), el('ellipse', { fill: '#ff7fa3' }, s)]
    const eyes = [0, 1].map(() => { const e = el('g', {}, s); return { g: e, sc: el('ellipse', {}, e), sh: el('circle', { fill: '#fff' }, e), happy: el('path', { fill: 'none', 'stroke-linecap': 'round' }, e) } })
    return { g, shadow, s, body, hl, cheeks, eyes }
  }
  function drawBall(B: Ball, o: { x: number; y: number; r: number; fill: string; body?: number; eyes?: number; blink?: number; lx?: number; ly?: number; happy?: number; blush?: number; sq?: number; lift?: number; shadow?: number; tilt?: number }) {
    const { x, y, r, fill, body = 1, eyes = 1, blink = 0, lx = 0, ly = 0, happy = 0, blush = 0, sq = 0, lift = 0, shadow = 0, tilt = 0 } = o
    set(B.g, { transform: `translate(${x} ${y})`, opacity: eyes > 0 || body > 0 ? 1 : 0 })
    set(B.shadow, { cx: 0, cy: r + 8, rx: r * .8 * (1 - Math.min(.5, lift / 300)), ry: r * .14, opacity: .22 * shadow * body })
    set(B.s, { transform: `translate(0 ${r}) scale(${1 + sq} ${1 - sq}) translate(0 ${-r - lift}) rotate(${tilt})` })
    set(B.body, { r, fill, opacity: body })
    set(B.hl, { cx: -r * .36, cy: -r * .48, rx: r * .24, ry: r * .12, transform: `rotate(-32 ${-r * .36} ${-r * .48})`, opacity: .6 * body })
    B.cheeks.forEach((c, i) => set(c, { cx: (i ? 1 : -1) * r * .55, cy: r * .22, rx: r * .14, ry: r * .08, opacity: .85 * blush * body }))
    const scl = Math.max(.0001, eyes)
    B.eyes.forEach((e, i) => {
      const ex = (i ? 1 : -1) * r * .28 + lx * r * .07, ey = -r * .04 + ly * r * .07
      const open = Math.max(.1, 1 - blink), ry = r * .17 * open
      set(e.g, { transform: `translate(${ex} ${ey}) scale(${scl})` })
      set(e.sc, { rx: r * .12, ry, fill: INK, stroke: '#cfe9f7', 'stroke-width': r * .035 * (1 - body), opacity: 1 - happy })
      set(e.sh, { cx: -r * .035, cy: -r * .06 * open, r: r * .035, opacity: (1 - happy) * (open > .5 ? 1 : 0) })
      set(e.happy, { d: `M${-r * .13} ${r * .04}Q0 ${-r * .16} ${r * .13} ${r * .04}`, stroke: INK, 'stroke-width': r * .07, opacity: happy })
    })
  }
  type Arms = ReturnType<typeof makeArms>
  function makeArms(parent: Element) { const g = el('g', {}, parent); return { g, b: el('path', { fill: 'none', 'stroke-linecap': 'round' }, g), p: el('path', { fill: 'none', 'stroke-linecap': 'round' }, g) } }
  function drawArms(A: Arms, { cx, cy, s, open, w = 11, op = 1, cB, cP, draw = 1 }: { cx: number; cy: number; s: number; open: number; w?: number; op?: number; cB: string; cP: string; draw?: number }) {
    A.b.setAttribute('d', toD(mixN(ARM.cB, ARM.oB, open))); A.p.setAttribute('d', toD(mixN(ARM.cP, ARM.oP, open)))
    ;[A.b, A.p].forEach((p, i) => set(p, { 'stroke-width': w, stroke: i ? cP : cB, pathLength: 100, 'stroke-dasharray': '100 100', 'stroke-dashoffset': 100 * (1 - draw) }))
    set(A.g, { transform: `translate(${cx} ${cy}) scale(${s}) translate(-50 -50)`, opacity: op })
  }

  const logoArms = makeArms($('logoArms')), bigArms = makeArms($('bigArms'))
  const HX = 540, HY = 560, HR = 90
  const friends = [
    { sx: 560, sy: -260, tx: 462, ty: 452, r: 52, c: '#5bcefa', eyesAt: 7.8 },
    { sx: 250, sy: 1380, tx: 620, ty: 452, r: 52, c: '#f5a9b8', eyesAt: 8.0 },
    { sx: -230, sy: 150, tx: 395, ty: 580, r: 70, c: '#5bcefa', eyesAt: 7.05 },
    { sx: 1290, sy: 220, tx: 685, ty: 580, r: 70, c: '#f5a9b8', eyesAt: 7.25 },
    { sx: -260, sy: 980, tx: 268, ty: 595, r: 55, c: '#f5a9b8', eyesAt: 7.45 },
    { sx: 1320, sy: 960, tx: 812, ty: 595, r: 55, c: '#ffffff', eyesAt: 7.6 },
  ]
  const fb = friends.map(() => makeBall($('balls')))
  const hero = makeBall($('balls'))
  const SP = [[150, 170], [930, 140], [90, 820], [990, 780], [300, 90], [800, 930]]
  const sparks = SP.map(() => el('path', { d: 'M0 -18L4 -4 18 0 4 4 0 18 -4 4 -18 0 -4 -4Z' }, $('sparks')))
  const word = $('word'), tag = $('tag')

  function render(t: number) {
    const L = ease(seg(t, 10.2, 11.2))
    $('bgLight').setAttribute('opacity', String(L))
    $('fade').setAttribute('opacity', String(Math.max(1 - seg(t, 0, .45), seg(t, 14.35, 15))))
    const ink = mix('#ffffff', '#14283a', L)
    const z = lerp(lerp(1, .58, ease(seg(t, 6.1, 7.3))), .86, ease(seg(t, 10.2, 11.2)))
    $('world').setAttribute('transform', `translate(${HX} ${HY}) scale(${z}) translate(${-HX} ${-HY})`)
    $('spotC').setAttribute('opacity', String(seg(t, 3.2, 4) * (1 - seg(t, 9.5, 10.5))))

    const LX = 540, LY = 520, LS = 4.2
    const headX = LX + (37 - 50) * LS, headY = LY + (36 - 50) * LS, headR = 12.5 * LS
    const openP = seg(t, 1.5, 2.15), open = openP > 0 ? back(openP) : 0
    const armsGone = eout(seg(t, 2.35, 3.0))
    const breathe = Math.sin(t * 5) * .03 * (1 - seg(t, 1.3, 1.5))
    drawArms(logoArms, { cx: LX, cy: LY + armsGone * 60, s: LS * (1 + breathe) * (1 - armsGone * .6), open: Math.min(1.15, open), op: 1 - armsGone, cB: '#5bcefa', cP: '#f5a9b8' })
    let hx = headX, hy = headY, hr = headR, sq = breathe * 1.5
    const jump = seg(t, 2.05, 2.95)
    if (jump > 0) { const j = eout(jump); hx = lerp(headX, HX, j); hr = lerp(headR, HR, j); hy = lerp(headY, HY, jump) - Math.sin(Math.PI * jump) * 260; sq = jump < .15 ? -.12 : -.06 * Math.sin(Math.PI * jump) }
    const land = seg(t, 2.95, 3.5); if (land > 0 && land < 1) { hx = HX; hy = HY; hr = HR; sq = .17 * Math.sin(Math.PI * land) * Math.pow(1 - land, 1.2) - .08 * Math.sin(Math.PI * 2 * land) * (1 - land) }
    if (t >= 3.5) { hx = HX; hy = HY; hr = HR; sq = 0 }
    const eyes = t < 3.45 ? 0 : back(seg(t, 3.45, 3.8))
    const lookL = seg(t, 4.4, 4.6) * (1 - seg(t, 4.9, 5.1)), lookR = seg(t, 5.0, 5.2) * (1 - seg(t, 5.5, 5.7))
    let lx = -lookL + lookR, tilt = (-lookL + lookR) * 7, ly = seg(t, 5.7, 6.0) * .6 * (1 - seg(t, 6.9, 7.1))
    if (t > 7.0 && t < 9.8) { const tgt = friends.filter(f => t > f.eyesAt).pop(); if (tgt) { const d = Math.atan2(tgt.sy - HY, tgt.sx - HX); lx = Math.cos(d); ly = Math.sin(d) * .8; tilt = 0 } }
    const blink = blinkAt(t, [3.95, 4.25, 5.85, 7.2, 8.6, 10.1, 12.4, 13.6])
    const happy = ease(seg(t, 9.4, 9.8))
    const gB = seg(t, 10.6, 10.8) * (1 - seg(t, 14.2, 14.5))
    const hop = Math.max(0, Math.sin((t - 10.6) * Math.PI * 2.2)) * gB
    drawBall(hero, { x: hx, y: hy, r: hr, fill: '#ffffff', eyes, blink, lx, ly, happy, blush: seg(t, 9.5, 10), sq: sq - .05 * hop, lift: hop * 26, shadow: seg(t, 2.9, 3.2), tilt })

    friends.forEach((f, i) => {
      const ea = f.eyesAt, eyeIn = t < ea ? 0 : back(seg(t, ea, ea + .35))
      const bodyIn = ease(seg(t, 8.3 + i * .08, 9.1 + i * .08))
      const mv = seg(t, 8.9 + i * .1, 10.5), pe = ease(mv)
      const x = lerp(f.sx, f.tx, pe), y = lerp(f.sy, f.ty, pe)
      const ph = mv * 3, hopH = mv > 0 && mv < 1 ? Math.abs(Math.sin(Math.PI * ph)) * 70 * (1 - mv * .4) : 0
      const contact = mv > 0 && mv < 1 ? Math.pow(1 - Math.abs(Math.sin(Math.PI * ph)), 6) : 0
      const myHop = Math.max(0, Math.sin((t - 10.6) * Math.PI * 2.2 - i * .5)) * gB
      const look = t < 9.6 ? { lx: (f.sx < HX ? 1 : -1) * .7, ly: f.sy < HY ? .6 : -.6 } : { lx: (f.tx < HX ? 1 : -1) * .5, ly: 0 }
      drawBall(fb[i], { x, y, r: f.r, fill: f.c, body: bodyIn, eyes: eyeIn * (1 + .7 * (1 - bodyIn)), blink: blinkAt(t, [ea + .6 + i * .07, ea + 1.5, 10.0 + i * .15, 12.0 + i * .2, 13.4 + i * .1]), lx: look.lx, ly: look.ly, happy: ease(seg(t, 9.9 + i * .05, 10.3 + i * .05)), blush: seg(t, 10, 10.5), sq: contact * .18 - (hopH > 20 ? .05 : 0) - .05 * myHop, lift: hopH + myHop * 22, shadow: bodyIn })
    })

    const hugP = seg(t, 10.9, 11.9)
    drawArms(bigArms, { cx: 540, cy: 545, s: lerp(10.5, 9.2, eout(hugP)), open: 0, w: 9, draw: ease(hugP), op: hugP > 0 ? 1 - seg(t, 14.3, 14.8) : 0, cB: mix('#5bcefa', '#1f6a9c', L), cP: mix('#f5a9b8', '#d4567a', L) })
    const wp = seg(t, 11.6, 12.2)
    set(word, { opacity: ease(wp) * (1 - seg(t, 14.3, 14.8)), fill: ink, transform: `translate(0 ${(1 - back(wp)) * 40})` })
    set(tag, { opacity: ease(seg(t, 12.2, 12.7)) * (1 - seg(t, 14.3, 14.8)), fill: ink })
    sparks.forEach((s, i) => { const a = seg(t, 11.2 + i * .15, 11.6 + i * .15) * (1 - seg(t, 14.2, 14.6)); const tw = .6 + .4 * Math.sin(t * 6 + i * 1.7); set(s, { transform: `translate(${SP[i][0]} ${SP[i][1]}) scale(${a * tw}) rotate(${t * 40 + i * 30})`, fill: i % 2 ? '#f5a9b8' : '#ffffff', opacity: a }) })
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { render(13); return () => {} }
  let raf = 0
  const t0 = performance.now()
  const tick = (now: number) => { render(((now - t0) / 1000) % T); raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
