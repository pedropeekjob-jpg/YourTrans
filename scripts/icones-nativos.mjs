// Gera os ícones e o ecrã de arranque das apps nativas (Android e iOS) e os gráficos das lojas
// a partir de resources/icone-casulo.svg e public/icon.svg (ícone neutro "Notas").
// Correr com: npm run icones   (depois: npx cap sync)
//
// Discrição: o ecrã de arranque é só a cor de fundo, sem logótipo, para não revelar o Casulo
// a quem escolheu o ícone discreto.
import sharp from 'sharp'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const RES = 'android/app/src/main/res'
const IOS = 'ios/App/App/Assets.xcassets'
const STORE = 'store/graficos'
const BG_APP = '#07080e'

const casulo = await readFile('resources/icone-casulo.svg', 'utf8')
const notas = await readFile('public/icon.svg', 'utf8')

const sets = {
  // Casulo: o primeiro <rect> é o fundo arredondado.
  ic_launcher: {
    color: '#14283a',
    rounded: casulo,
    square: casulo.replace(/<rect width="100" height="100" rx="22" fill="#14283a"\/>/, '<rect width="100" height="100" fill="#14283a"/>'),
    symbol: casulo.replace(/<rect width="100" height="100" rx="22" fill="#14283a"\/>/, ''),
  },
  ic_notas: {
    color: '#e9e4d8',
    rounded: notas,
    square: notas.replace('rx="112" ', ''),
    symbol: notas.replace(/<rect width="512" height="512" rx="112" fill="#e9e4d8"\/>/, ''),
  },
}
for (const [name, s] of Object.entries(sets)) {
  if (s.square === s.rounded || s.symbol === s.rounded) throw new Error(`O SVG de ${name} mudou: atualizar as substituições neste script`)
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png().toBuffer()
async function save(path, buf) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buf)
}

/** Símbolo centrado numa tela transparente (zona segura dos ícones adaptativos do Android). */
async function foreground(svg, size, scale) {
  const inner = Math.round(size * scale)
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await png(svg, inner), gravity: 'center' }]).png().toBuffer()
}

/** Ícone redondo (Android antigo). */
async function round(svg, size) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`)
  return sharp(await png(svg, size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

// Android: densidades mdpi … xxxhdpi
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [name, s] of Object.entries(sets)) {
  for (const [d, k] of Object.entries(dens)) {
    await save(join(RES, `mipmap-${d}`, `${name}.png`), await png(s.rounded, 48 * k))
    await save(join(RES, `mipmap-${d}`, `${name}_round.png`), await round(s.square, 48 * k))
    await save(join(RES, `mipmap-${d}`, `${name}_foreground.png`), await foreground(s.symbol, 108 * k, name === 'ic_notas' ? 0.62 : 0.6))
  }
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/${name}_background"/>
    <foreground android:drawable="@mipmap/${name}_foreground"/>
    <monochrome android:drawable="@mipmap/${name}_foreground"/>
</adaptive-icon>
`
  await save(join(RES, 'mipmap-anydpi-v26', `${name}.xml`), adaptive)
  await save(join(RES, 'mipmap-anydpi-v26', `${name}_round.xml`), adaptive)
}
await save(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${sets.ic_launcher.color}</color>
    <color name="ic_notas_background">${sets.ic_notas.color}</color>
    <color name="splash_background">${BG_APP}</color>
</resources>
`)
// O modelo do Capacitor traz um primeiro plano em vetor que já não é usado.
await rm(join(RES, 'drawable-v24', 'ic_launcher_foreground.xml'), { force: true })
await rm(join(RES, 'drawable', 'ic_launcher_background.xml'), { force: true })

// Ícone das notificações: um sino branco, neutro (não diz "Casulo").
const bell = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>`
for (const [d, k] of Object.entries(dens)) await save(join(RES, `drawable-${d}`, 'ic_stat_lembrete.png'), await png(bell, 24 * k))

// Ecrã de arranque: só a cor de fundo (antes do Android 12 e no iOS).
for (const d of ['drawable', ...Object.keys(dens).flatMap(x => [`drawable-land-${x}`, `drawable-port-${x}`])]) {
  await rm(join(RES, d, 'splash.png'), { force: true })
}
await save(join(RES, 'drawable', 'splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/splash_background"/>
</shape>
`)
const plain = await sharp({ create: { width: 2732, height: 2732, channels: 3, background: BG_APP } }).png().toBuffer()
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) await save(join(IOS, 'Splash.imageset', f), plain)

// iOS: um único ícone de 1024 px (o sistema arredonda os cantos) e o alternativo "Notas".
await save(join(IOS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), await sharp(await png(sets.ic_launcher.square, 1024)).flatten({ background: '#14283a' }).png().toBuffer())
await save(join(IOS, 'Notas.appiconset', 'Notas-1024.png'), await sharp(await png(sets.ic_notas.square, 1024)).flatten({ background: '#e9e4d8' }).png().toBuffer())
await save(join(IOS, 'Notas.appiconset', 'Contents.json'), JSON.stringify({
  images: [{ filename: 'Notas-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n')

// Lojas: ícone de 512 px do Google Play e imagem de destaque de 1024×500.
await save(join(STORE, 'google-play-icone-512.png'), await sharp(await png(sets.ic_launcher.square, 512)).flatten({ background: '#14283a' }).png().toBuffer())
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <radialGradient id="a" cx="18%" cy="30%" r="60%"><stop offset="0" stop-color="#5bcefa" stop-opacity=".35"/><stop offset="1" stop-color="#5bcefa" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="85%" cy="80%" r="55%"><stop offset="0" stop-color="#ff8fb1" stop-opacity=".30"/><stop offset="1" stop-color="#ff8fb1" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1024" height="500" fill="#07080e"/><rect width="1024" height="500" fill="url(#a)"/><rect width="1024" height="500" fill="url(#b)"/>
  <text x="400" y="235" font-family="Unbounded, Fredoka, Arial, sans-serif" font-size="74" letter-spacing="10" fill="#ffffff">CASULO</text>
  <text x="402" y="300" font-family="Arial, sans-serif" font-size="30" fill="#dff3ff">Documentos, saúde, diário e comunidade.</text>
  <text x="402" y="342" font-family="Arial, sans-serif" font-size="30" fill="#dff3ff">Privado, sem conta.</text>
</svg>`
const featurePng = await sharp(Buffer.from(feature)).png().toBuffer()
await save(join(STORE, 'google-play-destaque-1024x500.png'), await sharp(featurePng)
  .composite([{ input: await png(sets.ic_launcher.rounded, 260), left: 100, top: 120 }]).png().toBuffer())

console.log('Ícones, arranque e gráficos das lojas gerados.')
