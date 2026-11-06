import { describe, expect, it } from 'vitest'
import { generateRecoveryCode, normalizeRecoveryCode } from './crypto'

describe('código de recuperação', () => {
  it('tem 20 caracteres em grupos de 4, sem letras ambíguas', () => {
    const c = generateRecoveryCode()
    expect(c).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){4}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(generateRecoveryCode()).not.toBe(c)
  })
  it('aceita minúsculas, espaços e letras confundíveis', () => {
    const c = generateRecoveryCode()
    const typed = c.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l')
    expect(normalizeRecoveryCode(typed)).toBe(normalizeRecoveryCode(c))
  })
})
