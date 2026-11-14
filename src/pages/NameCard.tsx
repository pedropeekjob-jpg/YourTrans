import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { tr } from '../i18n'

/**
 * Cartão para mostrar num balcão (centro de saúde, banco, escola) quando os documentos
 * ainda têm outro nome. Ecrã inteiro, letra grande e alto contraste. Nada sai do aparelho.
 */
export function NameCard() {
  const { vault } = useVault()
  const nav = useNavigate()
  const s = vault.settings
  const [name, setName] = useState(s.displayName)
  const [editing, setEditing] = useState(!s.displayName)
  const pronouns = s.pronouns && s.pronouns !== tr('sem preferência') ? s.pronouns : ''
  return (
    <div className="name-card" role="dialog" aria-label={tr('Cartão para balcões')}>
      {editing ? (
        <div className="stack" style={{ width: '100%', maxWidth: 420 }}>
          <label className="field">{tr('Nome a mostrar')}<input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} /></label>
          <p className="xs">{tr('Só aparece neste ecrã. Não muda o nome guardado nas definições.')}</p>
          <button className="btn" disabled={!name.trim()} onClick={() => setEditing(false)}>{tr('Mostrar')}</button>
        </div>
      ) : (
        <>
          <p className="name-card-lead">{tr('Por favor, chame-me')}</p>
          <p className="name-card-name">{name}</p>
          {pronouns && <p className="name-card-lead">{tr('Pronomes: {0}', pronouns)}</p>}
          <p className="name-card-note">{tr('Os meus documentos podem ainda ter outro nome. Obrigade por usar este.')}</p>
        </>
      )}
      <div className="row" style={{ position: 'absolute', bottom: 24, gap: 12 }}>
        {!editing && <button className="btn sm secondary" onClick={() => setEditing(true)}>{tr('Mudar nome')}</button>}
        <button className="btn sm" onClick={() => nav(-1)}>{tr('Fechar')}</button>
      </div>
    </div>
  )
}
