# Servidor da comunidade nos Cloudflare Workers + D1

O servidor da comunidade tem agora **um só código** (`server/core.mjs`) que corre em dois sítios:

| | Render (hoje) | Cloudflare Workers + D1 |
|---|---|---|
| Entrada | `server/index.mjs` | `server/worker-entry.mjs` |
| Base de dados | SQLite no disco do Render | D1 (SQLite gerido pela Cloudflare) |
| Lembretes | temporizador de 1 em 1 minuto | Cron Trigger de 1 em 1 minuto |
| Prazos de conservação | 1 vez por dia | Cron Trigger às 03:00 UTC |
| Cópias de segurança | R2, todos os dias (`backup.mjs`) | Time Travel do D1 (30 dias, automático) |
| Custo | ~7 $/mês | 0 € no plano gratuito para o volume atual (5 $/mês no Workers Paid, se for preciso) |
| Arranque a frio | não (plano Starter) | não |

Os dois dão as mesmas respostas: os testes (`server/server.test.mjs` no Node e `server/worker.test.mjs`
sobre uma D1 simulada) correm a mesma lógica.

## Passo a passo (cerca de 20 minutos)

Tudo na pasta `server/`, num computador com Node 22 e sessão iniciada na Cloudflare (`npx wrangler login`,
com a conta Casuloapppt).

1. **Criar a base de dados**
   ```sh
   npx wrangler d1 create casulo-comunidade
   ```
   Copiar o `database_id` que aparece para `server/wrangler.toml` (onde diz `PREENCHER`).

2. **Segredos** (os mesmos valores que estão no Render, em Environment)
   ```sh
   npx wrangler secret put DATA_KEY     # o mesmo do Render, senão os contactos guardados não abrem
   npx wrangler secret put MOD_TOKEN
   npx wrangler secret put MOD_TOKENS   # se já estiver a ser usado
   ```

3. **Passar os dados do Render para o D1** (usa a cópia de segurança do R2)
   - No painel da Cloudflare › R2 › balde das cópias, descarregar o ficheiro de hoje (`community-DD.db.enc`).
   - Decifrar: `DATA_KEY=... node backup.mjs restore community-DD.db.enc community.db`
   - Exportar e importar:
     ```sh
     sqlite3 community.db .dump | grep -v '^PRAGMA' | grep -v '^BEGIN' | grep -v '^COMMIT' > dados.sql
     npx wrangler d1 execute casulo-comunidade --remote --file dados.sql
     ```
   - Apagar `community.db`, `dados.sql` e o ficheiro descarregado do computador.

4. **Publicar**
   ```sh
   npx wrangler deploy
   ```
   O `wrangler.toml` liga o Worker a `api.casulo.space`. Se esse nome já apontar para o Render
   (registo CNAME no DNS), apagar primeiro esse registo no painel da Cloudflare › DNS.

5. **Confirmar**
   - `https://api.casulo.space/api/health` responde `{"ok":true}`.
   - `https://api.casulo.space/mod` abre a moderação e a fila aparece.
   - Na app, abrir Comunidade e ver os testemunhos.

6. **Apontar a app** (se ainda usar o endereço do Render): em GitHub › Settings › Secrets and variables ›
   Actions › Variables, `VITE_API_URL = https://api.casulo.space`. A próxima publicação já usa o novo.

7. **Desligar o Render** só depois de uma semana sem problemas (Render › casulo-comunidade › Suspend).
   As cópias para o R2 deixam de ser precisas: o D1 guarda 30 dias de histórico
   (`npx wrangler d1 time-travel restore casulo-comunidade --timestamp=...`).

## Notas

- O limite de envios por hora é contado por instância do Worker (a Cloudflare reparte os pedidos), por isso
  é mais brando do que no Render. Se aparecer abuso, ativar em Cloudflare › Security › WAF › Rate limiting
  uma regra para `api.casulo.space/api/*` com método POST (o plano gratuito tem uma regra).
- O IP vem do `CF-Connecting-IP`, que a Cloudflare escreve e não deixa falsificar. Nunca é guardado.
- As apps das lojas pedem a partir de `https://localhost` (Android) e `capacitor://localhost` (iOS):
  já estão em `ALLOWED_ORIGIN` no `wrangler.toml`.
