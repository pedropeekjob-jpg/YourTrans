import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.MOD_TOKEN = 'segredo-de-teste'
process.env.RATE_LIMIT = '1000'
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

test('uma denúncia tira do ar o que foi publicado automaticamente', async () => {
  const p = (await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto')
  assert.equal((await post('/api/report/' + p.id, {})).status, 200)
  assert.equal((await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto'), undefined)
  assert.ok((await queue()).find(x => x.id === p.id).flags.includes('denunciado'))
  // Aprovado por uma pessoa: só sai com várias denúncias.
  await post('/api/mod/' + p.id, { action: 'approve' }, 'segredo-de-teste')
  await post('/api/report/' + p.id, {}); await post('/api/report/' + p.id, {})
  assert.ok((await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto'))
  await post('/api/report/' + p.id, {})
  assert.equal((await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto'), undefined)
  assert.equal((await post('/api/report/nao-existe', {})).status, 404)
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
  const r = retriage()
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
