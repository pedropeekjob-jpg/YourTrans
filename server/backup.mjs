// Cópia de segurança diária da base de dados, cifrada, para o Cloudflare R2 (API compatível com S3).
// Só corre se estas variáveis existirem no Render:
//   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  (e DATA_KEY para cifrar)
// Guarda 31 cópias a rodar: community-01.db.enc ... community-31.db.enc (dia do mês).
// Para recuperar: descarregar o ficheiro do R2 e correr
//   DATA_KEY=... node backup.mjs restore community-14.db.enc /data/community.db
import { createHash, createHmac } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openBuffer, sealBuffer } from './privacy.mjs'

const env = process.env
export const backupConfigured = () => !!(env.R2_ACCOUNT_ID && env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.DATA_KEY)

const sha256 = data => createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => createHmac('sha256', key).update(data).digest()

/** Assinatura AWS SigV4 (o R2 usa a região "auto"). Exportada para os testes. */
export function signV4({ method, host, path, body, accessKey, secretKey, now = new Date(), region = 'auto' }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const day = amzDate.slice(0, 8)
  const payloadHash = sha256(body)
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate }
  const signed = Object.keys(headers).sort()
  const canonical = [method, path, '', ...signed.map(k => `${k}:${headers[k]}`), '', signed.join(';'), payloadHash].join('\n')
  const scope = `${day}/${region}/s3/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
  const key = hmac(hmac(hmac(hmac('AWS4' + secretKey, day), region), 's3'), 'aws4_request')
  const signature = createHmac('sha256', key).update(toSign).digest('hex')
  return { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed.join(';')}, Signature=${signature}` }
}

/** Faz a cópia (VACUUM INTO dá um ficheiro consistente mesmo com a base em uso), cifra e envia. */
export async function runBackup(db, tmpPath) {
  rmSync(tmpPath, { force: true })
  db.prepare('VACUUM INTO ?').run(tmpPath)
  const body = sealBuffer(readFileSync(tmpPath))
  rmSync(tmpPath, { force: true })
  const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const path = `/${env.R2_BUCKET}/community-${String(new Date().getUTCDate()).padStart(2, '0')}.db.enc`
  const headers = signV4({ method: 'PUT', host, path, body, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY })
  const res = await fetch(`https://${host}${path}`, { method: 'PUT', headers, body })
  if (!res.ok) throw new Error(`R2 respondeu ${res.status}`)
  return { bytes: body.length, path }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === 'restore') {
  const [, , , from, to] = process.argv
  writeFileSync(to, openBuffer(readFileSync(from)))
  console.log(`Base de dados recuperada em ${to}`)
}
