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

/* ---------- pacotes para entidades ---------- */

const MOD = 'segredo-de-teste'
const commitments = { nome: true, wc: true, formacao: true, regras: true, contacto: true, formularios: true }
async function newEntity(name, kind = 'Empresa', district = 'Porto') {
  const r = await (await post('/api/entities', { name, kind, district, contact: 'rh@exemplo.pt', commitments })).json()
  await post('/api/mod/' + r.id, { action: 'approve' }, MOD)
  return r
}
const until = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)

test('uma entidade recebe uma chave ao registar-se e sem pacote não edita a ficha', async () => {
  const { id, key } = await newEntity('Empresa Chave Lda')
  assert.ok(key.length >= 20)
  assert.equal((await post('/api/entity/me', { id, key: 'errada' })).status, 401)
  const me = await (await post('/api/entity/me', { id, key })).json()
  assert.equal(me.entity.name, 'Empresa Chave Lda')
  assert.equal(me.entity.contact, undefined)
  assert.equal(me.plan, null)
  assert.equal((await post('/api/entity/profile', { id, key, profile: { about: 'Olá' } })).status, 402)
  // A moderação pode dar uma chave nova: a antiga deixa de servir.
  const { key: k2 } = await (await post('/api/mod/entity-key', { entityId: id }, MOD)).json()
  assert.equal((await post('/api/entity/me', { id, key })).status, 401)
  assert.equal((await post('/api/entity/me', { id, key: k2 })).status, 200)
})

test('pacote Aliada: ficha completa, rótulo pago e 5 ofertas de emprego por ano', async () => {
  const { id, key } = await newEntity('Aliada Exemplo SA')
  assert.equal((await post('/api/mod/plan', { entityId: id, plan: 'aliada', until })).status, 401)
  assert.equal((await post('/api/mod/plan', { entityId: id, plan: 'inventado', until }, MOD)).status, 400)
  assert.equal((await post('/api/mod/plan', { entityId: id, plan: 'aliada', until }, MOD)).status, 200)
  assert.equal((await post('/api/entity/profile', { id, key, profile: { contactUrl: 'http://inseguro.pt' } })).status, 400)
  const r = await (await post('/api/entity/profile', { id, key, profile: { about: 'Somos uma empresa de software no Porto.', policies: ['nome', 'wc'], services: [{ kind: 'voz', price: 40, online: true }] } })).json()
  assert.equal(r.published, true)
  const e = (await (await fetch(base + '/api/entities')).json()).find(x => x.id === id)
  assert.equal(e.partner, 'aliada')
  assert.deepEqual(e.profile.policies, ['nome', 'wc'])
  assert.equal(e.profile.services, undefined) // serviços só para profissionais
  const job = { title: 'Pessoa programadora', district: 'Porto', remote: true, url: 'https://exemplo.pt/vaga' }
  for (let i = 0; i < 5; i++) assert.equal((await post('/api/entity/jobs', { id, key, job: { ...job, title: job.title + ' ' + i } })).status, 201)
  assert.equal((await post('/api/entity/jobs', { id, key, job })).status, 402)
  const jobs = await (await fetch(base + '/api/jobs')).json()
  assert.equal(jobs.filter(j => j.entityId === id).length, 5)
  assert.equal(jobs[0].entityName, 'Aliada Exemplo SA')
  // Pacote expirado: as ofertas e a ficha deixam de aparecer; o selo e as avaliações ficam.
  await post('/api/mod/plan', { entityId: id, plan: 'aliada', until: '2020-01-01' }, MOD)
  assert.equal((await (await fetch(base + '/api/jobs')).json()).filter(j => j.entityId === id).length, 0)
  const e2 = (await (await fetch(base + '/api/entities')).json()).find(x => x.id === id)
  assert.equal(e2.partner, undefined)
  assert.equal(e2.profile, undefined)
})

test('pagar não muda a ordem das entidades nem o selo', async () => {
  const before = (await (await fetch(base + '/api/entities')).json()).map(e => [e.id, e.seal])
  const { id } = await newEntity('Ordem Exemplo')
  await post('/api/mod/plan', { entityId: id, plan: 'parceira', until }, MOD)
  const after = (await (await fetch(base + '/api/entities')).json())
  assert.equal(after[0].id, id) // a mais recente primeiro, como sempre
  assert.equal(after[0].seal, 'em-avaliacao')
  assert.deepEqual(after.slice(1).map(e => [e.id, e.seal]), before)
})

test('relatório da entidade só com 5 ou mais avaliações, sem comentários', async () => {
  const { id, key } = await newEntity('Relatório Exemplo', 'Ginásio')
  await post('/api/mod/plan', { entityId: id, plan: 'aliada', until }, MOD)
  const good = { nomeCerto: true, seguro: true, wc: null, recomendaria: true }
  for (let i = 0; i < 4; i++) await post('/api/seal-reviews', { entityId: id, answers: good, comment: 'Correu bem.' })
  let rep = await (await post('/api/entity/report', { id, key })).json()
  assert.equal(rep.enough, false)
  assert.equal(rep.reviews, undefined)
  assert.equal(rep.scores, undefined)
  await post('/api/seal-reviews', { entityId: id, answers: { ...good, seguro: false } })
  rep = await (await post('/api/entity/report', { id, key })).json()
  assert.equal(rep.reviews, 5)
  assert.equal(rep.scores.seguro, 0.8)
  assert.equal(rep.scores.wc, undefined) // ninguém respondeu: não aparece
  assert.equal(JSON.stringify(rep).includes('Correu bem'), false)
})

test('autarquia vê incidentes do distrito só em grupos de 5 ou mais', async () => {
  const { id, key } = await newEntity('Câmara Exemplo', 'Serviço público', 'Beja')
  await post('/api/mod/plan', { entityId: id, plan: 'municipio', until, district: 'Beja' }, MOD)
  for (let i = 0; i < 5; i++) await post('/api/incidents', { kind: 'Insulto', setting: 'Rua', district: 'Beja', reported: false })
  await post('/api/incidents', { kind: 'Agressão', setting: 'Rua', district: 'Beja', reported: false })
  const rep = await (await post('/api/entity/report', { id, key })).json()
  assert.equal(rep.incidents.district, 'Beja')
  assert.equal(rep.incidents.total, 6)
  assert.deepEqual(rep.incidents.byKind, { Insulto: 5 })
  assert.deepEqual(rep.incidents.bySetting, { Rua: 6 })
})

test('serviços especializados e sessões solidárias', async () => {
  const { id, key } = await newEntity('Terapia da Fala Exemplo', 'Saúde', 'Lisboa')
  await post('/api/mod/plan', { entityId: id, plan: 'profissional', until }, MOD)
  await post('/api/entity/profile', { id, key, profile: { bookingUrl: 'https://agenda.exemplo.pt', vouchers: true, services: [{ kind: 'voz', price: 45, online: true }, { kind: 'voz', price: 10, online: false }] } })
  const svc = (await (await fetch(base + '/api/services')).json()).find(s => s.entityId === id)
  assert.deepEqual(svc.services, [{ kind: 'voz', price: 45, online: true }])
  assert.equal(svc.vouchers, true)
  // Sem reserva, não há códigos.
  assert.equal((await post('/api/vouchers', { kind: 'voz' })).status, 409)
  assert.equal((await post('/api/mod/vouchers', { add: 2 }, MOD)).status, 200)
  assert.equal((await (await fetch(base + '/api/vouchers/available')).json()).available, 2)
  assert.equal((await post('/api/vouchers', { kind: 'inventado' })).status, 400)
  const { code } = await (await post('/api/vouchers', { kind: 'voz' })).json()
  assert.match(code, /^CSL-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  assert.equal((await post('/api/entity/redeem', { id, key, code: 'CSL-XXXX-XXXX' })).status, 400)
  assert.equal((await post('/api/entity/redeem', { id, key, code: code.toLowerCase() })).status, 200)
  assert.equal((await post('/api/entity/redeem', { id, key, code })).status, 400)
  const plans = await (await fetch(base + '/api/mod/plans', { headers: H })).json()
  assert.deepEqual(plans.vouchers.redeemed.map(r => [r.name, r.kind, r.n]), [['Terapia da Fala Exemplo', 'voz', 1]])
  assert.equal(plans.vouchers.balance, 1)
  // Cada ligação só pede 2 códigos por dia.
  await post('/api/mod/vouchers', { add: 5 }, MOD)
  assert.equal((await post('/api/vouchers', { kind: 'juridico' })).status, 201)
  assert.equal((await post('/api/vouchers', { kind: 'juridico' })).status, 429)
})

test('pedidos de adesão só a equipa os lê', async () => {
  assert.equal((await post('/api/plan-requests', { org: 'Empresa X', plan: 'gold', size: 'pequena', contact: 'a@b.pt' })).status, 400)
  const r = await (await post('/api/plan-requests', { org: 'Empresa X', plan: 'parceira', size: 'media', contact: 'rh@x.pt', nif: '500000000' })).json()
  assert.equal(r.published, false)
  const q = await queue('status=received&type=planRequest')
  assert.equal(q[0].payload.org, 'Empresa X')
})
