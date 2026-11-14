import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { locale, tr } from '../i18n'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <div className="row between">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={tr('Fechar')}><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Check({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button className={'check' + (on ? ' on' : '')} onClick={onToggle} aria-pressed={on} aria-label={label}>
      <Icon name="check" size={18} />
    </button>
  )
}

export function Ring({ value, size = 76, color = '#fff', track = 'rgba(255,255,255,.3)' }: { value: number; size?: number; color?: string; track?: string }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <span>{Math.round(value * 100)}%</span>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)}><div style={{ width: `${value * 100}%` }} /></div>
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={options.length > 4 ? 'seg scroll' : 'seg'} role="tablist">
      {options.map(o => (
        <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''}
          ref={value === o.id && options.length > 4 ? el => el?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) : undefined}
          onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="lead-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={26} />
      </div>
      <h3 style={{ color: 'var(--text)' }}>{title}</h3>
      {text && <p className="small">{text}</p>}
      {action}
    </div>
  )
}

const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(cur => (cur === m ? null : cur)), 2200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  )
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Date(iso).toLocaleDateString(locale, opts)
}
