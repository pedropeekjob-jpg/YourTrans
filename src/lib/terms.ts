// Aceitar as regras da comunidade antes da primeira publicação.
// A Apple (diretriz 1.2) e a Google pedem que quem publica conteúdo aceite termos com
// "tolerância zero" para conteúdo abusivo. Fica guardado no aparelho, fora do cofre,
// e volta a ser pedido quando a versão das regras muda.
import { tr } from '../i18n'

export const TERMS_VERSION = '2026-11-14'
const KEY = 'communityTerms'

export function termsAccepted(): boolean {
  try { return localStorage.getItem(KEY) === TERMS_VERSION } catch { return false }
}

type Waiter = (ok: boolean) => void
let waiter: Waiter | null = null
const listeners = new Set<(open: boolean) => void>()

/** Mostra as regras (se ainda não foram aceites) e espera pela resposta. */
export function ensureCommunityTerms(): Promise<void> {
  if (termsAccepted()) return Promise.resolve()
  if (!listeners.size) return Promise.resolve() // sem ecrã para perguntar (testes)
  return new Promise((resolve, reject) => {
    waiter?.(false)
    waiter = ok => (ok ? resolve() : reject(new Error(tr('Para publicar, aceita as regras da comunidade.'))))
    listeners.forEach(f => f(true))
  })
}

export function answerTerms(ok: boolean) {
  if (ok) { try { localStorage.setItem(KEY, TERMS_VERSION) } catch { /* sem armazenamento */ } }
  const w = waiter
  waiter = null
  listeners.forEach(f => f(false))
  w?.(ok)
}

export function onTermsRequest(f: (open: boolean) => void): () => void {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
