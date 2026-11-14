import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.MOD_TOKEN = 'segredo-de-teste'
process.env.RATE_LIMIT = '1000'
process.env.MOD_TOKENS = 'Ana:codigo-da-ana-123456, Curto:123'
process.env.DATA_KEY = 'chave-de-teste'
const { server } = await import('./index.mjs')
let base
before(async () => { await new Promise(r => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}` })
after(() => server.close())

const post = (p, body, token) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })

const H = { authorization: 'Bearer segredo-de-teste' }
const queue = async (q = 'status=pending') => (await fetch(base + '/api/mod/queue?' + q, { headers: H })).json()

test('o que está limpo é publicado logo; o suspeito fica à espera', async () => {
  const ok = await post('/api/places', { name: 'Ginásio Exemplo', kind: 'Ginásio', district: 'Lisboa', facilities: { duches: 'individuais', wcNeutro: true } })
  assert.equal(ok.status, 201)
  assert.equal((await ok.json()).published, true)
  const bad = await (await post('/api/places', { name: 'Café Mau', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, notes: 'cheio de travecos' })).json()
  assert.equal(bad.published, false)
  const places = await (await fetch(base + '/api/places')).json()
  assert.deepEqual(places.map(p => p.name), ['Ginásio Exemplo'])
  assert.equal(places[0].facilities.duches, 'individuais')
  const q = await queue()
  assert.deepEqual(q.find(x => x.payload.name === 'Café Mau').flags, ['ódio ou insulto'])
  assert.equal((await queue('status=approved&auto=1')).length, 1)
})

test('locais guardam coordenadas arredondadas e só em Portugal', async () => {
  assert.equal((await post('/api/places', { name: 'Café Fora', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 40.4, lng: -3.7 })).status, 400)
  assert.equal((await post('/api/places', { name: 'Café Meio', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 38.7 })).status, 400)
  assert.equal((await post('/api/places', { name: 'Café Perto', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 38.722345, lng: -9.139312 })).status, 201)
  const p = (await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto')
  assert.deepEqual([p.lat, p.lng], [38.7223, -9.1393])
})

/** Denúncia vinda de uma ligação diferente (o servidor usa o IP só para contar pessoas distintas). */
const report = (id, ip) => fetch(base + '/api/report/' + id, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: '{}' })
const placeVisible = async name => !!(await (await fetch(base + '/api/places')).json()).find(x => x.name === name)

test('denúncias: 2 pessoas tiram o automático, 3 o aprovado; a mesma pessoa só conta uma vez', async () => {
  const p = (await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto')
  assert.equal((await report(p.id, '10.0.0.1')).status, 200)
  assert.equal((await report(p.id, '10.0.0.1')).status, 200)
  assert.ok(await placeVisible('Café Perto'), 'uma só pessoa não chega para tirar do ar')
  await report(p.id, '10.0.0.2')
  assert.equal(await placeVisible('Café Perto'), false)
  assert.ok((await queue()).find(x => x.id === p.id).flags.includes('denunciado'))
  // Aprovado por uma pessoa: só sai com 3 denúncias de ligações diferentes (as antigas não contam).
  await post('/api/mod/' + p.id, { action: 'approve' }, 'segredo-de-teste')
  await report(p.id, '10.0.0.1'); await report(p.id, '10.0.0.2')
  assert.ok(await placeVisible('Café Perto'))
  await report(p.id, '10.0.0.3')
  assert.equal(await placeVisible('Café Perto'), false)
  assert.equal((await report('nao-existe', '10.0.0.9')).status, 404)
})

test('o X-Forwarded-For falsificado não engana a contagem', async () => {
  const r = await (await post('/api/places', { name: 'Loja Falsa', kind: 'Loja', district: 'Porto', facilities: {} })).json()
  assert.equal(r.published, true)
  const id = (await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Loja Falsa').id
  // O cliente escolhe o primeiro valor; o proxy acrescenta o verdadeiro no fim.
  for (const fake of ['1.1.1.1', '2.2.2.2']) {
    await fetch(base + '/api/report/' + id, { method: 'POST', headers: { 'x-forwarded-for': `${fake}, 9.9.9.9` }, body: '{}' })
  }
  assert.ok(await placeVisible('Loja Falsa'))
})

test('ações de moderação ficam registadas com o nome', async () => {
  const log = await (await fetch(base + '/api/mod/log', { headers: H })).json()
  assert.ok(log.some(l => l.moderator === 'equipa' && l.action === 'approve' && l.type === 'place'))
  assert.equal((await fetch(base + '/api/mod/log')).status, 401)
})

test('profissionais de saúde esperam sempre por uma pessoa', async () => {
  const r = await (await post('/api/providers', { name: 'Clínica Limpa', kind: 'Psicologia', district: 'Porto', sector: 'Privado' })).json()
  assert.equal(r.published, false)
  assert.deepEqual((await queue()).find(x => x.payload.name === 'Clínica Limpa').flags, [])
})

test('rejeita dados inválidos e moderação sem token', async () => {
  assert.equal((await post('/api/places', { name: 'x' })).status, 400)
  assert.equal((await fetch(base + '/api/mod/queue')).status, 401)
})

test('sinaliza contactos pessoais em comentários', async () => {
  await post('/api/providers', { name: 'Clínica Teste', kind: 'Psicologia', district: 'Porto', sector: 'Privado', notes: 'liga 912 345 678' })
  const q = await (await fetch(base + '/api/mod/queue', { headers: { authorization: 'Bearer segredo-de-teste' } })).json()
  assert.ok(q.find(x => x.type === 'provider').flags.includes('telefone'))
})

test('estatísticas de incidentes respeitam k-anonimato', async () => {
  for (let i = 0; i < 4; i++) await post('/api/incidents', { kind: 'Agressão física', setting: 'Rua/transportes', district: 'Faro', reported: false })
  let s = await (await fetch(base + '/api/incidents/stats')).json()
  assert.equal(s.byDistrict.Faro, undefined)
  await post('/api/incidents', { kind: 'Agressão física', setting: 'Rua/transportes', district: 'Faro', reported: true })
  s = await (await fetch(base + '/api/incidents/stats')).json()
  assert.equal(s.byDistrict.Faro, 5)
})

test('testemunhos e respostas limpos são publicados, com apoio', async () => {
  const story = { kind: 'testemunho', topic: 'mastectomia', phase: 'semanas', title: 'Duas semanas depois', body: 'O mais difícil foi dormir de costas, mas a sensação de liberdade é enorme.' }
  assert.equal((await (await post('/api/stories', story)).json()).published, true)
  const sid = (await (await fetch(base + '/api/stories')).json())[0].id
  assert.equal((await (await post('/api/replies', { storyId: sid, body: 'Obrigade por partilhares!' })).json()).published, true)
  assert.equal((await post('/api/replies', { storyId: 'nao-existe', body: 'olá' })).status, 404)
  // O mesmo texto outra vez é tratado como repetido.
  assert.equal((await (await post('/api/stories', story)).json()).published, false)
  const s = await (await post(`/api/stories/${sid}/support`, {})).json()
  assert.equal(s.support, 1)
  const list = await (await fetch(base + '/api/stories')).json()
  assert.equal(list.length, 1)
  assert.equal(list[0].replies.length, 1)
  assert.equal(list[0].support, 1)
})

test('risco de autolesão vai para o topo da fila', async () => {
  await post('/api/stories', { kind: 'pergunta', topic: 'emocional', phase: 'antes', title: 'Não sei o que fazer', body: 'Já não aguento mais, às vezes penso em suicídio e não sei a quem pedir ajuda.' })
  const q = await queue()
  assert.ok(q[0].flags.includes('risco de autolesão'))
})

test('rever a fila publica o que estava à espera e está limpo', async () => {
  const { retriage } = await import('./index.mjs')
  const before = (await queue()).length
  const r = await retriage()
  assert.equal(r.checked, before)
  assert.equal(r.published, 0) // o que está na fila é suspeito ou é de profissionais
  assert.equal((await post('/api/mod/retriage', {})).status, 401)
})

test('relatos de custos e esperas só aparecem como intervalo com 3 ou mais', async () => {
  const y = new Date().getUTCFullYear()
  const send = (value, extra = {}) => post('/api/experiences', { track: 'mastectomia', kind: 'custo', sector: 'Privado', year: y, value, ...extra })
  assert.equal((await send(5000)).status, 201)
  assert.equal((await send(7000)).status, 201)
  assert.deepEqual(await (await fetch(base + '/api/experiences')).json(), [])
  const r = await (await send(6000, { comment: 'texto que não é guardado' })).json()
  assert.equal(r.published, true)
  const [s] = await (await fetch(base + '/api/experiences')).json()
  assert.deepEqual(s, { track: 'mastectomia', kind: 'custo', sector: 'Privado', n: 3, min: 5000, max: 7000, median: 6000, fromYear: y, toYear: y })
  // Inválidos: custo no SNS, ano antigo, parte desconhecida, material sem item.
  assert.equal((await send(100, { sector: 'SNS' })).status, 400)
  assert.equal((await send(100, { year: y - 9 })).status, 400)
  assert.equal((await send(100, { track: 'outra' })).status, 400)
  assert.equal((await post('/api/experiences', { track: 'mastectomia', kind: 'material', sector: 'Privado', year: y, value: 60 })).status, 400)
  assert.equal((await post('/api/experiences', { track: 'mastectomia', kind: 'espera', sector: 'SNS', year: y, value: 18 })).status, 201)
})

test('avaliações de etapas: percentagens com 3 ou mais e comentários moderados', async () => {
  const a = { respeito: true, informacao: false, tempoRazoavel: false, recomendaria: true }
  assert.equal((await post('/api/stage-reviews', { track: 'inicio', answers: a, comment: 'A médica de família foi impecável e pediu logo a consulta.' })).status, 201)
  let [s] = await (await fetch(base + '/api/stage-reviews')).json()
  assert.equal(s.scores, undefined)
  assert.equal(s.comments.length, 1)
  await post('/api/stage-reviews', { track: 'inicio', answers: a })
  await post('/api/stage-reviews', { track: 'inicio', answers: { ...a, respeito: false } })
  ;[s] = await (await fetch(base + '/api/stage-reviews')).json()
  assert.equal(s.n, 3)
  assert.equal(Math.round(s.scores.respeito * 100), 67)
  const bad = await (await post('/api/stage-reviews', { track: 'inicio', answers: a, comment: 'liga-me para o 912345678' })).json()
  assert.equal(bad.published, false)
})

test('cirurgiões guardam onde operam e a pesquisa encontra-os pelo hospital', async () => {
  const r = await post('/api/providers', { name: 'Dr.ª Exemplo', kind: 'Cirurgia', district: 'Lisboa', sector: 'Privado', person: true, worksAt: ['Hospital A', ' Clínica B '] })
  assert.equal(r.status, 201)
  const [item] = (await queue()).filter(x => x.payload.name === 'Dr.ª Exemplo')
  assert.deepEqual(item.payload.worksAt, ['Hospital A', 'Clínica B'])
  assert.equal(item.payload.person, true)
  assert.equal((await post('/api/providers', { name: 'Dr. X', kind: 'Cirurgia', district: 'Lisboa', sector: 'Privado', worksAt: 'Hospital A' })).status, 400)
})

test('selo: registo sempre moderado, e-mail nunca público, selo com 3 avaliações boas', async () => {
  const all = { nome: true, wc: true, formacao: true, regras: true, contacto: true, formularios: true }
  const e = { name: 'Ginásio Arco-Íris', kind: 'Ginásio', district: 'Porto', contact: 'geral@exemplo.pt', commitments: all, transparente: true, lat: 41.15, lng: -8.61, facilities: { wcNeutro: true } }
  assert.equal((await post('/api/entities', { ...e, commitments: { ...all, formacao: false } })).status, 400)
  assert.equal((await post('/api/entities', { ...e, contact: 'sem-email' })).status, 400)
  assert.equal((await post('/api/entities', { ...e, url: 'http://inseguro.pt' })).status, 400)
  const r = await (await post('/api/entities', e)).json()
  assert.equal(r.published, false)
  assert.deepEqual(await (await fetch(base + '/api/entities')).json(), [])
  const [item] = (await queue()).filter(x => x.type === 'entity')
  assert.equal(item.payload.contact, 'geral@exemplo.pt')
  assert.equal((await post('/api/seal-reviews', { entityId: item.id, answers: { nomeCerto: true, seguro: true, wc: null, recomendaria: true } })).status, 404)
  await post('/api/mod/' + item.id, { action: 'approve' }, 'segredo-de-teste')

  let [ent] = await (await fetch(base + '/api/entities')).json()
  assert.equal(ent.contact, undefined)
  assert.equal(ent.seal, 'em-avaliacao')
  assert.equal(ent.transparente, true)
  const good = { nomeCerto: true, seguro: true, wc: null, recomendaria: true }
  for (let i = 0; i < 3; i++) assert.equal((await post('/api/seal-reviews', { entityId: ent.id, answers: good })).status, 201)
  ;[ent] = await (await fetch(base + '/api/entities')).json()
  assert.equal(ent.seal, 'selo')
  assert.equal(ent.scores.wc, undefined)
  await post('/api/seal-reviews', { entityId: ent.id, answers: { ...good, seguro: false }, comment: 'Na receção trataram-me pelo nome morto.' })
  ;[ent] = await (await fetch(base + '/api/entities')).json()
  assert.equal(ent.seal, 'sem-selo')
  assert.equal(ent.comments.length, 1)
  assert.equal((await post('/api/seal-reviews', { entityId: ent.id, answers: { ...good, seguro: null } })).status, 400)
})

test('sugestões "procurei e não encontrei" só a equipa as vê', async () => {
  assert.equal((await post('/api/wishes', { kind: 'procurei', text: 'x' })).status, 400)
  assert.equal((await post('/api/wishes', { kind: 'gostava', text: 'Lista de cabeleireiros seguros', area: 'inventada' })).status, 400)
  const r = await post('/api/wishes', { kind: 'procurei', text: 'Onde mudar o nome na carta de condução', area: 'documentos', country: 'PT', extra: 'descartado' })
  assert.equal(r.status, 201)
  assert.equal((await r.json()).published, false)
  const q = await queue('status=received&type=wish')
  assert.deepEqual(q.map(x => x.payload), [{ kind: 'procurei', text: 'Onde mudar o nome na carta de condução', area: 'documentos', country: 'PT' }])
  assert.ok((await queue('status=received&type=incident')).every(x => x.type === 'incident'))
})

test('eventos só aceitam ligações https e aparecem logo depois de publicados', async () => {
  const date = new Date(Date.now() + 7 * 86_400_000).toISOString()
  assert.equal((await post('/api/events', { title: 'Marcha teste', date, url: 'javascript:alert(1)' })).status, 400)
  assert.equal((await post('/api/events', { title: 'Marcha teste', date, url: 'http://exemplo.pt' })).status, 400)
  const before = await (await fetch(base + '/api/events')).json()
  assert.equal((await post('/api/events', { title: 'Marcha teste', date, url: 'https://exemplo.pt' })).status, 201)
  const after = await (await fetch(base + '/api/events')).json()
  assert.equal(after.length, before.length + 1)
})

test('cada moderadora tem o seu código; códigos curtos são ignorados', async () => {
  const ana = { authorization: 'Bearer codigo-da-ana-123456' }
  assert.equal((await fetch(base + '/api/mod/queue', { headers: ana })).status, 200)
  assert.equal((await fetch(base + '/api/mod/queue', { headers: { authorization: 'Bearer 123' } })).status, 401)
  await fetch(base + '/api/mod/retriage', { method: 'POST', headers: ana })
  const log = await (await fetch(base + '/api/mod/log', { headers: ana })).json()
  assert.equal(log[0].moderator, 'Ana')
})

test('contactos de mentoria ficam cifrados e só a moderação os lê', async () => {
  assert.equal((await post('/api/mentorship', { role: 'mentee', nickname: 'Rio', stage: 'início', topics: ['hormonas'], contact: 'rio@exemplo.pt' })).status, 201)
  const item = (await queue()).find(x => x.type === 'mentorship' && x.payload.nickname === 'Rio')
  assert.equal(item.payload.contact, 'rio@exemplo.pt')
})

test('bloquear um autor: as publicações saem e as novas ficam à espera', async () => {
  const author = 'aparelho-de-teste-0123456789'
  const s1 = await (await post('/api/stories', { kind: 'testemunho', topic: 'voz', phase: 'meses', title: 'A minha voz', body: 'Um texto calmo com mais de vinte letras.', author })).json()
  assert.equal(s1.published, true)
  const story = (await (await fetch(base + '/api/stories')).json()).find(x => x.title === 'A minha voz')
  assert.match(story.author, /^[\w-]{16}$/)
  assert.ok(!JSON.stringify(story).includes(author), 'o código do aparelho nunca é publicado')
  assert.equal((await (await post('/api/mod/' + story.id, { action: 'ban' }, 'segredo-de-teste')).json()).hidden, 1)
  assert.equal((await (await fetch(base + '/api/stories')).json()).find(x => x.title === 'A minha voz'), undefined)
  const s2 = await (await post('/api/stories', { kind: 'testemunho', topic: 'voz', phase: 'meses', title: 'Outra vez', body: 'Outro texto calmo com mais de vinte letras.', author })).json()
  assert.equal(s2.published, false)
  assert.ok((await queue()).find(x => x.payload.title === 'Outra vez').flags.includes('autor bloqueado'))
  // Outro aparelho continua a publicar normalmente.
  assert.equal((await (await post('/api/stories', { kind: 'testemunho', topic: 'voz', phase: 'meses', title: 'De outra pessoa', body: 'Mais um texto calmo com vinte letras.', author: 'outro-aparelho-0123456789' })).json()).published, true)
})

test('lembretes: guarda só horas futuras, envia vazio e apaga depois de enviar', async () => {
  const { push } = await import('./index.mjs')
  const key = (await (await fetch(base + '/api/push/key')).json()).key
  assert.equal(Buffer.from(key, 'base64url').length, 65)
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'x', auth: 'y' } }
  assert.equal((await post('/api/push/sync', { subscription: { endpoint: 'https://exemplo.pt/roubar' }, times: [] })).status, 400)
  const soon = Date.now() + 120_000
  const r = await (await post('/api/push/sync', { subscription: sub, times: [soon, Date.now() - 1000, soon] })).json()
  assert.equal(r.scheduled, 1)
  const calls = []
  const fake = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 201 } }
  assert.equal(await push.sendDue(fake), 0, 'ainda não está na hora')
  const realNow = Date.now
  Date.now = () => soon + 60_000
  try { assert.equal(await push.sendDue(fake), 1) } finally { Date.now = realNow }
  assert.equal(calls[0].url, sub.endpoint)
  assert.equal(calls[0].init.body, undefined, 'a notificação vai sem conteúdo')
  assert.match(calls[0].init.headers.authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/)
  Date.now = () => soon + 120_000
  try { assert.equal(await push.sendDue(fake), 0, 'cada hora só é enviada uma vez') } finally { Date.now = realNow }
})
