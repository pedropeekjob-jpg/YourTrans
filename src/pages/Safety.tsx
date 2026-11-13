import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, Sheet, copyText, useToast } from '../components/ui'
import { SosPanel } from '../components/Sos'
import { districts } from '../data/health'
import { api, apiEnabled } from '../lib/api'
import { uid, type Facilities, type Place, type ShowerType } from '../lib/types'
import { ShareNote } from './Privacy'
import { tr } from '../i18n'
import { SafeMap, type MapPlace } from '../components/SafeMap'
import { PortugalOnly } from '../components/CountryInfoViews'
import { useCountry } from '../lib/useCountry'
import { useEntities } from '../lib/useEntities'
import { transparenteEntities } from '../data/transparente'
import { TRANSPARENTE_EQI_URL, entityKinds } from '../data/seal'
import { SealBadge, TransparenteBadge } from '../components/SealBadges'
import { directionsUrl, distance, formatDistance, inPortugal, locateOnce, round4, wazeUrl, type LatLng } from '../lib/geo'

type Tab = 'alerta' | 'locais' | 'reportar'

export function Safety() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'alerta'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  return (
    <>
      <TopBar title={tr('Segurança')} back />
      <div className="page">
        <Seg value={tab} onChange={setTab} options={[{ id: 'alerta', label: tr('Alerta') }, { id: 'locais', label: tr('Locais seguros') }, { id: 'reportar', label: tr('Reportar') }]} />
        {tab === 'alerta' && <Alert />}
        {tab === 'locais' && <PortugalOnly what={tr('Os locais seguros')}><Places /></PortugalOnly>}
        {tab === 'reportar' && <PortugalOnly what={tr('Os relatos anónimos de discriminação')}><Report /></PortugalOnly>}
      </div>
    </>
  )
}

/* ---------- Alerta ---------- */

function Alert() {
  const { vault } = useVault()
  const pt = useCountry().code === 'PT'
  return (
    <>
      <SosPanel />
      <section className="card tint-amber">
        <h3>{tr('Dicas rápidas')}</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>{tr('O botão')}{' '}<b>{tr('SOS')}</b> {tr('está sempre no canto superior direito.')}</li>
          <li>{tr('Partilha a tua localização em tempo real com alguém de confiança quando fores a um encontro.')}</li>
          {pt && <li>{tr('Vítima de crime de ódio? A APAV (116 006) apoia gratuitamente.')}</li>}
          {vault.settings.disguise && <li>{tr('Modo privado ativo: o ícone do olho (ou Esc 3 vezes) abre o site do tempo e, se tiveres código, bloqueia a app.')}</li>}
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

function PlaceCard({ p, me, onRemove, onShow }: { p: Place; me: LatLng | null; onRemove: (id: string) => void; onShow?: () => void }) {
  const pos = typeof p.lat === 'number' && typeof p.lng === 'number' ? { lat: p.lat, lng: p.lng } : null
  return (
    <article className="card">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 2 }}>
          <h3>{p.name}</h3>
          <span className="small muted">{tr(p.kind)} · {p.district}{p.source === 'comunidade' ? tr(' · comunidade') : ''}{me && pos ? ' · ' + formatDistance(distance(me, pos)) : ''}</span>
        </div>
        {p.source === 'meu' && <button className="btn ghost sm" aria-label={tr('Remover')} onClick={() => onRemove(p.id)}><Icon name="trash" size={16} /></button>}
      </div>
      {(p.seal || p.source === 'transparente') && <div className="row wrap" style={{ gap: 6 }}>
        {p.seal && <SealBadge status={p.seal} />}
        {p.transparente && <TransparenteBadge />}
        {p.source === 'transparente' && <span className="badge accent">{p.eqiLevel ? tr('Rede EQI · nível {0}', p.eqiLevel) : tr('Rede EQI')}</span>}
      </div>}
      <FacilityBadges f={p.facilities ?? {}} />
      {p.notes && <p className="small">{p.notes}</p>}
      {p.source === 'transparente' && <span className="xs muted">{tr('Fonte:')}{' '}<a href={TRANSPARENTE_EQI_URL} target="_blank" rel="noopener noreferrer">{tr('TransParente, Entidades Queer Inclusivas')}</a></span>}
      {p.source === 'transparente' && p.url && <a className="btn ghost sm" style={{ justifySelf: 'start' }} href={p.url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} />{tr('Ver na TransParente')}</a>}
      {p.entityId && <Link className="btn ghost sm" style={{ justifySelf: 'start' }} to={`/selo/${p.entityId}`}><Icon name="star" size={16} />{tr('Ver selo e avaliar')}</Link>}
      {pos && (
        <div className="row wrap" style={{ gap: 8 }}>
          <a className="btn sm" href={directionsUrl(pos, p.name)} target="_blank" rel="noopener noreferrer"><Icon name="map" size={16} />{tr('Ir para lá')}</a>
          <a className="btn ghost sm" href={wazeUrl(pos)} target="_blank" rel="noopener noreferrer">{tr('Abrir no Waze')}</a>
          {onShow && <button className="btn ghost sm" onClick={onShow}><Icon name="pin" size={16} />{tr('Ver no mapa')}</button>}
        </div>
      )}
    </article>
  )
}

export function Places() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [params] = useSearchParams()
  const [remote, setRemote] = useState<Place[]>([])
  const { entities } = useEntities()
  const [sealOnly, setSealOnly] = useState(false)
  const [filters, setFilters] = useState<Filter[]>([])
  const [kind, setKind] = useState('')
  const [district, setDistrict] = useState('')
  const [open, setOpen] = useState(false)
  const [share, setShare] = useState(true)
  const empty = { name: '', kind: 'Ginásio', district: 'Lisboa', notes: '', facilities: {} as Facilities, pos: null as LatLng | null }
  const [form, setForm] = useState(empty)
  const [view, setView] = useState<'mapa' | 'lista'>('mapa')
  const [me, setMe] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [selected, setSelected] = useState<string | null>(params.get('local'))

  // A posição só é usada aqui, em memória: não é guardada nem enviada.
  const locate = async (forForm = false) => {
    setLocating(true)
    try {
      const p = await locateOnce()
      if (forForm) setForm(f => ({ ...f, pos: { lat: round4(p.lat), lng: round4(p.lng) } }))
      else setMe(p)
    } catch { toast(tr('Não foi possível obter a localização. Confirma a permissão nas definições do telemóvel.')) }
    finally { setLocating(false) }
  }

  useEffect(() => { if (apiEnabled) api.safePlaces().then(setRemote).catch(() => {}) }, [])

  const all: Place[] = useMemo(() => [
    ...vault.places.map(p => ({ ...p, source: 'meu' as const })),
    ...remote.map(p => ({ ...p, source: 'comunidade' as const })),
    // Entidades registadas para o selo (as que perderam o selo ficam só na página do selo).
    ...entities.filter(e => e.seal !== 'sem-selo').map(e => ({
      id: 'selo-' + e.id, entityId: e.id, name: e.name, kind: e.kind, district: e.district, notes: e.notes, facilities: e.facilities ?? {},
      lat: e.lat, lng: e.lng, source: 'entidade' as const, seal: e.seal, transparente: e.transparente,
    })),
    // Entidades certificadas pela TransParente (com autorização), sem repetir as que já estão registadas no Casulo.
    ...transparenteEntities.filter(t => !entities.some(e => e.name.trim().toLowerCase() === t.name.trim().toLowerCase())).map((t, i) => ({
      id: 'tp-' + i, name: t.name, kind: t.kind, district: t.district, notes: t.remote ? tr('Também atende à distância.') : undefined, facilities: t.facilities ?? {},
      lat: t.lat, lng: t.lng, url: t.url, source: 'transparente' as const, transparente: t.seal, eqiLevel: t.level,
    })),
  ], [vault.places, remote, entities])
  const filtered = all.filter(p => (!sealOnly || p.seal === 'selo' || p.transparente) && (!kind || p.kind === kind) && (!district || p.district === district) && filters.every(f => matches(p.facilities ?? {}, f)))
  const hasPos = (p: Place): p is MapPlace => typeof p.lat === 'number' && typeof p.lng === 'number'
  const dist = (p: Place) => (me && hasPos(p) ? distance(me, p) : Infinity)
  const list = me ? [...filtered].sort((a, b) => dist(a) - dist(b)) : filtered
  const onMap = useMemo(() => filtered.filter(hasPos), [filtered])
  const sel = list.find(p => p.id === selected)

  const save = async () => {
    const { pos, ...rest } = form
    const place: Place = { id: uid(), ...rest, name: form.name.trim(), notes: form.notes.trim() || undefined, ...(pos ? { lat: round4(pos.lat), lng: round4(pos.lng) } : {}) }
    update(v => ({ ...v, places: [place, ...v.places] }))
    if (share && apiEnabled) {
      try { const r = await api.suggestPlace({ name: place.name, kind: place.kind, district: place.district, notes: place.notes, facilities: place.facilities, lat: place.lat, lng: place.lng }); toast(r.published ? tr('Guardado e publicado no mapa da comunidade') : tr('Guardado e enviado para moderação')) }
      catch { toast(tr('Guardado só neste telemóvel')) }
    } else toast(tr('Guardado'))
    setOpen(false); setForm(empty)
  }
  const remove = (id: string) => { update(v => ({ ...v, places: v.places.filter(x => x.id !== id) })); setSelected(null) }
  const setF = (k: keyof Facilities, v: Facilities[keyof Facilities]) => setForm({ ...form, facilities: { ...form.facilities, [k]: v } })

  return (
    <>
      <section className="card tint-mint">
        <h3>{tr('Locais trans safe')}</h3>
        <p className="small">{tr('Sítios onde a comunidade se sentiu bem-vinda, com informação sobre casas de banho e balneários: cabines individuais, duches individuais ou comuns e vestiários neutros.')}</p>
        <Link to="/selo" className="small">{tr('🏅 Os marcadores dourados têm o Selo Casulo. Saber mais ou registar uma entidade')}</Link>
        {transparenteEntities.length > 0 && <span className="xs muted">{tr('Inclui {0} Entidades Queer Inclusivas da rede EQI da TransParente, mostradas com autorização (veem-se na Lista; a TransParente não publica moradas).', transparenteEntities.length)}{' '}{tr('Fonte:')}{' '}<a href={TRANSPARENTE_EQI_URL} target="_blank" rel="noopener noreferrer">transparente.com.pt</a></span>}
      </section>
      <div className="chips">
        <button className={'chip' + (sealOnly ? ' on' : '')} onClick={() => setSealOnly(!sealOnly)}>{tr('🏅 Com selo')}</button>
        {(Object.keys(filterLabels) as Filter[]).map(f => (
          <button key={f} className={'chip' + (filters.includes(f) ? ' on' : '')} onClick={() => setFilters(filters.includes(f) ? filters.filter(x => x !== f) : [...filters, f])}>{filterLabels[f]}</button>
        ))}
      </div>
      <div className="grid2">
        <select className="input" value={kind} onChange={e => setKind(e.target.value)} aria-label={tr('Tipo de local')}><option value="">{tr('Todos os tipos')}</option>{entityKinds.map(k => <option key={k} value={k}>{tr(k)}</option>)}</select>
        <select className="input" value={district} onChange={e => setDistrict(e.target.value)} aria-label={tr('Distrito')}><option value="">{tr('Todo o país')}</option>{districts.map(d => <option key={d}>{d}</option>)}</select>
      </div>
      <div className="row between" style={{ gap: 8 }}>
        <Seg value={view} onChange={setView} options={[{ id: 'mapa', label: tr('Mapa') }, { id: 'lista', label: tr('Lista') }]} />
        <button className={'btn sm' + (me ? '' : ' ghost')} disabled={locating} onClick={() => (me ? setMe(null) : locate())}>
          <Icon name="pin" size={16} />{locating ? tr('A localizar…') : me ? tr('Perto de mim ✓') : tr('Perto de mim')}
        </button>
      </div>
      {view === 'mapa' && (
        <>
          <SafeMap places={onMap} user={me} selected={selected} onSelect={setSelected} height="min(60vh, 460px)" />
          {sel ? <PlaceCard p={sel} me={me} onRemove={remove} /> : (
            <p className="small muted" style={{ margin: 0 }}>
              {onMap.length ? tr('Toca num marcador para ver os detalhes.') : tr('Ainda não há locais com posição no mapa.')}{' '}
              {tr('A tua localização é usada só neste telemóvel e nunca é guardada nem enviada.')}
            </p>
          )}
        </>
      )}
      {view === 'lista' && (list.length === 0 ? (
        <Empty icon="pin" title={all.length ? tr('Nenhum local com estes filtros') : tr('Ainda não há locais')} text={tr('Conheces um ginásio, piscina ou café onde te sentiste em segurança? Adiciona-o.')} />
      ) : (
        <div className="stack">
          {list.map(p => <PlaceCard key={p.id} p={p} me={me} onRemove={remove} onShow={hasPos(p) ? () => { setSelected(p.id); setView('mapa') } : undefined} />)}
        </div>
      ))}
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
        <div className="stack" style={{ gap: 8 }}>
          <div className="row between"><b className="small">{tr('Onde fica')}</b>
            <button className="btn ghost sm" disabled={locating} onClick={() => locate(true)}><Icon name="pin" size={16} />{tr('Estou lá agora')}</button>
          </div>
          <SafeMap pick={form.pos} onPick={p => setForm(f => ({ ...f, pos: { lat: round4(p.lat), lng: round4(p.lng) } }))} height={220} />
          <span className="small muted">{form.pos ? (inPortugal(form.pos) ? tr('Local marcado. Toca no mapa para corrigir.') : tr('Este ponto parece estar fora de Portugal.')) : tr('Toca no mapa para marcar o local (opcional).')}</span>
        </div>
        <label className="field">{tr('Notas')}<textarea className="input" style={{ minHeight: 70 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={tr('Ex.: staff respeitoso, pede-se a chave na receção')} /></label>
        {apiEnabled && <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /> {tr('Partilhar com a comunidade (anónimo, moderado)')}</label>}
        {apiEnabled && share && <ShareNote />}
        <button className="btn block" disabled={form.name.trim().length < 2} onClick={save}>{tr('Guardar')}</button>
      </Sheet>
    </>
  )
}

/* ---------- Reportar incidente ---------- */

const incidentKinds = ['Insulto ou assédio verbal', 'Agressão física', 'Discriminação no trabalho', 'Discriminação na saúde', 'Discriminação num serviço', 'Assédio online', 'Recusa de atendimento', 'Outro']
const settings = ['Rua/transportes', 'Trabalho', 'Escola/universidade', 'Saúde', 'Serviço público', 'Comércio', 'Casa/família', 'Online']

export function Report() {
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
      {apiEnabled && <ShareNote />}
      <button className="btn block" disabled={!form.kind || !form.setting || !form.district} onClick={submit}>{apiEnabled ? tr('Enviar anonimamente') : tr('Copiar relato')}</button>
      <a className="small" href="https://ilga-portugal.pt" target="_blank" rel="noreferrer noopener">{tr('Observatório da Discriminação da ILGA Portugal')}</a>
    </>
  )
}
