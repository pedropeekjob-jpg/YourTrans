// Gera as páginas públicas que as lojas pedem (sem precisar de abrir a app):
//   casulo.space/privacidade/  (política de privacidade, PT + EN)
//   casulo.space/termos/       (termos de utilização e regras da comunidade, PT + EN)
//   casulo.space/suporte/      (ajuda e contacto, PT + EN)
// A política é lida de src/pages/Privacy.tsx e de src/i18n/en.json, por isso fica sempre igual
// à da app. Os termos e o suporte estão aqui em baixo. Corre sozinho em "npm run build".
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const src = await readFile('src/pages/Privacy.tsx', 'utf8')
const en = JSON.parse(await readFile('src/i18n/en.json', 'utf8'))
const konst = name => src.match(new RegExp(`${name} = '([^']+)'`))?.[1] ?? name
const consts = { PRIVACY_UPDATED: konst('PRIVACY_UPDATED'), PRIVACY_CONTACT: konst('PRIVACY_CONTACT'), PRIVACY_CONTROLLER: konst('PRIVACY_CONTROLLER') }

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fill = (s, args) => s.replace(/\{(\d)\}/g, (_, i) => args[i] ?? '')
const linkify = s => esc(s).replace(/([a-z0-9.-]+@casulo\.space)/g, '<a href="mailto:$1">$1</a>').replace(/www\.cnpd\.pt/g, '<a href="https://www.cnpd.pt">www.cnpd.pt</a>')

/** Blocos da política, pela ordem em que aparecem no ecrã da app. */
function privacyBlocks() {
  const body = src.slice(src.indexOf('export function Privacy()'), src.indexOf('export function ShareNote'))
  const blocks = []
  const re = /(<h3>\{|title=\{|<p className="(?:small|xs muted)">\{|\n\s*)tr\('((?:[^'\\]|\\.)+)'((?:,\s*[A-Z_]+)*)\)/g
  for (const m of body.matchAll(re)) {
    const pt = m[2]
    if (['Privacidade', 'Os teus dados', 'Privacidade e definições', 'Última atualização: {0}'].includes(pt)) continue
    const args = m[3].split(',').map(x => x.trim()).filter(Boolean).map(x => consts[x] ?? x)
    const kind = m[1].startsWith('<h3') || m[1].startsWith('title') ? 'h' : m[1].startsWith('<p') ? 'p' : 'li'
    if (!en[pt]) throw new Error(`Falta a tradução inglesa de: ${pt}`)
    blocks.push({ kind, pt: fill(pt, args), en: fill(en[pt], args) })
  }
  return blocks
}

function renderBlocks(blocks, lang) {
  let html = '', inList = false
  for (const b of blocks) {
    const t = linkify(b[lang])
    if (b.kind === 'li') { if (!inList) { html += '<ul>'; inList = true } html += `<li>${t}</li>`; continue }
    if (inList) { html += '</ul>'; inList = false }
    html += b.kind === 'h' ? `<h3>${t}</h3>` : `<p>${t}</p>`
  }
  return html + (inList ? '</ul>' : '')
}

const terms = {
  pt: `
<p>Estes termos aplicam-se ao Casulo na web (casulo.space) e nas apps da App Store e do Google Play. Ao usar a app aceitas estes termos. Para publicar na comunidade, a app pede que os aceites expressamente.</p>
<h3>1. O que é o Casulo</h3>
<p>O Casulo é um projeto independente, feito por duas pessoas, de apoio a pessoas trans e não-binárias e a quem as apoia: informação sobre documentos, direitos e saúde, um diário privado, lembretes e uma comunidade moderada. É gratuito e não tem publicidade.</p>
<h3>2. Não substitui profissionais</h3>
<p>A informação do Casulo é geral e pode não estar completa ou atualizada para o teu caso. Não é aconselhamento médico, psicológico nem jurídico. Decisões sobre hormonas, cirurgias ou medicação são sempre com profissionais de saúde. Em emergência liga 112 (ou o número de emergência do teu país).</p>
<h3>3. Sem conta, dados no teu aparelho</h3>
<p>Não há conta. O que registas fica cifrado no teu aparelho e é da tua responsabilidade guardar o código e fazer cópias de segurança: se perderes o aparelho ou o código, não conseguimos recuperar os dados. A forma como tratamos o que partilhas está na <a href="../privacidade/">política de privacidade</a>.</p>
<h3>4. Regras da comunidade (tolerância zero)</h3>
<ul>
<li>Não é permitido: assédio, discurso de ódio, transfobia, ameaças, conteúdo sexual explícito ou violento, incentivo a autolesão, spam ou publicidade.</li>
<li>Não é permitido revelar a identidade de género de alguém ("outing"), nem partilhar dados, fotos ou capturas de outras pessoas sem consentimento.</li>
<li>Não é permitido dar indicações de doses ou de medicação, nem promover práticas de "conversão" (crime em Portugal, Lei 15/2024).</li>
<li>Avaliações de profissionais, empregadores e locais devem ser honestas e baseadas na tua experiência.</li>
</ul>
<h3>5. Moderação, denúncia e bloqueio</h3>
<p>Tudo o que é enviado passa por um filtro automático e o que levanta dúvidas é revisto por uma pessoa antes de aparecer. Qualquer pessoa pode denunciar conteúdo publicado e bloquear quem o publicou (o bloqueio fica no teu aparelho). Revemos as denúncias no prazo de 24 horas: retiramos o conteúdo que viola estas regras e impedimos quem o publicou de voltar a publicar. Podemos recusar ou retirar qualquer conteúdo sem aviso.</p>
<h3>6. O que publicas</h3>
<p>Continuas a ser autor/a/e do que escreves. Ao publicar, autorizas-nos a mostrar esse conteúdo gratuitamente na app enquanto estiver publicado. Podes pedir a remoção a qualquer momento para o contacto abaixo.</p>
<h3>7. Idade</h3>
<p>Para publicar na comunidade deves ter pelo menos 13 anos (idade de consentimento digital em Portugal) ou a idade mínima exigida no teu país.</p>
<h3>8. Responsabilidade</h3>
<p>Fazemos o possível para que a app funcione e a informação esteja correta, mas a app é fornecida tal como está. Na medida permitida por lei, não respondemos por danos resultantes do uso da informação ou do conteúdo publicado por outras pessoas. Nada nestes termos limita os teus direitos enquanto consumidor/a/e.</p>
<h3>9. Lojas de apps</h3>
<p>Estes termos são entre ti e o Casulo, não com a Apple nem com a Google. A Apple e a Google não têm obrigação de dar apoio à app. Se usares a app de uma loja, aplicam-se também os termos dessa loja (no caso da Apple, o contrato de licença padrão para apps, "Standard EULA").</p>
<h3>10. Alterações e lei aplicável</h3>
<p>Se estes termos mudarem, atualizamos a data e avisamos na app quando a mudança for importante. Aplica-se a lei portuguesa.</p>
<h3>Contacto</h3>
<p><a href="mailto:${consts.PRIVACY_CONTACT}">${consts.PRIVACY_CONTACT}</a></p>`,
  en: `
<p>These terms apply to Casulo on the web (casulo.space) and in the App Store and Google Play apps. By using the app you accept these terms. Before you post in the community, the app asks you to accept them explicitly.</p>
<h3>1. What Casulo is</h3>
<p>Casulo is an independent project, made by two people, supporting trans and non-binary people and those who support them: information on documents, rights and health, a private journal, reminders and a moderated community. It is free and has no ads.</p>
<h3>2. Not a substitute for professionals</h3>
<p>Casulo's information is general and may not be complete or up to date for your situation. It is not medical, psychological or legal advice. Decisions about hormones, surgery or medication are always for health professionals. In an emergency call 112 (or your country's emergency number).</p>
<h3>3. No account, data on your device</h3>
<p>There is no account. What you record stays encrypted on your device, and keeping your code and backups safe is up to you: if you lose your device or your code, we cannot recover your data. How we handle what you share is set out in the <a href="../privacidade/#en">privacy policy</a>.</p>
<h3>4. Community rules (zero tolerance)</h3>
<ul>
<li>Not allowed: harassment, hate speech, transphobia, threats, explicit sexual or violent content, encouraging self-harm, spam or advertising.</li>
<li>Not allowed: revealing someone's gender identity ("outing"), or sharing other people's details, photos or screenshots without consent.</li>
<li>Not allowed: dose or medication instructions, or promoting "conversion" practices (a crime in Portugal, Law 15/2024).</li>
<li>Reviews of professionals, employers and places must be honest and based on your own experience.</li>
</ul>
<h3>5. Moderation, reporting and blocking</h3>
<p>Everything submitted goes through an automatic filter, and anything doubtful is reviewed by a person before it appears. Anyone can report published content and block whoever posted it (the block stays on your device). We review reports within 24 hours: we remove content that breaks these rules and stop whoever posted it from posting again. We may refuse or remove any content without notice.</p>
<h3>6. What you post</h3>
<p>You remain the author of what you write. By posting, you allow us to show that content free of charge in the app while it is published. You can ask us to remove it at any time at the contact below.</p>
<h3>7. Age</h3>
<p>To post in the community you must be at least 13 (the age of digital consent in Portugal) or the minimum age required in your country.</p>
<h3>8. Liability</h3>
<p>We do our best to keep the app working and the information accurate, but the app is provided as is. To the extent permitted by law, we are not liable for damage resulting from the use of the information or from content posted by others. Nothing in these terms limits your rights as a consumer.</p>
<h3>9. App stores</h3>
<p>These terms are between you and Casulo, not Apple or Google. Apple and Google have no obligation to provide support for the app. If you use the app from a store, that store's terms also apply (for Apple, the Standard Licensed Application End User License Agreement).</p>
<h3>10. Changes and governing law</h3>
<p>If these terms change, we update the date and let you know in the app when the change is significant. Portuguese law applies.</p>
<h3>Contact</h3>
<p><a href="mailto:${consts.PRIVACY_CONTACT}">${consts.PRIVACY_CONTACT}</a></p>`,
}

const support = {
  pt: `
<p>O Casulo é feito por duas pessoas. Respondemos a todas as mensagens, normalmente em poucos dias.</p>
<p class="cta"><a href="mailto:${consts.PRIVACY_CONTACT}?subject=Casulo">Escrever-nos: ${consts.PRIVACY_CONTACT}</a></p>
<p><b>Em perigo agora?</b> Liga 112. Em Portugal, para apoio emocional: SOS Voz Amiga 213 544 545 · SNS 24 (808 24 24 24, opção 4).</p>
<h3>Perguntas frequentes</h3>
<h4>Esqueci-me do código. Consigo recuperar os dados?</h4>
<p>Só com o código de recuperação que a app te mostrou quando criaste o código. Não temos cópia dos teus dados, por isso não os conseguimos recuperar por ti.</p>
<h4>Como passo os dados para outro telemóvel?</h4>
<p>Na app: Eu › Os teus dados › Passar para outro aparelho (por QR), ou faz uma cópia de segurança cifrada e importa-a no aparelho novo.</p>
<h4>Como torno a app mais discreta?</h4>
<p>Em Definições: código de acesso, bloqueio automático, ícone discreto (e, no Android, nome "Notas"), notificações com texto neutro e modo privado com saída rápida.</p>
<h4>Como denuncio ou bloqueio alguém?</h4>
<p>Em cada testemunho, resposta ou comentário há "Denunciar" e "Bloquear". A moderação revê as denúncias em 24 horas.</p>
<h4>Como apago os meus dados?</h4>
<p>No aparelho: Definições › Apagar tudo. O que publicaste na comunidade: escreve-nos a dizer qual foi o conteúdo e apagamo-lo.</p>
<p><a href="../privacidade/">Política de privacidade</a> · <a href="../termos/">Termos de utilização</a></p>`,
  en: `
<p>Casulo is made by two people. We answer every message, usually within a few days.</p>
<p class="cta"><a href="mailto:${consts.PRIVACY_CONTACT}?subject=Casulo">Write to us: ${consts.PRIVACY_CONTACT}</a></p>
<p><b>In danger right now?</b> Call 112 (or your local emergency number).</p>
<h3>Frequently asked questions</h3>
<h4>I forgot my code. Can I get my data back?</h4>
<p>Only with the recovery code the app showed you when you set your code. We have no copy of your data, so we cannot recover it for you.</p>
<h4>How do I move my data to another phone?</h4>
<p>In the app: Me › Your data › Move to another device (by QR), or make an encrypted backup and import it on the new device.</p>
<h4>How do I make the app more discreet?</h4>
<p>In Settings: passcode, auto-lock, discreet icon (and on Android the name "Notes"), neutral notification text and private mode with quick exit.</p>
<h4>How do I report or block someone?</h4>
<p>Every story, reply and comment has "Report" and "Block". Moderators review reports within 24 hours.</p>
<h4>How do I delete my data?</h4>
<p>On the device: Settings › Delete everything. For anything you posted in the community, write to us saying which content it was and we will delete it.</p>
<p><a href="../privacidade/#en">Privacy policy</a> · <a href="../termos/#en">Terms of use</a></p>`,
}

const page = (path, titlePt, titleEn, pt, enHtml) => `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${titlePt} · Casulo</title>
<link rel="icon" href="../casulo-192.png" type="image/png">
<style>
:root { color-scheme: dark light; --bg: #07080e; --fg: #eef2f8; --muted: #a7b0c0; --accent: #5bcefa; --card: #11131d; }
@media (prefers-color-scheme: light) { :root { --bg: #f7f5f1; --fg: #14131b; --muted: #555; --accent: #2a78ad; --card: #fff; } }
* { box-sizing: border-box }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif }
main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px }
header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px }
header img { width: 40px; height: 40px; border-radius: 10px }
h1 { font-size: 1.6rem; margin: 0 } h2 { margin-top: 48px; font-size: 1.3rem } h3 { margin-top: 28px; font-size: 1.05rem } h4 { margin: 20px 0 4px; font-size: 1rem }
a { color: var(--accent) } .muted { color: var(--muted); font-size: .9rem }
nav a { margin-right: 16px } section { background: var(--card); border-radius: 16px; padding: 4px 20px 20px; margin-top: 24px }
ul { padding-left: 20px } li { margin: 6px 0 } .cta a { font-weight: 600 }
</style>
</head>
<body>
<main>
<header><img src="../casulo-192.png" alt=""><h1>${titlePt}</h1></header>
<nav class="muted"><a href="#pt">Português</a><a href="#en">English</a><a href="https://casulo.space/">casulo.space</a></nav>
<section id="pt" lang="pt-PT">
<p class="muted">Última atualização: ${consts.PRIVACY_UPDATED}</p>
${pt}
</section>
<section id="en" lang="en">
<h2>${titleEn}</h2>
<p class="muted">Last updated: ${consts.PRIVACY_UPDATED}</p>
${enHtml}
</section>
</main>
</body>
</html>
`

const blocks = privacyBlocks()
const out = {
  'public/privacidade/index.html': page('privacidade', 'Política de privacidade', 'Privacy policy', renderBlocks(blocks, 'pt'), renderBlocks(blocks, 'en')),
  'public/termos/index.html': page('termos', 'Termos de utilização', 'Terms of use', terms.pt, terms.en),
  'public/suporte/index.html': page('suporte', 'Ajuda e contacto', 'Help and contact', support.pt, support.en),
}
for (const [path, html] of Object.entries(out)) {
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true })
  await writeFile(path, html)
}
console.log(`Páginas legais geradas (${blocks.length} blocos da política de privacidade).`)
