import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'
import { Sheet } from './ui'
import { SosPanel } from './Sos'
import { tr } from '../i18n'

const tabs = [
  { to: '/', label: tr('Início'), icon: 'home', end: true },
  { to: '/documentos', label: tr('Documentos'), icon: 'doc' },
  { to: '/saude', label: tr('Saúde'), icon: 'heart' },
  { to: '/diario', label: tr('Diário'), icon: 'book' },
  { to: '/comunidade', label: tr('Apoio'), icon: 'people' },
]

const allyTabs = [
  { to: '/', label: tr('Início'), icon: 'home', end: true },
  { to: '/aprender', label: tr('Aprender'), icon: 'book' },
  { to: '/praticar', label: tr('Praticar'), icon: 'chat' },
  { to: '/cartoes', label: tr('Cartões'), icon: 'heart' },
  { to: '/para-mim', label: tr('Para mim'), icon: 'people' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { panic, vault } = useVault()
  const escPresses = useRef<number[]>([])
  const disguise = vault.settings.disguise

  // Modo privado: carregar em Esc 3 vezes seguidas mostra a calculadora.
  useEffect(() => {
    if (!disguise) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const now = Date.now()
      escPresses.current = [...escPresses.current.filter(t => now - t < 1200), now]
      if (escPresses.current.length >= 3) panic()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panic, disguise])

  return (
    <div className="app">
      {children}
      <nav className="bottomnav" aria-label={tr('Navegação principal')}>
        <div className="inner">
          {(vault.settings.profile === 'ally' ? allyTabs : tabs).map(t => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="pill"><Icon name={t.icon} /></span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/** Barra superior com voltar, título e o botão SOS sempre visível. */
export function TopBar({ title, back, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  const { panic, vault } = useVault()
  const nav = useNavigate()
  const [sos, setSos] = useState(false)
  return (
    <>
    <header className="topbar">
      {back && <button className="icon-btn" onClick={() => nav(-1)} aria-label={tr('Voltar')}><Icon name="back" /></button>}
      <div className="title">{title}</div>
      {right}
      {vault.settings.disguise && (
        <button className="icon-btn" onClick={panic} aria-label={tr('Modo privado: mostrar calculadora')}><Icon name="eyeOff" /></button>
      )}
      {vault.settings.profile !== 'ally' && <button className="panic" onClick={() => setSos(true)} aria-label={tr('SOS: pedir ajuda urgente')}>
        <Icon name="alert" size={18} /> {tr('SOS')}</button>}
    </header>
    {/* Fora do cabeçalho: o backdrop-filter dele prenderia o painel fixo. */}
    <Sheet open={sos} onClose={() => setSos(false)} title={tr('Pedir ajuda')}>
      <SosPanel compact />
    </Sheet>
    </>
  )
}
