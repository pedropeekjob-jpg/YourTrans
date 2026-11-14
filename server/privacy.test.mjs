import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.DATA_KEY = 'outra-chave'
const { clientIp, openBuffer, sealBuffer } = await import('./privacy.mjs')
const { authorTag, fieldCipher } = await import('./webcrypto.mjs')
const { signV4 } = await import('./backup.mjs')

test('campos cifrados voltam ao original e não mostram o texto', async () => {
  const c = fieldCipher('outra-chave')
  const sealed = await c.seal('pessoa@exemplo.pt')
  assert.ok(sealed.startsWith('enc1:') && !sealed.includes('exemplo'))
  assert.equal(await c.open(sealed), 'pessoa@exemplo.pt')
  assert.equal(await c.open('texto antigo em claro'), 'texto antigo em claro')
  assert.deepEqual(openBuffer(sealBuffer(Buffer.from('base'))), Buffer.from('base'))
})

test('o que a versão antiga (node:crypto) cifrou continua a abrir, e as assinaturas não mudam', async () => {
  const old = 'enc1:PwmnM_fSa3oz18EcZycDThePyShx0SrGqdVEYD2aZ8t9RKmJ4HiPPa_13fOs'
  assert.equal(await fieldCipher('outra-chave').open(old), 'pessoa@exemplo.pt')
  assert.equal(await authorTag('aparelho-0123456789abcd', 'segredo'), '7ns0RXQfC0EIsDxt')
})

test('IP: Cloudflare primeiro, depois o último do X-Forwarded-For', () => {
  assert.equal(clientIp({ headers: { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.5.5.5' } }), '1.2.3.4')
  assert.equal(clientIp({ headers: { 'x-forwarded-for': 'falso, 9.9.9.9' } }), '9.9.9.9')
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1')
})

test('assinatura SigV4 igual à da biblioteca oficial da AWS (botocore)', () => {
  const h = signV4({ method: 'PUT', host: 'conta.r2.cloudflarestorage.com', path: '/balde/x', body: Buffer.from('a'), accessKey: 'AK', secretKey: 'SK', now: new Date('2026-11-14T10:40:19Z') })
  assert.equal(h['x-amz-date'], '20261114T104019Z')
  assert.equal(h.authorization, 'AWS4-HMAC-SHA256 Credential=AK/20261114/auto/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=d08194680ef692c89988e5638255be8686ab5ab2ea30fe27a612f972a60bad1d')
})
