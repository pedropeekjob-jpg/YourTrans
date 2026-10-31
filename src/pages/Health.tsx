import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, Sheet, useToast } from '../components/ui'
import { districts, organLabels, screeningsFor, snsPathway, type Organ, type Provider, type ProviderKind } from '../data/health'
import { useProviders } from '../lib/useProviders'
import { api, apiEnabled } from '../lib/api'
import { uid } from '../lib/types'

type Tab = 'diretorio' | 'percurso' | 'rastreios'
const kinds: ProviderKind[] = ['Medicina geral', 'Endocrinologia', 'Psicologia', 'Psiquiatria', 'Sexologia', 'Cirurgia', 'Terapia da fala', 'Clínica']

export function Health() {
  const [tab, setTab] = useState<Tab>('diretorio')
  return (
    <>
      <TopBar title="Saúde" />
      <div className="page">
        <Seg value={tab} onChange={setTab} options={[
          { id: 'diretorio', label: 'Profissionais' },
          { id: 'percurso', label: 'Percurso SNS' },
          { id: 'rastreios', label: 'Rastreios' },
        ]} />
        {tab === 'diretorio' && <Directory />}
        {tab === 'percurso' && <Pathway />}
        {tab === 'rastreios' && <Screenings />}
      </div>
    </>
  )
}

export function scoreBadge(p: Provider) {
  if (!p.scores?.nomeCerto || !p.reviewCount) return null
  const pct = Math.round(p.scores.nomeCerto * 100)
  return <span className={'badge ' + (pct >= 80 ? 'mint' : 'amber')}>{pct}% nome certo · {p.reviewCount}</span>
}

function Directory() {
  const { providers, online } = useProviders()
  const { vault, update } = useVault()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<ProviderKind | ''>('')
  const [district, setDistrict] = useState('')
  const [suggest, setSuggest] = useState(false)

  const list = useMemo(() => providers.filter(p =>
    (!kind || p.kind === kind) && (!district || p.district === district) &&
    (!q || (p.name + ' ' + (p.notes ?? '')).toLowerCase().includes(q.toLowerCase()))), [providers, kind, district, q])

  return (
    <>
      <section className="card tint-rose">
        <h3>Avaliado pela comunidade</h3>
        <p className="small">Cada avaliação responde a perguntas simples, como "trataram-me pelo nome certo?". Tudo é moderado antes de ser publicado.</p>
      </section>
      <input className="input" placeholder="Procurar" value={q} onChange={e => setQ(e.target.value)} aria-label="Procurar profissionais" />
      <div className="chips">
        <button className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>Todos</button>
        {kinds.map(k => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      <select className="input" value={district} onChange={e => setDistrict(e.target.value)} aria-label="Distrito">
        <option value="">Todo o país</option>
        {districts.map(d => <option key={d}>{d}</option>)}
      </select>

      {list.length === 0 ? (
        <Empty icon="map" title="Ainda não há registos aqui" text="Conheces um/a profissional que te tratou bem? Sugere para ajudar outras pessoas." />
      ) : (
        <div className="list">
          {list.map(p => {
            const fav = vault.favourites.includes(p.id)
            return (
              <div key={p.id} className="item" style={{ alignItems: 'flex-start' }}>
                <Link to={`/saude/${p.id}`} className="row grow" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' }}>
                  <div className="lead" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="heart" /></div>
                  <div className="grow stack" style={{ gap: 4 }}>
                    <h3>{p.name}</h3>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <span className="badge">{p.kind}</span>
                      <span className="badge">{p.district}</span>
                      <span className="badge accent">{p.sector}</span>
                      {scoreBadge(p)}
                    </div>
                  </div>
                </Link>
                <button className="icon-btn" style={{ boxShadow: 'none', color: fav ? 'var(--amber)' : 'var(--muted)' }} aria-label={fav ? 'Remover dos favoritos' : 'Guardar'}
                  onClick={() => update(v => ({ ...v, favourites: fav ? v.favourites.filter(x => x !== p.id) : [...v.favourites, p.id] }))}>
                  <Icon name="star" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button className="btn secondary block" onClick={() => setSuggest(true)}><Icon name="plus" size={18} />Sugerir profissional ou serviço</button>
      {!online && <p className="xs muted">A mostrar a informação pública incluída na app. As avaliações da comunidade aparecem quando houver ligação ao servidor.</p>}
      <SuggestSheet open={suggest} onClose={() => setSuggest(false)} />
    </>
  )
}

function SuggestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', kind: 'Endocrinologia' as ProviderKind, district: 'Lisboa', sector: 'SNS' as Provider['sector'], notes: '' })
  const submit = async () => {
    if (!apiEnabled) { toast('O envio fica disponível quando o servidor estiver ligado'); return }
    try { await api.suggestProvider(form); toast('Obrigado! Vai ser revisto pela moderação.'); onClose() } catch (e) { toast((e as Error).message) }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Sugerir">
      <label className="field">Nome do/a profissional ou serviço<input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <div className="grid2">
        <label className="field">Área<select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as ProviderKind })}>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
        <label className="field">Distrito<select className="input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}>{districts.map(d => <option key={d}>{d}</option>)}</select></label>
      </div>
      <div className="chips">{(['SNS', 'Privado', 'Associação'] as const).map(s => <button key={s} className={'chip' + (form.sector === s ? ' on' : '')} onClick={() => setForm({ ...form, sector: s })}>{s}</button>)}</div>
      <label className="field">Porque recomendas? (sem dados pessoais)<textarea className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
      <p className="xs muted">Não guardamos quem envia. Sugestões são revistas antes de aparecerem.</p>
      <button className="btn block" disabled={form.name.trim().length < 3} onClick={submit}>Enviar para moderação</button>
    </Sheet>
  )
}

function Pathway() {
  const nav = useNavigate()
  return (
    <>
      <section className="card tint-sky">
        <h3>Como funciona no SNS</h3>
        <p className="small">Não existe um protocolo nacional único, por isso o percurso varia. Este é o caminho mais comum. Há três centros especializados: ULS Coimbra, ULS São José (Lisboa) e ULS Santo António (Porto).</p>
      </section>
      <div className="timeline">
        {snsPathway.map((s, i) => (
          <div key={s.id} className="tl">
            <div className="rail"><div className="dot">{i + 1}</div><div className="line" /></div>
            <div className="content">
              <h3>{s.title}</h3>
              <p className="small">{s.body}</p>
              {s.tip && <p className="small card tint-amber" style={{ padding: 10 }}>💡 {s.tip}</p>}
              {s.stories && <button className="btn ghost sm" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => nav(`/comunidade?tab=testemunhos&tema=${s.stories}`)}><Icon name="people" size={16} />Como foi para outras pessoas</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="card tint-accent">
        <h3>Pede a referenciação por escrito</h3>
        <p className="small">Preparámos uma carta para levares ao/à médico/a de família.</p>
        <button className="btn" onClick={() => nav('/documentos?tab=pedidos&kind=referral')}>Abrir carta</button>
      </div>
      <button className="btn secondary block" onClick={() => nav('/diario?tab=consultas')}><Icon name="calendar" size={18} />Preparar a próxima consulta</button>
    </>
  )
}

function Screenings() {
  const { vault, update } = useVault()
  const toast = useToast()
  const s = vault.settings
  const age = s.birthYear ? new Date().getFullYear() - s.birthYear : undefined
  const list = age !== undefined ? screeningsFor(age, s.organs) : []
  const toggle = (o: Organ) => update(v => ({ ...v, settings: { ...v.settings, organs: v.settings.organs.includes(o) ? v.settings.organs.filter(x => x !== o) : [...v.settings.organs, o] } }))

  return (
    <>
      <section className="card tint-mint">
        <h3>Rastreios pelo teu corpo, não pelo registo</h3>
        <p className="small">O sistema de rastreio do SNS usa o sexo que está no registo. Se o mudaste, podes deixar de ser chamade para rastreios de que ainda precisas. Diz-nos o que se aplica a ti e lembramos-te.</p>
      </section>
      <label className="field">Ano de nascimento
        <input className="input" inputMode="numeric" value={s.birthYear ?? ''} placeholder="Ex.: 1995"
          onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, '').slice(0, 4)); update(v => ({ ...v, settings: { ...v.settings, birthYear: isNaN(n) ? undefined : n } })) }} />
      </label>
      <div className="stack">
        <span className="small" style={{ fontWeight: 600 }}>Tenho…</span>
        <div className="list">
          {(Object.keys(organLabels) as Organ[]).map(o => (
            <button key={o} className="item" onClick={() => toggle(o)}>
              <span className={'check' + (s.organs.includes(o) ? ' on' : '')}><Icon name="check" size={18} /></span>
              <span className="grow">{organLabels[o]}</span>
            </button>
          ))}
        </div>
      </div>
      {age === undefined ? (
        <p className="small muted">Indica o ano de nascimento para veres os rastreios recomendados.</p>
      ) : list.length === 0 ? (
        <Empty icon="check" title="Sem rastreios organizados para a tua idade" text="Mantém as consultas regulares com o/a teu/tua médico/a." />
      ) : (
        <div className="stack">
          {list.map(sc => (
            <div key={sc.id} className="card">
              <h3>{sc.title}</h3>
              <p className="small muted">{sc.who}</p>
              <p className="small"><b>Quando:</b> {sc.when}</p>
              <button className="btn sm secondary" style={{ justifySelf: 'start' }} onClick={() => {
                const next = new Date(); next.setMonth(next.getMonth() + 1); next.setHours(10, 0, 0, 0)
                update(v => ({ ...v, reminders: [...v.reminders, { id: uid(), kind: 'analises', label: sc.title, next: next.toISOString(), everyDays: 0, notes: 'Marcar com o centro de saúde' }] }))
                toast('Lembrete criado para daqui a um mês')
              }}><Icon name="bell" size={16} />Lembrar-me de marcar</button>
            </div>
          ))}
        </div>
      )}
      <p className="xs muted">Informação geral, não substitui aconselhamento médico. Fala com o/a teu/tua médico/a sobre o que faz sentido para ti.</p>
    </>
  )
}
