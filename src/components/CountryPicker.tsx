import { countriesByRegion, countryPack, type Coverage, type CountryCode } from '../data/countries'
import { useVault } from '../lib/vault-context'
import { useCountry } from '../lib/useCountry'
import { tr } from '../i18n'

/** Escolha do país do conteúdo. Não muda a língua nem recarrega a app. */
export function CountryPicker() {
  const { vault, update } = useVault()
  const set = (c: CountryCode) => update(v => ({ ...v, settings: { ...v.settings, country: c } }))
  return (
    <>
      <select className="input" value={vault.settings.country} onChange={e => set(e.target.value as CountryCode)} aria-label={tr('País')}>
        {countriesByRegion().map(g => (
          <optgroup key={g.region} label={g.label}>
            {g.items.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </optgroup>
        ))}
      </select>
      <p className="xs muted">{tr('Muda as leis, o percurso de saúde e os contactos de apoio que vês. A língua fica igual. Fica guardado só neste telemóvel.')}</p>
    </>
  )
}

const partLabels: Record<keyof Coverage, string> = {
  guide: tr('O passo a passo da mudança de nome e género'),
  letters: tr('As cartas prontas e a checklist de entidades'),
  health: tr('O percurso de saúde'),
  rights: tr('Os direitos, as queixas e o apoio jurídico'),
  support: tr('Os contactos de apoio'),
}

/** Aviso quando uma parte da app ainda não tem conteúdo verificado para o país escolhido. */
export function CountryNotice({ part }: { part: keyof Coverage }) {
  const c = useCountry()
  if (c.coverage[part]) return null
  const pt = countryPack('PT')
  return (
    <section className="card tint-amber" role="note">
      <h3>{tr('{0} Ainda sem conteúdo para {1}', c.flag, c.name)}</h3>
      <p className="small">
        {part === 'support' ? tr('Para {0} só temos, por agora, o número de emergência. Os contactos locais ainda estão a ser reunidos.', c.name) : tr('{0} que vês aqui é de {1}{2}. Ainda não temos esta informação verificada para {3}, por isso não a uses para decidir.', partLabels[part], pt.name, part === 'health' ? ` (${pt.healthSystem})` : '', c.name)}
      </p>
    </section>
  )
}
