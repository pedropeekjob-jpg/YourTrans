// Servidor comunitário do Casulo nos Cloudflare Workers, com a base de dados no D1.
// A lógica é a mesma do Render (core.mjs). Diferenças:
// - os lembretes e os prazos de conservação correm por "Cron Triggers" (ver wrangler.toml);
// - não há cópia para o R2: o D1 guarda o histórico dos últimos 30 dias (Time Travel);
// - o limite de pedidos é por instância (a Cloudflare reparte os pedidos por várias), por isso é
//   mais brando; o filtro de abuso da própria Cloudflare (WAF) cobre o resto.
import { createApp } from './core.mjs'

/** O D1 com a mesma interface que o SQLite do Node. */
const d1 = D1 => ({
  all: async (sql, ...p) => (await D1.prepare(sql).bind(...p).all()).results,
  get: async (sql, ...p) => (await D1.prepare(sql).bind(...p).first()) ?? undefined,
  run: async (sql, ...p) => ({ changes: (await D1.prepare(sql).bind(...p).run()).meta.changes }),
  exec: async sql => { await D1.prepare(sql).run() },
})

/** O Worker, com a página de moderação já carregada (worker-entry.mjs importa-a como texto). */
export function makeWorker(modHtml) {
  let appP = null
  /** Uma app por instância: as tabelas são verificadas só na primeira vez. */
  const app = env => {
    appP ??= createApp({ db: d1(env.DB), env, modHtml: () => modHtml }).catch(e => { appP = null; throw e })
    return appP
  }
  return {
    async fetch(request, env) {
      // A Cloudflare escreve o IP real e não deixa falsificá-lo. Nunca é guardado.
      return (await app(env)).handle(request, request.headers.get('cf-connecting-ip') ?? '')
    },
    async scheduled(event, env, ctx) {
      const a = await app(env)
      // De minuto a minuto: lembretes. Uma vez por dia (03:00 UTC): prazos de conservação.
      if (event.cron === '0 3 * * *') ctx.waitUntil(a.purgeOld())
      else ctx.waitUntil(a.push.sendDue())
    },
  }
}
