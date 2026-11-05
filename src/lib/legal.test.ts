import { describe, expect, it } from 'vitest'
import { buildTemplate, rightTopics, routes, templateLabels, type TemplateId } from '../data/legal'

describe('ajuda legal', () => {
  it('gera todos os modelos sem marcadores por preencher quando há dados', () => {
    const f = { name: 'Inês', entity: 'Loja X', date: '2026-11-01', place: 'Lisboa', what: 'recusaram atender-me pelo meu nome', witnesses: 'Rui' }
    for (const id of Object.keys(templateLabels) as TemplateId[]) {
      const t = buildTemplate(id, f)
      expect(t).toContain('Inês')
      expect(t).toContain('Loja X')
      expect(t).not.toMatch(/\[[a-z ]+\]/)
    }
  })
  it('cada tema tem fontes com ligação', () => {
    for (const t of rightTopics) expect(t.sources.every(s => s.url.startsWith('https://'))).toBe(true)
    for (const r of routes) expect(r.steps.length).toBeGreaterThan(0)
  })
})
