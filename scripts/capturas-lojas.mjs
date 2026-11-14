// Capturas de ecrã para a App Store e o Google Play, em português e inglês.
// 1) noutro terminal: npx vite --port 5173
// 2) npm run capturas
// Resultado em store/capturas/<língua>/: iphone-*.png (1290×2796, iPhone 6,9") e android-*.png (1080×1920).
// Usa dados de exemplo (pessoa "Alex", elu/delu); nada vem de pessoas reais.
import { createRequire } from 'node:module'
// Playwright não é dependência do projeto: usa o que estiver instalado (npm i -g playwright).
const { chromium } = createRequire(import.meta.url)('playwright')
import { mkdir, writeFile } from 'node:fs/promises'

const APP = process.env.APP_URL ?? 'http://localhost:5173/'

const scenes = [
  { route: '', pt: 'O teu dia, ao teu ritmo', en: 'Your day, at your pace', sub: { pt: 'Lembretes, check-in e próximos passos num só lugar.', en: 'Reminders, check-ins and next steps in one place.' } },
  { route: 'documentos', pt: 'Mudar nome e documentos, passo a passo', en: 'Change your name and documents, step by step', sub: { pt: 'Guia da lei, checklist de entidades e cartas prontas a enviar.', en: 'A legal guide, a checklist of organisations and ready-made letters.' } },
  { route: 'percurso/saude', pt: 'O teu percurso de saúde, explicado', en: 'Your healthcare journey, explained', sub: { pt: 'Consultas, relatórios, hormonas e cirurgias, com o que esperar.', en: 'Appointments, reports, hormones and surgery, with what to expect.' } },
  { route: 'nome', prep: async (p, lang) => { await p.locator('input').first().fill('Alex'); await p.keyboard.press('Enter'); await p.waitForTimeout(600) }, pt: 'Ensaia o teu nome', en: 'Try out your name', sub: { pt: 'Vê e ouve o teu nome e pronomes no dia a dia.', en: 'See and hear your name and pronouns in everyday life.' } },
  { route: 'diario', prep: async (p, lang) => {
    await p.getByText(lang === 'en' ? 'Moment of euphoria' : 'Momento de euforia').first().click(); await p.waitForTimeout(600)
    await p.locator('textarea').fill(lang === 'en' ? 'A colleague used my name without hesitating today ✨' : 'Hoje uma colega chamou-me pelo nome certo sem hesitar ✨')
    await p.getByRole('button', { name: lang === 'en' ? 'Save' : 'Guardar' }).click(); await p.waitForTimeout(900)
  }, pt: 'Diário e lembretes privados', en: 'A private journal and reminders', sub: { pt: 'Momentos de euforia, efeitos e fotos, cifrados no teu telemóvel.', en: 'Euphoria moments, effects and photos, encrypted on your phone.' } },
  { route: 'ajuda', pt: 'Ajuda num toque', en: 'Help in one tap', sub: { pt: 'SOS para pessoas de confiança, linhas de apoio e associações.', en: 'SOS to trusted contacts, helplines and organisations.' } },
  { route: 'privacidade', pt: 'Sem conta. Sem rastreio.', en: 'No account. No tracking.', sub: { pt: 'O que registas fica só no teu aparelho, cifrado.', en: 'What you record stays on your device, encrypted.' } },
]

const sizes = { iphone: { w: 1290, h: 2796 }, android: { w: 1080, h: 1920 } }

async function onboard(p, lang) {
  await p.goto(APP)
  await p.waitForTimeout(2000)
  await p.getByText(lang === 'en' ? "I'm a trans person" : 'Sou uma pessoa trans').click()
  for (let i = 0; i < 8; i++) {
    await p.waitForTimeout(400)
    if (await p.locator('input[placeholder]').count()) {
      await p.fill('input[placeholder]', 'Alex')
      for (const t of lang === 'en' ? ['they/them', 'Changing name and documents', 'Hormones and health', 'Meeting people'] : ['elu/delu', 'Mudar nome e documentos', 'Hormonas e saúde', 'Conhecer pessoas']) {
        const el = p.getByText(t, { exact: false }).first()
        if (await el.count()) await el.click()
      }
    }
    const next = p.getByRole('button', { name: lang === 'en' ? /^(Next|Continue|Start|Get started|Not now)$/ : /^(Seguinte|Continuar|Começar|Agora não)$/ }).first()
    if (await next.count()) await next.click(); else break
  }
  await p.waitForTimeout(800)
}

async function frame(browser, shot, scene, lang, size) {
  const ctx = await browser.newContext({ viewport: { width: size.w / 3, height: size.h / 3 }, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const img = `data:image/png;base64,${shot.toString('base64')}`
  await p.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; margin: 0 }
    body { width: 100vw; height: 100vh; overflow: hidden; font-family: system-ui, -apple-system, Roboto, sans-serif; color: #fff;
      background: radial-gradient(60% 40% at 15% 10%, rgba(91,206,250,.35), transparent), radial-gradient(60% 40% at 90% 95%, rgba(255,143,177,.32), transparent), #07080e;
      display: flex; flex-direction: column; align-items: center; padding: 7vh 6vw 0 }
    h1 { font-size: 7.4vw; line-height: 1.15; text-align: center; font-weight: 700; letter-spacing: -.01em }
    p { margin-top: 1.6vh; font-size: 4.1vw; line-height: 1.35; text-align: center; color: #dff3ff; opacity: .9 }
    .phone { margin-top: 4vh; width: 78vw; flex: 1; border-radius: 6vw 6vw 0 0; overflow: hidden; border: 1.4vw solid #1b1e2b; border-bottom: 0;
      box-shadow: 0 0 8vw rgba(91,206,250,.25); background: #07080e url(${img}) top center / 100% auto no-repeat }
  </style></head><body><h1>${scene[lang]}</h1><p>${scene.sub[lang]}</p><div class="phone"></div></body></html>`)
  await p.waitForTimeout(150)
  const out = await p.screenshot()
  await ctx.close()
  return out
}

const browser = await chromium.launch()
for (const lang of ['pt', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark', locale: lang === 'en' ? 'en-GB' : 'pt-PT' })
  // Idioma e sem o convite "Instala a app" (que não faz sentido nas lojas).
  await ctx.addInitScript(l => { try { localStorage.setItem('lang', l); localStorage.setItem('installNudge', String(Date.now())) } catch { /* */ } }, lang)
  const p = await ctx.newPage()
  await onboard(p, lang)
  await mkdir(`store/capturas/${lang}`, { recursive: true })
  let i = 0
  for (const scene of scenes) {
    i++
    await p.goto(APP + '#/' + scene.route)
    await p.waitForTimeout(1500)
    if (scene.prep) await scene.prep(p, lang)
    await p.evaluate(() => scrollTo(0, 0))
    const shot = await p.screenshot()
    for (const [name, size] of Object.entries(sizes)) {
      await writeFile(`store/capturas/${lang}/${name}-${String(i).padStart(2, '0')}-${scene.route.replace('/', '-') || 'hoje'}.png`, await frame(browser, shot, scene, lang, size))
    }
  }
  await ctx.close()
}
await browser.close()
console.log('Capturas prontas em store/capturas/')
