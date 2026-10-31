import { describe, expect, it } from 'vitest'
import { codeFromText, decodeShare, encodeShare, isEncrypted } from './share'
import { makeQuestion, practiceTemplates, pronounSetOf } from '../data/allies'
import type { SharedPayload } from './types'

const payload: SharedPayload = {
  v: 1, sentAt: '2026-10-31',
  card: { name: 'Inês', pronouns: 'ela/dela', message: 'Obrigada 💛', helps: ['Usar o meu nome'], hurts: ['Nome antigo'], whoKnows: [{ id: '1', who: 'Avós', state: 'nao' }] },
}

describe('partilha por ligação', () => {
  it('codifica e descodifica sem palavra-passe', async () => {
    const code = await encodeShare(payload)
    expect(isEncrypted(code)).toBe(false)
    expect(await decodeShare(code)).toEqual(payload)
    expect(codeFromText(`https://x.pt/app/#/receber/${code}`)).toBe(code)
  })
  it('com palavra-passe só abre com a certa', async () => {
    const code = await encodeShare(payload, 'girassol')
    expect(isEncrypted(code)).toBe(true)
    await expect(decodeShare(code)).rejects.toThrow()
    await expect(decodeShare(code, 'outra')).rejects.toThrow()
    expect((await decodeShare(code, 'girassol')).card?.name).toBe('Inês')
  })
})

describe('treino de pronomes', () => {
  it('gera perguntas com a resposta certa entre as opções', () => {
    expect(pronounSetOf('elu/delu')).toBe('elu')
    for (const t of practiceTemplates) {
      for (const set of ['ela', 'ele', 'elu'] as const) {
        const q = makeQuestion(t, 'Inês', set)
        expect(q.options).toContain(q.answer)
        expect(q.options.length).toBeGreaterThan(1)
        expect(q.full).not.toMatch(/\{/)
      }
    }
    expect(makeQuestion('Diz {a} {N} que o jantar é às oito.', 'Inês', 'ela').full).toBe('Diz à Inês que o jantar é às oito.')
  })
})
