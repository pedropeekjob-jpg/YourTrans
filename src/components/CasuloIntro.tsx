import { useEffect, useRef } from 'react'
import { tr } from '../i18n'

/** Animação de entrada do Casulo, estilo néon noturno (15 s em ciclo): uma luz sai do casulo,
 *  encontra outras e ficam todas num abraço. Porte de app-trans/animacao/casulo-animacao.html. Com "reduzir movimento" mostra só a imagem final. */
export function CasuloIntro({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => (ref.current ? start(ref.current) : undefined), [])
  return (
    <svg ref={ref} className={className} viewBox="0 0 1080 1080" role="img" aria-label={tr('Casulo: não estás sozinhe.')}>
      <defs>
        <radialGradient id="cz-vig" cx="50%" cy="52%" r="65%"><stop offset="0" stopColor="#11141f" /><stop offset="1" stopColor="#05060a" /></radialGradient>
        <filter id="cz-gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="cz-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30" /></filter>
        <radialGradient id="cz-hzB" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#5bcefa" stopOpacity=".28" /><stop offset="1" stopColor="#5bcefa" stopOpacity="0" /></radialGradient>
        <radialGradient id="cz-hzP" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ff8fb1" stopOpacity=".26" /><stop offset="1" stopColor="#ff8fb1" stopOpacity="0" /></radialGradient>
        <radialGradient id="cz-spot" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#7cc8f0" stopOpacity=".35" /><stop offset="1" stopColor="#7cc8f0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#cz-vig)" />
      <g data-id="bgLight" opacity="0"><circle cx="260" cy="420" r="560" fill="url(#cz-hzB)" /><circle cx="840" cy="680" r="560" fill="url(#cz-hzP)" /></g>
      <g data-id="world">
        <circle data-id="spotC" cx="540" cy="560" r="330" fill="url(#cz-spot)" opacity="0" />
        <g data-id="bigArms" />
        <g data-id="balls" />
        <g data-id="logoArms" />
      </g>
      <g data-id="sparks" />
      <text data-id="word" x="540" y="200" textAnchor="middle" fontFamily="Unbounded, system-ui, sans-serif" fontWeight="300" fontSize="92" letterSpacing="22" fill="#ffffff" filter="url(#cz-gl)" opacity="0">CASULO</text>
      <text data-id="tag" x="540" y="975" textAnchor="middle" fontFamily="Unbounded, system-ui, sans-serif" fontWeight="400" fontSize="38" letterSpacing="9" fill="#ff8fb1" opacity="0">{tr('Não estás sozinhe').toUpperCase()}</text>
      <rect data-id="fade" width="1080" height="1080" fill="#05060a" opacity="0" />
    </svg>
  )
}

/* ---------- motor da animação (SVG puro, sem bibliotecas) ---------- */
type Attrs = Record<string, string | number>
const NS = 'http://www.w3.org/2000/svg', T = 15, INK = '#06070c'
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const ease = (x: number) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eout = (x: number) => 1 - Math.pow(1 - x, 3)
const back = (x: number) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
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
  let gid = 0
  function makeBall(parent: Element) {
    const g = el('g', {}, parent)
    const shadow = el('ellipse', { filter: 'url(#cz-soft)' }, g)
    const s = el('g', {}, g)
    const halo = el('circle', { cx: 0, cy: 0, filter: 'url(#cz-gl)' }, s)
    const id = 'cz-orb' + gid++
    const gr = el('radialGradient', { id, cx: '40%', cy: '36%', r: '70%' }, svg.querySelector('defs')!)
    const st = [el('stop', { offset: '0', 'stop-color': '#ffffff' }, gr), el('stop', { offset: '.45' }, gr), el('stop', { offset: '1' }, gr)]
    const body = el('circle', { cx: 0, cy: 0, fill: `url(#${id})` }, s)
    const eyes = [0, 1].map(() => { const e = el('g', {}, s); return { g: e, sc: el('ellipse', {}, e), sh: el('circle', { fill: '#fff' }, e), happy: el('path', { fill: 'none', 'stroke-linecap': 'round' }, e) } })
    return { g, shadow, s, body, halo, st, eyes }
  }
  function drawBall(B: Ball, o: { x: number; y: number; r: number; fill: string; body?: number; eyes?: number; blink?: number; lx?: number; ly?: number; happy?: number; sq?: number; lift?: number; shadow?: number; tilt?: number }) {
    const { x, y, r, fill, body = 1, eyes = 1, blink = 0, lx = 0, ly = 0, happy = 0, sq = 0, lift = 0, shadow = 0, tilt = 0 } = o
    set(B.g, { transform: `translate(${x} ${y})`, opacity: eyes > 0 || body > 0 ? 1 : 0 })
    set(B.shadow, { cx: 0, cy: r + 14, rx: r * .9, ry: r * .16, fill, opacity: .35 * shadow * body })
    set(B.s, { transform: `translate(0 ${r}) scale(${1 + sq} ${1 - sq}) translate(0 ${-r - lift}) rotate(${tilt})` })
    set(B.st[1], { 'stop-color': fill }); set(B.st[2], { 'stop-color': fill, 'stop-opacity': .55 })
    set(B.body, { r, opacity: body })
    set(B.halo, { r: r * .92, fill, opacity: Math.min(1, .55 * body + .14 * Math.min(1, eyes) * (1 - body)) })
    const scl = Math.max(.0001, eyes)
    B.eyes.forEach((e, i) => {
      const ex = (i ? 1 : -1) * r * .28 + lx * r * .07, ey = -r * .04 + ly * r * .07
      const open = Math.max(.1, 1 - blink), ry = r * .17 * open
      set(e.g, { transform: `translate(${ex} ${ey}) scale(${scl})` })
      set(e.sc, { rx: r * .12, ry, fill: INK, stroke: fill, 'stroke-width': r * .03 * (1 - body), opacity: 1 - happy })
      set(e.sh, { cx: -r * .035, cy: -r * .06 * open, r: r * .035, opacity: (1 - happy) * (open > .5 ? 1 : 0) })
      set(e.happy, { d: `M${-r * .13} ${r * .04}Q0 ${-r * .16} ${r * .13} ${r * .04}`, stroke: INK, 'stroke-width': r * .07, opacity: happy })
    })
  }
  type Arms = ReturnType<typeof makeArms>
  function makeArms(parent: Element) { const g = el('g', { filter: 'url(#cz-gl)' }, parent); return { g, b: el('path', { fill: 'none', 'stroke-linecap': 'round' }, g), p: el('path', { fill: 'none', 'stroke-linecap': 'round' }, g) } }
  function drawArms(A: Arms, { cx, cy, s, open, w = 11, op = 1, cB, cP, draw = 1 }: { cx: number; cy: number; s: number; open: number; w?: number; op?: number; cB: string; cP: string; draw?: number }) {
    A.b.setAttribute('d', toD(mixN(ARM.cB, ARM.oB, open))); A.p.setAttribute('d', toD(mixN(ARM.cP, ARM.oP, open)))
    ;[A.b, A.p].forEach((p, i) => set(p, { 'stroke-width': w, stroke: i ? cP : cB, pathLength: 100, 'stroke-dasharray': '100 100', 'stroke-dashoffset': 100 * (1 - draw) }))
    set(A.g, { transform: `translate(${cx} ${cy}) scale(${s}) translate(-50 -50)`, opacity: op })
  }

  const logoArms = makeArms($('logoArms')), bigArms = makeArms($('bigArms'))
  const HX = 540, HY = 560, HR = 90
  const friends = [
    { sx: 560, sy: -260, tx: 462, ty: 452, r: 52, c: '#5bcefa', eyesAt: 7.8 },
    { sx: 250, sy: 1380, tx: 620, ty: 452, r: 52, c: '#ff8fb1', eyesAt: 8.0 },
    { sx: -230, sy: 150, tx: 395, ty: 580, r: 70, c: '#5bcefa', eyesAt: 7.05 },
    { sx: 1290, sy: 220, tx: 685, ty: 580, r: 70, c: '#ff8fb1', eyesAt: 7.25 },
    { sx: -260, sy: 980, tx: 268, ty: 595, r: 55, c: '#ff8fb1', eyesAt: 7.45 },
    { sx: 1320, sy: 960, tx: 812, ty: 595, r: 55, c: '#f4f0ff', eyesAt: 7.6 },
  ]
  const fb = friends.map(() => makeBall($('balls')))
  const hero = makeBall($('balls'))
  const SP = [[150, 170], [930, 140], [90, 820], [990, 780], [300, 90], [800, 930]]
  const sparks = SP.map(() => el('path', { d: 'M0 -18L4 -4 18 0 4 4 0 18 -4 4 -18 0 -4 -4Z' }, $('sparks')))
  const word = $('word'), tag = $('tag')

  function render(t: number) {
    const L = ease(seg(t, 10.2, 11.6)) * (1 - seg(t, 14.2, 14.9))
    $('bgLight').setAttribute('opacity', String(L))
    $('fade').setAttribute('opacity', String(Math.max(1 - seg(t, 0, .45), seg(t, 14.35, 15))))
    const z = lerp(lerp(1, .58, ease(seg(t, 6.1, 7.3))), .86, ease(seg(t, 10.2, 11.2)))
    $('world').setAttribute('transform', `translate(${HX} ${HY}) scale(${z}) translate(${-HX} ${-HY})`)
    $('spotC').setAttribute('opacity', String(seg(t, 3.2, 4) * (1 - seg(t, 9.5, 10.5))))

    const LX = 540, LY = 520, LS = 4.2
    const headX = LX + (37 - 50) * LS, headY = LY + (36 - 50) * LS, headR = 12.5 * LS
    const openP = seg(t, 1.5, 2.15), open = openP > 0 ? back(openP) : 0
    const armsGone = eout(seg(t, 2.35, 3.0))
    const breathe = Math.sin(t * 5) * .03 * (1 - seg(t, 1.3, 1.5))
    drawArms(logoArms, { cx: LX, cy: LY + armsGone * 60, s: LS * (1 + breathe) * (1 - armsGone * .6), open: Math.min(1.15, open), op: 1 - armsGone, w: 4.5, cB: '#5bcefa', cP: '#ff8fb1' })
    let hx = headX, hy = headY, hr = headR, sq = breathe * 1.5
    const jump = seg(t, 2.05, 2.95)
    if (jump > 0) { const j = eout(jump); hx = lerp(headX, HX, j); hr = lerp(headR, HR, j); hy = lerp(headY, HY, jump) - Math.sin(Math.PI * jump) * 170; sq = -.04 * Math.sin(Math.PI * jump) }
    const land = seg(t, 2.95, 3.5); if (land > 0 && land < 1) { hx = HX; hy = HY; hr = HR; sq = .07 * Math.sin(Math.PI * land) * Math.pow(1 - land, 1.2) - .08 * Math.sin(Math.PI * 2 * land) * (1 - land) }
    if (t >= 3.5) { hx = HX; hy = HY; hr = HR; sq = 0 }
    const eyes = t < 3.45 ? 0 : back(seg(t, 3.45, 3.8))
    const lookL = seg(t, 4.4, 4.6) * (1 - seg(t, 4.9, 5.1)), lookR = seg(t, 5.0, 5.2) * (1 - seg(t, 5.5, 5.7))
    let lx = -lookL + lookR, tilt = (-lookL + lookR) * 7, ly = seg(t, 5.7, 6.0) * .6 * (1 - seg(t, 6.9, 7.1))
    if (t > 7.0 && t < 9.8) { const tgt = friends.filter(f => t > f.eyesAt).pop(); if (tgt) { const d = Math.atan2(tgt.sy - HY, tgt.sx - HX); lx = Math.cos(d); ly = Math.sin(d) * .8; tilt = 0 } }
    const blink = blinkAt(t, [3.95, 4.25, 5.85, 7.2, 8.6, 10.1, 12.4, 13.6])
    const happy = ease(seg(t, 9.4, 9.8))
    const gB = seg(t, 10.6, 10.8) * (1 - seg(t, 14.2, 14.5))
    const hop = Math.max(0, Math.sin((t - 10.6) * Math.PI * 1.3)) * gB
    drawBall(hero, { x: hx, y: hy, r: hr, fill: '#dff3ff', eyes, blink, lx, ly, happy, sq: sq - .02 * hop, lift: hop * 8, shadow: seg(t, 2.9, 3.2), tilt })

    friends.forEach((f, i) => {
      const ea = f.eyesAt, eyeIn = t < ea ? 0 : back(seg(t, ea, ea + .35))
      const bodyIn = ease(seg(t, 8.3 + i * .08, 9.1 + i * .08))
      const mv = seg(t, 8.9 + i * .1, 10.5), pe = ease(mv)
      const x = lerp(f.sx, f.tx, pe), y = lerp(f.sy, f.ty, pe)
      const ph = mv * 3, hopH = mv > 0 && mv < 1 ? Math.abs(Math.sin(Math.PI * ph)) * 34 * (1 - mv * .4) : 0
      const contact = mv > 0 && mv < 1 ? Math.pow(1 - Math.abs(Math.sin(Math.PI * ph)), 6) : 0
      const myHop = Math.max(0, Math.sin((t - 10.6) * Math.PI * 1.3 - i * .5)) * gB
      const look = t < 9.6 ? { lx: (f.sx < HX ? 1 : -1) * .7, ly: f.sy < HY ? .6 : -.6 } : { lx: (f.tx < HX ? 1 : -1) * .5, ly: 0 }
      drawBall(fb[i], { x, y, r: f.r, fill: f.c, body: bodyIn, eyes: eyeIn * (1 + .7 * (1 - bodyIn)), blink: blinkAt(t, [ea + .6 + i * .07, ea + 1.5, 10.0 + i * .15, 12.0 + i * .2, 13.4 + i * .1]), lx: look.lx, ly: look.ly, happy: ease(seg(t, 9.9 + i * .05, 10.3 + i * .05)), sq: contact * .05 - .02 * myHop, lift: hopH + myHop * 7, shadow: bodyIn })
    })

    const hugP = seg(t, 10.9, 11.9)
    drawArms(bigArms, { cx: 540, cy: 545, s: lerp(10.5, 9.2, eout(hugP)), open: 0, w: 2.2, draw: ease(hugP), op: hugP > 0 ? 1 - seg(t, 14.3, 14.8) : 0, cB: '#5bcefa', cP: '#ff8fb1' })
    const wp = seg(t, 11.6, 12.2)
    set(word, { opacity: ease(wp) * (1 - seg(t, 14.3, 14.8)), transform: `translate(0 ${(1 - eout(wp)) * 20})` })
    set(tag, { opacity: ease(seg(t, 12.2, 12.7)) * (1 - seg(t, 14.3, 14.8)) })
    sparks.forEach((s, i) => { const a = seg(t, 11.2 + i * .15, 11.6 + i * .15) * (1 - seg(t, 14.2, 14.6)); const tw = .6 + .4 * Math.sin(t * 6 + i * 1.7); set(s, { transform: `translate(${SP[i][0]} ${SP[i][1]}) scale(${a * tw * .45}) rotate(${t * 20 + i * 30})`, fill: i % 2 ? '#ff8fb1' : '#5bcefa', opacity: a * .8 }) })
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { render(13); return () => {} }
  let raf = 0
  const t0 = performance.now()
  const tick = (now: number) => { render(((now - t0) / 1000) % T); raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
