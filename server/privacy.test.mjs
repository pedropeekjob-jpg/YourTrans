import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.DATA_KEY = 'outra-chave'
const { clientIp, openBuffer, openField, sealBuffer, sealField } = await import('./privacy.mjs')
const { signV4 } = await import('./backup.mjs')

test('campos cifrados voltam ao original e não mostram o texto', () => {
  const sealed = sealField('pessoa@exemplo.pt')
  assert.ok(sealed.startsWith('enc1:') && !sealed.includes('exemplo'))
  assert.equal(openField(sealed), 'pessoa@exemplo.pt')
  assert.equal(openField('texto antigo em claro'), 'texto antigo em claro')
  assert.deepEqual(openBuffer(sealBuffer(Buffer.from('base'))), Buffer.from('base'))
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
