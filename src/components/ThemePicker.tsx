import { useVault } from '../lib/vault-context'
import type { Palette, Theme } from '../lib/types'
import { tr } from '../i18n'

const options: { id: Theme; label: string; sub: string }[] = [
  { id: 'dark', label: tr('Néon escuro'), sub: tr('O visual do Casulo') },
  { id: 'light', label: tr('Claro'), sub: tr('Mais luz, para o dia') },
  { id: 'system', label: tr('Automático'), sub: tr('Segue o telemóvel') },
]

/** Escolha do tema com uma pré-visualização de cada um. */
export function ThemePicker() {
  const { vault, update } = useVault()
  const current = vault.settings.theme ?? 'dark'
  const set = (theme: Theme) => update(v => ({ ...v, settings: { ...v.settings, theme } }))
  return (
    <div className="theme-picker" role="radiogroup" aria-label={tr('Aparência')}>
      {options.map(o => (
        <button key={o.id} role="radio" aria-checked={current === o.id} className={'theme-opt' + (current === o.id ? ' on' : '')} onClick={() => set(o.id)}>
          <span className={'theme-prev ' + o.id} aria-hidden="true"><i /><i /><i /></span>
          <b>{o.label}</b>
          <span className="xs muted">{o.sub}</span>
        </button>
      ))}
    </div>
  )
}

/** Alternador pequeno entre escuro e claro, para o primeiro ecrã. */
export function ThemeToggle() {
  const { vault, update } = useVault()
  const dark = (vault.settings.theme ?? 'dark') !== 'light'
  return (
    <button className="lang-subtle xs muted theme-toggle" onClick={() => update(v => ({ ...v, settings: { ...v.settings, theme: dark ? 'light' : 'dark' } }))}>
      {dark ? tr('☀ Ecrã claro') : tr('☾ Néon escuro')}
    </button>
  )
}

const palettes: { id: Palette; label: string; sub: string }[] = [
  { id: 'bandeira', label: tr('Bandeira'), sub: tr('O Casulo de sempre: azul à frente, rosa a acompanhar') },
  { id: 'rosa', label: tr('Rosa à frente'), sub: tr('As mesmas cores, com o rosa como cor principal') },
  { id: 'pastel', label: tr('Pastel suave'), sub: tr('Tons mais calmos, menos brilho') },
  { id: 'contraste', label: tr('Alto contraste'), sub: tr('Texto mais forte e contornos nítidos, para ler melhor') },
]

/** Estilo de cor. Todos partem da bandeira trans e funcionam no claro e no escuro. */
export function PalettePicker() {
  const { vault, update } = useVault()
  const current = vault.settings.palette ?? 'bandeira'
  const set = (palette: Palette) => update(v => ({ ...v, settings: { ...v.settings, palette } }))
  return (
    <div className="palette-picker" role="radiogroup" aria-label={tr('Estilo de cor')}>
      {palettes.map(o => (
        <button key={o.id} role="radio" aria-checked={current === o.id} className={'theme-opt' + (current === o.id ? ' on' : '')} onClick={() => set(o.id)}>
          <span className={'palette-prev ' + o.id} aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <b>{o.label}</b>
          <span className="xs muted">{o.sub}</span>
        </button>
      ))}
    </div>
  )
}
