// Para entidades: pacotes e preços, pedido de adesão, painel da entidade e regras de transparência.
// A app é gratuita para quem a usa; estes pacotes são pagos por empresas, profissionais,
// escolas e autarquias, e nunca dão acesso a dados de utilizadores nem compram o selo.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Empty, Seg, useToast } from '../components/ui'
import { api, apiEnabled, type EntityLogin, type EntityMe, type EntityReport } from '../lib/api'
import { districts } from '../data/health'
import { sealQuestions, sealStatusLabel, type EntityProfile } from '../data/seal'
import {
  PLANS_EMAIL, SITE_PLANS_URL, euros, isNativeApp, paidLabel, paymentLinks, planLabel, plans, policyLabel, serviceKinds, serviceLabel, sizeLabel, trainings,
  type OrgSize, type Plan, type PlanId,
} from '../data/plans'
import { tr } from '../i18n'

type Tab = 'pacotes' | 'formacao' | 'pedir'
type Audience = Plan['audience']

export function Business() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'pacotes'
  const [audience, setAudience] = useState<Audience>((params.get('para') as Audience) || 'empresas')
  const [chosen, setChosen] = useState<PlanId>('aliada')
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const ask = (p: PlanId) => { setChosen(p); setTab('pedir') }
  // Regras das lojas: na app nativa, os pacotes não se mostram nem se pedem; só no site.
  if (isNativeApp()) return (
    <>
      <TopBar title={tr('Para entidades')} back />
      <div className="page">
        <section className="card tint-accent">
          <h3>{tr('O Casulo é gratuito para quem o usa')}</h3>
          <p className="small">{tr('Informação para empresas, profissionais, escolas e autarquias está no site casulo.space.')}</p>
          <span className="small">{SITE_PLANS_URL}</span>
        </section>
        <Link className="btn secondary" to="/entidades/painel"><Icon name="lock" size={18} />{tr('Painel da entidade')}</Link>
        <Link className="btn secondary" to="/transparencia">{tr('Ver as regras')}</Link>
      </div>
    </>
  )
  return (
    <>
      <TopBar title={tr('Para entidades')} back />
      <div className="page">
        <section className="card tint-accent">
          <h3>{tr('O Casulo é gratuito para quem o usa')}</h3>
          <p className="small">{tr('Pessoas trans e quem as apoia nunca pagam. A app é sustentada por empresas, profissionais de saúde, escolas e autarquias que querem fazer melhor, e que pagam por ferramentas, formação e visibilidade.')}</p>
          <p className="small" style={{ margin: 0 }}><b>{tr('O Selo Casulo não se compra.')}</b>{' '}{tr('Vem só das avaliações da comunidade. Nenhum pacote dá acesso a dados de quem usa a app nem muda a ordem no mapa.')}{' '}<Link to="/transparencia">{tr('Ver as regras')}</Link></p>
        </section>
        <Seg value={tab} onChange={setTab} options={[{ id: 'pacotes', label: tr('Pacotes') }, { id: 'formacao', label: tr('Formação') }, { id: 'pedir', label: tr('Aderir') }]} />
        {tab === 'pacotes' && (
          <>
            <Seg value={audience} onChange={setAudience} options={[{ id: 'empresas', label: tr('Empresas') }, { id: 'saude', label: tr('Saúde') }, { id: 'publico', label: tr('Escolas e autarquias') }]} />
            {plans.filter(p => p.audience === audience).map(p => <PlanCard key={p.id} plan={p} onAsk={() => ask(p.id)} />)}
            {audience === 'empresas' && <p className="xs muted" style={{ margin: 0 }}>{tr('Associações LGBTI+, IPSS e cooperativas: 50% de desconto no pacote Aliada. Preços anuais, sem IVA.')}</p>}
          </>
        )}
        {tab === 'formacao' && <Trainings onAsk={() => ask('aliada')} />}
        {tab === 'pedir' && <RequestForm initial={chosen} />}
        <div className="grid2">
          <Link className="btn secondary" to="/entidades/painel"><Icon name="lock" size={18} />{tr('Painel da entidade')}</Link>
          <Link className="btn secondary" to="/selo?tab=registar"><Icon name="plus" size={18} />{tr('Registar no Selo (grátis)')}</Link>
        </div>
      </div>
    </>
  )
}

function PlanCard({ plan, onAsk }: { plan: Plan; onAsk: () => void }) {
  const sizes = (['pequena', 'media', 'grande'] as OrgSize[]).filter(s => plan.price[s] !== undefined)
  return (
    <section className={plan.id === 'parceira' ? 'card sealed' : 'card'}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <h3>{planLabel[plan.id]}</h3>
        {plan.price.base !== undefined && (
          <div className="stack" style={{ gap: 0, textAlign: 'right' }}>
            <b>{tr('{0} por ano', euros(plan.price.base))}</b>
            {plan.price.monthly !== undefined && <span className="xs muted">{tr('ou {0} por mês', euros(plan.price.monthly))}</span>}
          </div>
        )}
      </div>
      {sizes.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          {sizes.map(s => (
            <div key={s} className="row between small">
              <span>{plan.id === 'municipio' ? (s === 'pequena' ? tr('Até 50 000 habitantes') : tr('Mais de 50 000 habitantes')) : sizeLabel[s]}</span>
              <b>{tr('{0} por ano', euros(plan.price[s]!))}</b>
            </div>
          ))}
        </div>
      )}
      {plan.priceNote && plan.price.base !== undefined && <span className="xs muted">{plan.priceNote}</span>}
      <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{plan.features.map(f => <li key={f}>{f}</li>)}</ul>
      <button className="btn sm" style={{ justifySelf: 'start' }} onClick={onAsk}>{tr('Pedir este pacote')}</button>
    </section>
  )
}

function Trainings({ onAsk }: { onAsk: () => void }) {
  return (
    <>
      <section className="card">
        <h3>{tr('Formação avulsa')}</h3>
        <p className="small">{tr('Dada por pessoas trans com experiência em formação. Pelo menos metade do valor vai para quem forma.')}</p>
        <div className="stack" style={{ gap: 4 }}>
          {trainings.map(t => (
            <div key={t.label} className="row between small" style={{ gap: 12 }}>
              <span className="grow">{t.label} <span className="muted">· {tr('{0} h', t.hours.toLocaleString('pt-PT'))}</span></span>
              <b>{euros(t.price)}</b>
            </div>
          ))}
        </div>
        <span className="xs muted">{tr('Preços sem IVA. Os pacotes Aliada e Parceira já incluem formação.')}</span>
      </section>
      <button className="btn" onClick={onAsk}>{tr('Pedir orçamento')}</button>
    </>
  )
}

function RequestForm({ initial }: { initial: PlanId }) {
  const toast = useToast()
  const [form, setForm] = useState({ org: '', plan: initial, size: 'pequena' as OrgSize, contact: '', nif: '', message: '', entityId: '' })
  const [sent, setSent] = useState(false)
  useEffect(() => setForm(f => ({ ...f, plan: initial })), [initial])
  const ok = form.org.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.trim())
  const link = paymentLinks[`${form.plan}-${form.size}`] ?? paymentLinks[form.plan]
  const submit = async () => {
    if (!apiEnabled) { toast(tr('O pedido fica disponível quando o servidor estiver ligado')); return }
    try {
      await api.planRequest({ org: form.org.trim(), plan: form.plan, size: form.size, contact: form.contact.trim(), nif: form.nif.trim() || undefined, message: form.message.trim() || undefined, entityId: form.entityId.trim() || undefined })
      setSent(true)
    } catch (e) { toast((e as Error).message) }
  }
  if (sent) return (
    <section className="card tint-mint">
      <h3>{tr('Pedido enviado')}</h3>
      <p className="small">{tr('Respondemos em 2 dias úteis com a fatura e os próximos passos. Quando estiver paga, o pacote fica ativo na ficha da vossa entidade.')}</p>
      {link && <a className="btn" href={link} target="_blank" rel="noopener noreferrer"><Icon name="external" size={18} />{tr('Pagar já com cartão')}</a>}
    </section>
  )
  return (
    <>
      <label className="field">{tr('Nome da entidade')}<input className="input" value={form.org} onChange={e => setForm({ ...form, org: e.target.value })} /></label>
      <div className="grid2">
        <label className="field">{tr('Pacote')}<select className="input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value as PlanId })}>{plans.map(p => <option key={p.id} value={p.id}>{planLabel[p.id]}</option>)}</select></label>
        <label className="field">{tr('Dimensão')}<select className="input" value={form.size} onChange={e => setForm({ ...form, size: e.target.value as OrgSize })}>{(Object.keys(sizeLabel) as OrgSize[]).map(s => <option key={s} value={s}>{sizeLabel[s]}</option>)}</select></label>
      </div>
      <label className="field">{tr('E-mail para a fatura')}<input className="input" type="email" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></label>
      <label className="field">{tr('NIF (opcional)')}<input className="input" inputMode="numeric" maxLength={20} value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} /></label>
      <label className="field">{tr('Código da entidade no Selo (opcional)')}<input className="input" maxLength={40} value={form.entityId} onChange={e => setForm({ ...form, entityId: e.target.value })} />
        <span className="xs muted">{tr('Recebem-no ao registar a entidade. Se ainda não a registaram, façam-no primeiro: é grátis.')}</span></label>
      <label className="field">{tr('Mensagem (opcional)')}<textarea className="input" maxLength={1000} style={{ minHeight: 70 }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
      <button className="btn block" disabled={!ok} onClick={submit}>{tr('Enviar pedido')}</button>
      <p className="xs muted">{tr('Usamos estes dados só para enviar a fatura e ativar o pacote. São apagados ao fim de 12 meses. Dúvidas: {0}', PLANS_EMAIL)}</p>
    </>
  )
}

/* ---------- regras de transparência ---------- */

export const transparencyRules = [
  tr('O Selo Casulo e as avaliações não se compram. Uma entidade que paga perde o selo como qualquer outra, sem reembolso.'),
  tr('A ordem no mapa e nas listas nunca depende de pagamento. O que é pago tem sempre o rótulo "pacote pago".'),
  tr('Os relatórios para entidades só mostram totais anónimos. Um número abaixo de 5 avaliações ou incidentes não aparece, e não há comentários nem datas exatas.'),
  tr('A app não tem publicidade, rastreadores nem píxeis. As entidades nunca recebem dados de quem usa a app.'),
  tr('Quem pede uma sessão solidária recebe só um código. O Casulo não sabe quem o pediu; sabe apenas que foi usado.'),
  tr('Entidades ligadas a práticas de conversão (crime pela Lei 15/2024) ou com queixas graves confirmadas não podem ter pacotes.'),
  tr('As contas são publicadas uma vez por ano: quanto entrou e de onde, e quanto foi para formadores e sessões solidárias.'),
]

export function Transparency() {
  return (
    <>
      <TopBar title={tr('Transparência')} back />
      <div className="page">
        <section className="card tint-mint">
          <h3>{tr('Como o Casulo se sustenta')}</h3>
          <p className="small">{tr('A app é gratuita para pessoas trans e para quem as apoia. Quem paga são entidades: empresas, profissionais de saúde, escolas e autarquias. Estas regras fazem parte de cada contrato.')}</p>
        </section>
        <section className="card">
          <h3>{tr('As regras')}</h3>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>{transparencyRules.map(r => <li key={r}>{r}</li>)}</ol>
        </section>
        <Link className="btn secondary" to="/entidades"><Icon name="star" size={18} />{tr('Ver pacotes e preços')}</Link>
      </div>
    </>
  )
}

/* ---------- painel da entidade ---------- */

const LOGIN_KEY = 'casulo-entidade'
const readLogin = (): EntityLogin | null => { try { return JSON.parse(sessionStorage.getItem(LOGIN_KEY) ?? 'null') } catch { return null } }

export function EntityPanel() {
  const toast = useToast()
  const [login, setLogin] = useState<EntityLogin | null>(readLogin)
  const [form, setForm] = useState({ id: '', key: '' })
  const [me, setMe] = useState<EntityMe | null>(null)
  const refresh = (l = login) => { if (l) api.entityMe(l).then(setMe).catch(e => { toast((e as Error).message); logout() }) }
  useEffect(() => { refresh() }, [login]) // eslint-disable-line react-hooks/exhaustive-deps
  function logout() { try { sessionStorage.removeItem(LOGIN_KEY) } catch { /* sem armazenamento */ } setLogin(null); setMe(null) }
  const enter = () => {
    const l = { id: form.id.trim(), key: form.key.trim() }
    try { sessionStorage.setItem(LOGIN_KEY, JSON.stringify(l)) } catch { /* sem armazenamento */ }
    setLogin(l)
  }

  if (!login) return (
    <>
      <TopBar title={tr('Painel da entidade')} back />
      <div className="page">
        <section className="card tint-accent">
          <h3>{tr('Entrar com o código e a chave')}</h3>
          <p className="small">{tr('Receberam-nos ao registar a entidade no Selo Casulo. Se perderam a chave, peçam uma nova para {0}.', PLANS_EMAIL)}</p>
        </section>
        <label className="field">{tr('Código da entidade')}<input className="input" autoComplete="username" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} /></label>
        <label className="field">{tr('Chave')}<input className="input" type="password" autoComplete="current-password" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} /></label>
        <button className="btn block" disabled={!apiEnabled || form.id.trim().length < 4 || form.key.trim().length < 10} onClick={enter}>{tr('Entrar')}</button>
        <Link className="small" to="/entidades">{tr('Ainda não têm pacote? Ver pacotes e preços')}</Link>
      </div>
    </>
  )

  if (!me) return (<><TopBar title={tr('Painel da entidade')} back /><div className="page"><Empty icon="star" title={tr('A carregar…')} /></div></>)

  const plan = me.plan
  return (
    <>
      <TopBar title={tr('Painel da entidade')} back right={<button className="icon-btn" onClick={logout} aria-label={tr('Sair do painel')}><Icon name="x" /></button>} />
      <div className="page">
        <section className="stack">
          <h1 style={{ fontSize: '1.3rem', margin: 0 }}>{me.entity.name}</h1>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="badge">{me.entity.status === 'approved' ? (me.entity.seal ? sealStatusLabel[me.entity.seal] : '') : tr('À espera da moderação')}</span>
            {plan && <span className="badge accent">{paidLabel(plan.plan)}</span>}
          </div>
          {me.entity.status === 'approved' && <Link className="small" to={`/selo/${me.entity.id}`}>{tr('Ver a página pública')}</Link>}
        </section>
        {!plan ? (
          <section className="card">
            <h3>{tr('Sem pacote ativo')}</h3>
            <p className="small">{tr('A ficha básica e o Selo são gratuitos. Com um pacote, podem completar a ficha, publicar ofertas de emprego e receber um relatório anónimo.')}</p>
            <Link className="btn sm" style={{ justifySelf: 'start' }} to="/entidades">{tr('Ver pacotes e preços')}</Link>
          </section>
        ) : (
          <>
            <p className="small muted" style={{ margin: 0 }}>{tr('Pacote {0} ativo até {1}.', planLabel[plan.plan], plan.until)}</p>
            <ProfileForm login={login} plan={plan.plan} initial={me.profile} waiting={me.profileWaiting} onSaved={() => refresh()} />
            {(plan.plan === 'aliada' || plan.plan === 'parceira') && <JobsBox login={login} me={me} onChange={() => refresh()} />}
            <ReportBox login={login} />
            {(plan.plan === 'profissional' || plan.plan === 'clinica') && <RedeemBox login={login} />}
          </>
        )}
        <Link className="small" to="/transparencia">{tr('As regras de transparência que aceitaram')}</Link>
      </div>
    </>
  )
}

function ProfileForm({ login, plan, initial, waiting, onSaved }: { login: EntityLogin; plan: PlanId; initial: EntityProfile | null; waiting: boolean; onSaved: () => void }) {
  const toast = useToast()
  const [p, setP] = useState<EntityProfile>(initial ?? {})
  const services = plan === 'profissional' || plan === 'clinica'
  const company = plan === 'aliada' || plan === 'parceira'
  const set = (k: keyof EntityProfile, v: unknown) => setP({ ...p, [k]: v })
  const urlBad = (u?: string) => !!u && !/^https:\/\/\S+$/.test(u)
  const togglePolicy = (id: string) => set('policies', p.policies?.includes(id) ? p.policies.filter(x => x !== id) : [...(p.policies ?? []), id])
  const svc = (kind: string) => p.services?.find(s => s.kind === kind)
  const setSvc = (kind: string, v: { price: number; online: boolean } | null) =>
    set('services', [...(p.services ?? []).filter(s => s.kind !== kind), ...(v ? [{ kind: kind as never, ...v }] : [])])
  const save = async () => {
    try { const r = await api.entityProfile(login, p); toast(r.published ? tr('Ficha atualizada.') : tr('Ficha enviada: vai ser revista pela moderação.')); onSaved() }
    catch (e) { toast((e as Error).message) }
  }
  return (
    <section className="card">
      <h3>{tr('Ficha completa')}</h3>
      {waiting && <p className="xs muted" style={{ margin: 0 }}>{tr('Há uma versão à espera da moderação. A versão publicada continua visível até lá.')}</p>}
      <label className="field">{tr('Sobre a entidade')}<textarea className="input" maxLength={1200} style={{ minHeight: 80 }} value={p.about ?? ''} onChange={e => set('about', e.target.value)} /></label>
      {company && (
        <>
          <b className="small">{tr('Políticas que já têm')}</b>
          {Object.entries(policyLabel).map(([id, label]) => (
            <label key={id} className="row small" style={{ gap: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={!!p.policies?.includes(id)} onChange={() => togglePolicy(id)} /> {label}</label>
          ))}
          <label className="field">{tr('Benefícios')}<textarea className="input" maxLength={600} value={p.benefits ?? ''} onChange={e => set('benefits', e.target.value)} placeholder={tr('Ex.: seguro de saúde, dias de ausência, apoio na mudança de nome')} /></label>
        </>
      )}
      {services && (
        <>
          <label className="row small" style={{ gap: 10 }}><input type="checkbox" checked={!!p.sns} onChange={e => set('sns', e.target.checked)} /> {tr('Trabalho também no SNS')}</label>
          <label className="field">{tr('Preços e acordos')}<input className="input" maxLength={300} value={p.prices ?? ''} onChange={e => set('prices', e.target.value)} /></label>
          <label className="field">{tr('Ligação para marcações')}<input className="input" inputMode="url" placeholder="https://" value={p.bookingUrl ?? ''} onChange={e => set('bookingUrl', e.target.value)} /></label>
          <b className="small">{tr('Serviços especializados')}</b>
          {serviceKinds.map(k => {
            const s = svc(k)
            return (
              <div key={k} className="row wrap small" style={{ gap: 8 }}>
                <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={!!s} onChange={e => setSvc(k, e.target.checked ? { price: 40, online: true } : null)} /> {serviceLabel[k]}</label>
                {s && <>
                  <input className="input" type="number" min={0} max={500} style={{ width: 90 }} value={s.price} onChange={e => setSvc(k, { ...s, price: Math.max(0, Math.min(500, Math.round(Number(e.target.value)))) })} aria-label={tr('Preço por sessão (€)')} /> €
                  <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={s.online} onChange={e => setSvc(k, { ...s, online: e.target.checked })} /> {tr('Online')}</label>
                </>}
              </div>
            )
          })}
          <label className="row small" style={{ gap: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={!!p.vouchers} onChange={e => set('vouchers', e.target.checked)} /> {tr('Aceito sessões solidárias (o Casulo paga-me cada código usado)')}</label>
        </>
      )}
      <label className="field">{tr('Línguas')}<input className="input" maxLength={120} value={p.languages ?? ''} onChange={e => set('languages', e.target.value)} placeholder={tr('Ex.: português, inglês, LGP')} /></label>
      <div className="grid2">
        <label className="field">{tr('Contacto público (site)')}<input className="input" inputMode="url" placeholder="https://" value={p.contactUrl ?? ''} onChange={e => set('contactUrl', e.target.value)} /></label>
        <label className="field">{tr('Contacto público (e-mail)')}<input className="input" type="email" value={p.contactEmail ?? ''} onChange={e => set('contactEmail', e.target.value)} /></label>
      </div>
      {company && <span className="xs muted">{tr('Um contacto de RH seguro, que responda a pessoas trans com discrição.')}</span>}
      <button className="btn" disabled={urlBad(p.contactUrl) || urlBad(p.bookingUrl)} onClick={save}>{tr('Guardar ficha')}</button>
    </section>
  )
}

function JobsBox({ login, me, onChange }: { login: EntityLogin; me: EntityMe; onChange: () => void }) {
  const toast = useToast()
  const empty = { title: '', district: me.entity.district, remote: false, url: '', description: '' }
  const [job, setJob] = useState(empty)
  const ok = job.title.trim().length >= 3 && /^https:\/\/\S+$/.test(job.url.trim())
  const send = async () => {
    try { const r = await api.entityJob(login, { ...job, title: job.title.trim(), url: job.url.trim(), description: job.description.trim() || undefined }); toast(r.published ? tr('Oferta publicada.') : tr('Oferta enviada: vai ser revista pela moderação.')); setJob(empty); onChange() }
    catch (e) { toast((e as Error).message) }
  }
  return (
    <section className="card">
      <h3>{tr('Ofertas de emprego')}</h3>
      <p className="xs muted" style={{ margin: 0 }}>{me.plan?.plan === 'parceira' ? tr('Ilimitadas no pacote Parceira. Cada oferta fica 3 meses.') : tr('Ainda podem publicar {0} este ano. Cada oferta fica 3 meses.', me.jobsLeft)}</p>
      {me.jobs.map(j => (
        <div key={j.id} className="row between small" style={{ gap: 8 }}>
          <span className="grow">{j.title} <span className="muted">· {j.status === 'approved' ? tr('publicada') : tr('em revisão')}</span></span>
          <button className="btn sm secondary" onClick={() => api.entityDeleteJob(login, j.id).then(onChange).catch(e => toast((e as Error).message))}>{tr('Retirar')}</button>
        </div>
      ))}
      {(me.plan?.plan === 'parceira' || me.jobsLeft > 0) && (
        <>
          <label className="field">{tr('Função')}<input className="input" maxLength={120} value={job.title} onChange={e => setJob({ ...job, title: e.target.value })} /></label>
          <div className="grid2">
            <label className="field">{tr('Distrito')}<select className="input" value={job.district} onChange={e => setJob({ ...job, district: e.target.value })}>{districts.map(d => <option key={d}>{d}</option>)}</select></label>
            <label className="row small" style={{ gap: 8, alignSelf: 'end' }}><input type="checkbox" checked={job.remote} onChange={e => setJob({ ...job, remote: e.target.checked })} /> {tr('Remoto possível')}</label>
          </div>
          <label className="field">{tr('Ligação para a candidatura')}<input className="input" inputMode="url" placeholder="https://" value={job.url} onChange={e => setJob({ ...job, url: e.target.value })} /></label>
          <label className="field">{tr('Descrição (opcional)')}<textarea className="input" maxLength={1500} value={job.description} onChange={e => setJob({ ...job, description: e.target.value })} /></label>
          <button className="btn" disabled={!ok} onClick={send}>{tr('Publicar oferta')}</button>
        </>
      )}
    </section>
  )
}

function ReportBox({ login }: { login: EntityLogin }) {
  const [r, setR] = useState<EntityReport | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.entityReport(login).then(setR).catch(e => setErr((e as Error).message)) }, [login])
  const rows = (o: Record<string, number>) => Object.entries(o).sort().map(([k, n]) => <div key={k} className="row between small"><span>{tr(k)}</span><b>{n}</b></div>)
  return (
    <section className="card">
      <h3>{tr('Relatório anónimo')}</h3>
      {err ? <p className="small muted">{err}</p> : !r ? <p className="small muted">{tr('A carregar…')}</p> : (
        <>
          {r.enough && r.scores ? (
            <>
              <p className="small" style={{ margin: 0 }}>{tr('{0} avaliações nos últimos 2 anos.', r.reviews ?? 0)}</p>
              {sealQuestions.map(q => r.scores?.[q.id] === undefined ? null : (
                <div key={q.id} className="stack" style={{ gap: 4 }}>
                  <div className="row between small"><span>{q.label}</span><b>{Math.round(r.scores[q.id]! * 100)}%</b></div>
                  <div className="progress"><div style={{ width: `${r.scores[q.id]! * 100}%` }} /></div>
                </div>
              ))}
              {r.byQuarter && Object.keys(r.byQuarter).length > 0 && <><b className="small">{tr('Avaliações por trimestre')}</b>{rows(r.byQuarter)}</>}
            </>
          ) : <p className="small muted">{tr('O relatório aparece com {0} ou mais avaliações. Assim ninguém pode ser reconhecido pelo que respondeu.', r.min)}</p>}
          {r.incidents && (
            <>
              <b className="small">{tr('Incidentes relatados no distrito de {0}', r.incidents.district)}</b>
              {r.incidents.total ? <p className="small" style={{ margin: 0 }}>{tr('{0} relatos no total.', r.incidents.total)}</p> : <p className="small muted" style={{ margin: 0 }}>{tr('Ainda há menos de {0} relatos.', r.min)}</p>}
              {rows(r.incidents.byKind)}{rows(r.incidents.bySetting)}{rows(r.incidents.byQuarter)}
            </>
          )}
          <span className="xs muted">{tr('Só totais: grupos com menos de {0} ficam de fora, sem comentários nem datas exatas.', r.min)}</span>
        </>
      )}
    </section>
  )
}

function RedeemBox({ login }: { login: EntityLogin }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const redeem = async () => {
    try { await api.redeemVoucher(login, code.trim()); toast(tr('Código registado. A sessão entra no pagamento deste mês.')); setCode('') }
    catch (e) { toast((e as Error).message) }
  }
  return (
    <section className="card">
      <h3>{tr('Sessões solidárias')}</h3>
      <p className="small">{tr('Quando alguém vos mostrar um código CSL, registem-no aqui no dia da sessão. O Casulo paga cada sessão usada no fim do mês. Não peçam o nome nem o motivo.')}</p>
      <div className="row" style={{ gap: 8 }}>
        <input className="input grow" placeholder="CSL-XXXX-XXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={code.trim().length < 10} onClick={redeem}>{tr('Registar')}</button>
      </div>
    </section>
  )
}
