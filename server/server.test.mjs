import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.MOD_TOKEN = 'segredo-de-teste'
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
