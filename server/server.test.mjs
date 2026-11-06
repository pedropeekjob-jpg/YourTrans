import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.MOD_TOKEN = 'segredo-de-teste'
const { server } = await import('./index.mjs')
let base
before(async () => { await new Promise(r => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}` })
after(() => server.close())

const post = (p, body, token) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })

test('sugestões só aparecem depois de aprovadas', async () => {
  const r = await post('/api/places', { name: 'Ginásio Exemplo', kind: 'Ginásio', district: 'Lisboa', facilities: { duches: 'individuais', wcNeutro: true } })
  assert.equal(r.status, 201)
  assert.deepEqual(await (await fetch(base + '/api/places')).json(), [])
  const q = await (await fetch(base + '/api/mod/queue', { headers: { authorization: 'Bearer segredo-de-teste' } })).json()
  assert.equal(q.length, 1)
  await post('/api/mod/' + q[0].id, { action: 'approve' }, 'segredo-de-teste')
  const places = await (await fetch(base + '/api/places')).json()
  assert.equal(places[0].facilities.duches, 'individuais')
})

test('locais guardam coordenadas arredondadas e só em Portugal', async () => {
  assert.equal((await post('/api/places', { name: 'Café Fora', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 40.4, lng: -3.7 })).status, 400)
  assert.equal((await post('/api/places', { name: 'Café Meio', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 38.7 })).status, 400)
  assert.equal((await post('/api/places', { name: 'Café Perto', kind: 'Café/Restaurante', district: 'Lisboa', facilities: {}, lat: 38.722345, lng: -9.139312 })).status, 201)
  const q = await (await fetch(base + '/api/mod/queue', { headers: { authorization: 'Bearer segredo-de-teste' } })).json()
  const item = q.find(x => x.payload.name === 'Café Perto')
  await post('/api/mod/' + item.id, { action: 'approve' }, 'segredo-de-teste')
  const p = (await (await fetch(base + '/api/places')).json()).find(x => x.name === 'Café Perto')
  assert.deepEqual([p.lat, p.lng], [38.7223, -9.1393])
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

test('testemunhos: moderados, com respostas moderadas e apoio', async () => {
  const H = { authorization: 'Bearer segredo-de-teste' }
  const story = { kind: 'testemunho', topic: 'mastectomia', phase: 'semanas', title: 'Duas semanas depois', body: 'O mais difícil foi dormir de costas, mas a sensação de liberdade é enorme.' }
  assert.equal((await post('/api/stories', story)).status, 201)
  assert.deepEqual(await (await fetch(base + '/api/stories')).json(), [])
  const q = await (await fetch(base + '/api/mod/queue', { headers: H })).json()
  const sid = q.find(x => x.type === 'story').id
  await post('/api/mod/' + sid, { action: 'approve' }, 'segredo-de-teste')
  assert.equal((await post('/api/replies', { storyId: sid, body: 'Obrigade por partilhares!' })).status, 201)
  assert.equal((await post('/api/replies', { storyId: 'nao-existe', body: 'olá' })).status, 404)
  const rq = await (await fetch(base + '/api/mod/queue', { headers: H })).json()
  await post('/api/mod/' + rq.find(x => x.type === 'reply').id, { action: 'approve' }, 'segredo-de-teste')
  const s = await (await post(`/api/stories/${sid}/support`, {})).json()
  assert.equal(s.support, 1)
  const list = await (await fetch(base + '/api/stories')).json()
  assert.equal(list[0].replies.length, 1)
  assert.equal(list[0].support, 1)
})
