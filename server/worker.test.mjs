// Corre a lógica do servidor sobre uma "D1" falsa (SQLite em memória com a mesma interface que o
// D1 dá aos Workers), para garantir que o Worker se comporta como o servidor do Render.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { makeWorker } from './worker.mjs'

/** Imita o objeto D1 (prepare → bind → all/first/run). */
function fakeD1() {
  const s = new DatabaseSync(':memory:')
  return {
    prepare(sql) {
      let params = []
      const stmt = {
        bind: (...p) => { params = p; return stmt },
        all: async () => ({ results: s.prepare(sql).all(...params) }),
        first: async () => s.prepare(sql).get(...params) ?? null,
        run: async () => {
          if (!params.length && /;\s*\S/.test(sql)) { s.exec(sql); return { meta: { changes: 0 } } }
          const r = s.prepare(sql).run(...params); return { meta: { changes: Number(r.changes) } }
        },
      }
      return stmt
    },
  }
}

test('o Worker atende como o servidor do Render, sobre D1', async () => {
  const worker = makeWorker(readFileSync(new URL('./mod.html', import.meta.url), 'utf8'))
  const env = { DB: fakeD1(), MOD_TOKEN: 'segredo-de-teste', ALLOWED_ORIGIN: 'https://casulo.space,capacitor://localhost', DATA_KEY: 'k' }
  const call = (path, init = {}) => worker.fetch(new Request('https://api.casulo.space' + path, init), env)
  assert.equal((await call('/api/health')).status, 200)
  const created = await call('/api/stories', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.1.1.1' }, body: JSON.stringify({ kind: 'testemunho', topic: 'voz', phase: 'meses', title: 'Olá', body: 'Um texto calmo com mais de vinte letras.' }) })
  assert.equal(created.status, 201)
  const res = await call('/api/stories', { headers: { origin: 'capacitor://localhost' } })
  assert.equal(res.headers.get('access-control-allow-origin'), 'capacitor://localhost')
  assert.equal((await res.json())[0].title, 'Olá')
  assert.equal((await call('/api/mod/queue')).status, 401)
  assert.match(await (await call('/mod')).text(), /<html/i)
  // Tarefas agendadas: lembretes e prazos.
  const waits = []
  await worker.scheduled({ cron: '* * * * *' }, env, { waitUntil: p => waits.push(p) })
  await worker.scheduled({ cron: '0 3 * * *' }, env, { waitUntil: p => waits.push(p) })
  await Promise.all(waits)
})
