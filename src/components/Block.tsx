import { useCallback, useMemo } from 'react'
import { tr } from '../i18n'
import { useVault } from '../lib/vault-context'
import { useToast } from './ui'

/**
 * Bloquear quem publica na comunidade (pedido das lojas de apps e proteção contra assédio).
 * Funciona com a assinatura aleatória de cada aparelho: não diz quem é a pessoa, e o bloqueio
 * fica só neste telemóvel. Quem bloqueias não sabe que o fizeste.
 */
export function useBlocking() {
  const { vault, update } = useVault()
  const blocked = useMemo(() => new Set(vault.blockedAuthors ?? []), [vault.blockedAuthors])
  const isBlocked = useCallback((author?: string) => !!author && blocked.has(author), [blocked])
  const block = useCallback((author: string) => update(v => ({ ...v, blockedAuthors: [...new Set([...(v.blockedAuthors ?? []), author])] })), [update])
  return { isBlocked, block, count: blocked.size }
}

export function BlockButton({ author, onBlocked, compact }: { author?: string; onBlocked?: () => void; compact?: boolean }) {
  const { block } = useBlocking()
  const toast = useToast()
  if (!author) return null
  return (
    <button className="btn sm ghost" style={compact ? { padding: 0, minHeight: 0 } : undefined}
      onClick={() => {
        if (!confirm(tr('Bloquear esta pessoa? Deixas de ver tudo o que publica. Ela não é avisada. Podes desfazer em Definições.'))) return
        block(author); toast(tr('Bloqueado. Já não vais ver o que publica.')); onBlocked?.()
      }}>{tr('Bloquear')}</button>
  )
}
