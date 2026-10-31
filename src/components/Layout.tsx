import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'

const tabs = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/documentos', label: 'Documentos', icon: 'doc' },
  { to: '/saude', label: 'Saúde', icon: 'heart' },
  { to: '/diario', label: 'Diário', icon: 'book' },
  { to: '/comunidade', label: 'Apoio', icon: 'people' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { panic } = useVault()
  const escPresses = useRef<number[]>([])

  // Atalho de pânico no teclado: carregar em Esc 3 vezes seguidas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const now = Date.now()
      escPresses.current = [...escPresses.current.filter(t => now - t < 1200), now]
      if (escPresses.current.length >= 3) panic()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panic])

  return (
    <div className="app">
      {children}
      <nav className="bottomnav" aria-label="Navegação principal">
        <div className="inner">
          {tabs.map(t => (
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

/** Barra superior com voltar, título e o botão de pânico sempre visível. */
export function TopBar({ title, back, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  const { panic } = useVault()
  const nav = useNavigate()
  return (
    <header className="topbar">
      {back && <button className="icon-btn" onClick={() => nav(-1)} aria-label="Voltar"><Icon name="back" /></button>}
      <div className="title">{title}</div>
      {right}
      <button className="panic" onClick={panic} aria-label="Sair rapidamente">
        <Icon name="eyeOff" size={18} /> Sair
      </button>
    </header>
  )
}
