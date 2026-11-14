/**
 * Frequência fundamental de um bloco de áudio por autocorrelação (YIN simplificado).
 * Devolve Hz ou null quando não há voz (silêncio ou ruído). Corre tudo no aparelho.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, min = 60, max = 500): number | null {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / buf.length)
  if (rms < 0.01) return null
  const minLag = Math.floor(sampleRate / max)
  const maxLag = Math.min(Math.floor(sampleRate / min), buf.length - 1)
  const n = buf.length - maxLag
  // Diferença cumulativa normalizada (YIN): mais robusta do que a autocorrelação simples a erros de oitava.
  const d = new Float32Array(maxLag + 1)
  for (let lag = 1; lag <= maxLag; lag++) {
    let s = 0
    for (let i = 0; i < n; i++) { const x = buf[i] - buf[i + lag]; s += x * x }
    d[lag] = s
  }
  let running = 0
  let best = -1
  for (let lag = 1; lag <= maxLag; lag++) {
    running += d[lag]
    const cmnd = running === 0 ? 1 : d[lag] * lag / running
    if (lag >= minLag && cmnd < 0.15) {
      // Desce até ao mínimo local.
      let l = lag
      while (l + 1 <= maxLag && d[l + 1] < d[l]) l++
      best = l
      break
    }
  }
  if (best < 0) return null
  // Interpolação parabólica para mais precisão.
  const a = d[best - 1] ?? d[best], b = d[best], c = d[best + 1] ?? d[best]
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1)
  return sampleRate / (best + (Number.isFinite(shift) ? shift : 0))
}

/** Faixas de referência (aproximadas) para a voz falada. Não são metas: cada voz é diferente. */
export const PITCH_BANDS = [
  { id: 'grave', from: 0, to: 145 },
  { id: 'neutra', from: 145, to: 175 },
  { id: 'aguda', from: 175, to: 1000 },
] as const
