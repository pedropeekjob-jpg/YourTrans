import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, Sheet, copyText, useToast } from '../components/ui'
import { SosPanel } from '../components/Sos'
import { districts } from '../data/health'
import { api, apiEnabled } from '../lib/api'
import { uid, type Facilities, type Place, type ShowerType } from '../lib/types'
import { tr } from '../i18n'

type Tab = 'alerta' | 'locais' | 'reportar'

export function Safety() {
  const [tab, setTab] = useState<Tab>('alerta')
  return (
    <>
      <TopBar title={tr('Segurança')} back />
      <div className="page">
        <Seg value={tab} onChange={setTab} options={[{ id: 'alerta', label: tr('Alerta') }, { id: 'locais', label: tr('Locais seguros') }, { id: 'reportar', label: tr('Reportar') }]} />
        {tab === 'alerta' && <Alert />}
        {tab === 'locais' && <Places />}
        {tab === 'reportar' && <Report />}
      </div>
    </>
  )
}

/* ---------- Alerta ---------- */

function Alert() {
  const { vault } = useVault()
  return (
    <>
      <SosPanel />
      <section className="card tint-amber">
        <h3>{tr('Dicas rápidas')}</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>{tr('O botão')}{' '}<b>{tr('SOS')}</b> {tr('está sempre no canto superior direito.')}</li>
          <li>{tr('Partilha a tua localização em tempo real com alguém de confiança quando fores a um encontro.')}</li>
          <li>{tr('Vítima de crime de ódio? A APAV (116 006) apoia gratuitamente.')}</li>
          {vault.settings.disguise && <li>{tr('Modo privado ativo: o ícone do olho (ou Esc 3 vezes) mostra uma calculadora.')}</li>}
        </ul>
      </section>
    </>
  )
}

/* ---------- Locais seguros ---------- */

const placeKinds = ['Café/Restaurante', 'Bar/Discoteca', 'Ginásio', 'Piscina', 'Loja', 'Serviço público', 'Associação', 'Alojamento', 'Outro']
const showerLabels: Record<ShowerType, string> = { individuais: tr('Duches individuais'), comuns: tr('Duches comuns'), ambos: tr('Individuais e comuns'), sem: tr('Sem duches') }

type Filter = 'wcNeutro' | 'cabinesIndividuais' | 'duchesIndividuais' | 'vestiarioNeutro'
const filterLabels: Record<Filter, string> = { wcNeutro: tr('🚻 WC neutro'), cabinesIndividuais: tr('🚪 Cabines individuais'), duchesIndividuais: tr('🚿 Duches individuais'), vestiarioNeutro: tr('👕 Vestiário neutro') }

function matches(f: Facilities, filter: Filter): boolean {
  if (filter === 'duchesIndividuais') return f.duches === 'individuais' || f.duches === 'ambos'
  return !!f[filter]
}

export function FacilityBadges({ f }: { f: Facilities }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {f.wcNeutro && <span className="badge mint">{tr('🚻 WC neutro')}</span>}
      {f.vestiarioNeutro && <span className="badge mint">{tr('👕 Vestiário neutro')}</span>}
      {f.cabinesIndividuais && <span className="badge mint">{tr('🚪 Cabines individuais')}</span>}
      {f.duches && f.duches !== 'sem' && <span className={'badge ' + (f.duches === 'comuns' ? 'amber' : 'mint')}>🚿 {showerLabels[f.duches]}</span>}
    </div>
  )
}

function Places() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [remote, setRemote] = useState<Place[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [kind, setKind] = useState('')
  const [district, setDistrict] = useState('')
  const [open, setOpen] = useState(false)
  const [share, setShare] = useState(true)
  const empty = { name: '', kind: 'Ginásio', district: 'Lisboa', notes: '', facilities: {} as Facilities }
  const [form, setForm] = useState(empty)

  useEffect(() => { if (apiEnabled) api.safePlaces().then(setRemote).catch(() => {}) }, [])

  const all: Place[] = useMemo(() => [
    ...vault.places.map(p => ({ ...p, source: 'meu' as const })),
    ...remote.map(p => ({ ...p, source: 'comunidade' as const })),
  ], [vault.places, remote])
  const list = all.filter(p => (!kind || p.kind === kind) && (!district || p.district === district) && filters.every(f => matches(p.facilities ?? {}, f)))

  const save = async () => {
    const place: Place = { id: uid(), ...form, name: form.name.trim(), notes: form.notes.trim() || undefined }
    update(v => ({ ...v, places: [place, ...v.places] }))
    if (share && apiEnabled) {
      try { await api.suggestPlace({ name: place.name, kind: place.kind, district: place.district, notes: place.notes, facilities: place.facilities }); toast(tr('Guardado e enviado para moderação')) }
      catch { toast(tr('Guardado só neste telemóvel')) }
    } else toast(tr('Guardado'))
    setOpen(false); setForm(empty)
  }
  const setF = (k: keyof Facilities, v: Facilities[keyof Facilities]) => setForm({ ...form, facilities: { ...form.facilities, [k]: v } })

  return (
    <>
      <section className="card tint-mint">
        <h3>{tr('Locais trans safe')}</h3>
        <p className="small">{tr('Sítios onde a comunidade se sentiu bem-vinda, com informação sobre casas de banho e balneários: cabines individuais, duches individuais ou comuns e vestiários neutros.')}</p>
      </section>
      <div className="chips">
        {(Object.keys(filterLabels) as Filter[]).map(f => (
          <button key={f} className={'chip' + (filters.includes(f) ? ' on' : '')} onClick={() => setFilters(filters.includes(f) ? filters.filter(x => x !== f) : [...filters, f])}>{filterLabels[f]}</button>
        ))}
      </div>
      <div className="grid2">
        <select className="input" value={kind} onChange={e => setKind(e.target.value)} aria-label={tr('Tipo de local')}><option value="">{tr('Todos os tipos')}</option>{placeKinds.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select>
        <select className="input" value={district} onChange={e => setDistrict(e.target.value)} aria-label={tr('Distrito')}><option value="">{tr('Todo o país')}</option>{districts.map(d => <option key={d}>{d}</option>)}</select>
      </div>
      {list.length === 0 ? (
        <Empty icon="pin" title={all.length ? tr('Nenhum local com estes filtros') : tr('Ainda não há locais')} text={tr('Conheces um ginásio, piscina ou café onde te sentiste em segurança? Adiciona-o.')} />
      ) : (
        <div className="stack">
          {list.map(p => (
            <article key={p.id} className="card">
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 2 }}>
                  <h3>{p.name}</h3>
                  <span className="small muted">{tr(p.kind)} · {p.district}{p.source === 'comunidade' ? tr(' · comunidade') : ''}</span>
                </div>
                {p.source === 'meu' && <button className="btn ghost sm" aria-label={tr('Remover')} onClick={() => update(v => ({ ...v, places: v.places.filter(x => x.id !== p.id) }))}><Icon name="trash" size={16} /></button>}
              </div>
              <FacilityBadges f={p.facilities ?? {}} />
              {p.notes && <p className="small">{p.notes}</p>}
            </article>
          ))}
        </div>
      )}
      <button className="btn block" onClick={() => setOpen(true)}><Icon name="plus" size={18} />{tr('Adicionar local')}</button>

      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Novo local seguro')}>
        <label className="field">{tr('Nome')}<input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <div className="grid2">
          <label className="field">{tr('Tipo')}<select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{placeKinds.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select></label>
          <label className="field">{tr('Distrito')}<select className="input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}>{districts.map(d => <option key={d}>{d}</option>)}</select></label>
        </div>
        <div className="stack">
          <b className="small">{tr('Casas de banho e balneários')}</b>
          {([['wcNeutro', tr('Tem WC neutro ou individual')], ['vestiarioNeutro', tr('Tem vestiário neutro ou individual')], ['cabinesIndividuais', tr('Tem cabines individuais para trocar de roupa')]] as const).map(([k, label]) => (
            <label key={k} className="row small" style={{ gap: 10 }}>
              <input type="checkbox" checked={!!form.facilities[k]} onChange={e => setF(k, e.target.checked)} /> {label}
            </label>
          ))}
          <span className="small" style={{ fontWeight: 600 }}>{tr('Zona de duches')}</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {(Object.keys(showerLabels) as ShowerType[]).map(s => <button key={s} className={'chip' + (form.facilities.duches === s ? ' on' : '')} onClick={() => setF('duches', s)}>{showerLabels[s]}</button>)}
          </div>
        </div>
        <label className="field">{tr('Notas')}<textarea className="input" style={{ minHeight: 70 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={tr('Ex.: staff respeitoso, pede-se a chave na receção')} /></label>
        {apiEnabled && <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /> {tr('Partilhar com a comunidade (anónimo, moderado)')}</label>}
        <button className="btn block" disabled={form.name.trim().length < 2} onClick={save}>{tr('Guardar')}</button>
      </Sheet>
    </>
  )
}

/* ---------- Reportar incidente ---------- */

const incidentKinds = ['Insulto ou assédio verbal', 'Agressão física', 'Discriminação no trabalho', 'Discriminação na saúde', 'Discriminação num serviço', 'Assédio online', 'Recusa de atendimento', 'Outro']
const settings = ['Rua/transportes', 'Trabalho', 'Escola/universidade', 'Saúde', 'Serviço público', 'Comércio', 'Casa/família', 'Online']

function Report() {
  const toast = useToast()
  const [form, setForm] = useState({ kind: '', setting: '', district: '', description: '', reported: false })
  const [sent, setSent] = useState(false)
  const summary = tr('Tipo: {0}\nContexto: {1}\nDistrito: {2}\nApresentou queixa: {3}\n\n{4}', form.kind, form.setting, form.district, form.reported ? 'sim' : tr('não'), form.description)

  const submit = async () => {
    if (apiEnabled) {
      try { await api.incident(form); setSent(true); return } catch (e) { toast((e as Error).message) }
    } else if (await copyText(summary)) toast(tr('Copiado. Podes enviar à ILGA (Observatório da Discriminação).'))
  }

  if (sent) return (
    <section className="card tint-mint">
      <h3>{tr('Obrigado por partilhares')}</h3>
      <p className="small">{tr('O teu relato entra nas estatísticas anónimas partilhadas com associações. Se precisares de apoio, a APAV (116 006) e a ILGA podem ajudar.')}</p>
      <button className="btn secondary" onClick={() => { setSent(false); setForm({ kind: '', setting: '', district: '', description: '', reported: false }) }}>{tr('Novo relato')}</button>
    </section>
  )

  return (
    <>
      <section className="card tint-accent">
        <h3>{tr('Reportar de forma anónima')}</h3>
        <p className="small">{tr('Não pedimos nome, contacto, data exata nem morada. Os relatos ajudam associações a mostrar o que está a acontecer e a exigir mudanças.')}</p>
        <Link to="/direitos?tab=agir" className="btn sm secondary" style={{ justifySelf: 'start' }}>{tr('Queres apresentar queixa? Vê o que fazer')}</Link>
      </section>
      <div className="stack"><b className="small">{tr('O que aconteceu?')}</b><div className="chips" style={{ flexWrap: 'wrap' }}>{incidentKinds.map(k => <button key={k} className={'chip' + (form.kind === k ? ' on' : '')} onClick={() => setForm({ ...form, kind: k })}>{tr(k)}</button>)}</div></div>
      <div className="stack"><b className="small">{tr('Onde?')}</b><div className="chips" style={{ flexWrap: 'wrap' }}>{settings.map(k => <button key={k} className={'chip' + (form.setting === k ? ' on' : '')} onClick={() => setForm({ ...form, setting: k })}>{tr(k)}</button>)}</div></div>
      <select className="input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} aria-label={tr('Distrito')}><option value="">{tr('Distrito')}</option>{districts.map(d => <option key={d}>{d}</option>)}</select>
      <label className="field">{tr('Descrição (opcional)')}<textarea className="input" maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={tr('Não incluas nomes nem dados que te identifiquem')} /></label>
      <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={form.reported} onChange={e => setForm({ ...form, reported: e.target.checked })} /> {tr('Apresentei queixa às autoridades')}</label>
      <button className="btn block" disabled={!form.kind || !form.setting || !form.district} onClick={submit}>{apiEnabled ? tr('Enviar anonimamente') : tr('Copiar relato')}</button>
      <a className="small" href="https://ilga-portugal.pt" target="_blank" rel="noreferrer noopener">{tr('Observatório da Discriminação da ILGA Portugal')}</a>
    </>
  )
}
