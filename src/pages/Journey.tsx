import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Ring } from '../components/ui'
import { checklistPT } from '../data/guides'
import { infoFor } from '../data/countryInfo'
import { useCountry } from '../lib/useCountry'
import { chosenSteps } from '../data/healthPath'
import { tr } from '../i18n'

export interface Milestone { id: string; title: string; to: string; done: boolean; sub?: string }

/** As etapas do percurso social e legal, por ordem. Usado aqui e no "Próximo passo" do Hoje. */
export function useMilestones(): Milestone[] {
  const { vault } = useVault()
  const pack = useCountry()
  const entities = pack.code === 'PT' ? checklistPT : infoFor(pack.code)?.entities ?? []
  const checks = entities.filter(c => vault.checklist[c.id]).length
  const health = chosenSteps(vault.healthPath)
  const healthDone = health.filter(h => vault.healthPath.steps[h.step.id]?.done).length
  return [
    { id: 'apoio', title: tr('Contar a quem me apoia'), to: '/partilhar', done: !!vault.supportCard },
    // Só ações contam como etapas; passos de informação (como o custo) ficam no guia.
    ...(pack.guide?.steps ?? []).filter(st => !st.info).map(st => ({ id: st.id, title: st.title, to: '/documentos', done: !!vault.guideSteps[st.id] })),
    ...(entities.length ? [{ id: 'entidades', title: tr('Atualizar banco, escola, trabalho e contratos'), to: '/documentos?tab=checklist', done: checks === entities.length, sub: tr('{0}/{1} passos', checks, entities.length) }] : []),
    // Só entra no caminho se a pessoa escolheu partes do percurso de saúde.
    ...(health.length ? [{ id: 'saude', title: tr('O meu percurso de saúde'), to: '/percurso/saude', done: healthDone === health.length, sub: tr('{0}/{1} passos', healthDone, health.length) }] : []),
  ]
}

export function Journey() {
  const steps = useMilestones()
  const done = steps.filter(s => s.done).length
  const nowId = steps.find(s => !s.done)?.id

  const tools = [
    { to: '/nome', icon: 'sparkle', title: tr('Ensaiar nome'), sub: tr('Ouve-o e vê-o no dia a dia'), color: 'var(--accent)', bg: 'var(--accent-soft)' },
    { to: '/percurso/saude', icon: 'heart', title: tr('Percurso de saúde'), sub: tr('Consultas, hormonas e cirurgias que escolheres'), color: 'var(--sky)', bg: 'var(--sky-soft)' },
    { to: '/documentos', icon: 'doc', title: tr('Documentos e cartas prontas'), sub: tr('Passo a passo, checklist e pedidos já escritos'), color: 'var(--mint)', bg: 'var(--mint-soft)' },
    { to: '/partilhar', icon: 'heart', title: tr('Cartão para quem me apoia'), sub: tr('Diz a quem te rodeia como te tratar e quem já sabe'), color: 'var(--rose)', bg: 'var(--rose-soft)' },
    { to: '/emprego', icon: 'briefcase', title: tr('Trabalho'), sub: tr('Empresas inclusivas'), color: 'var(--amber)', bg: 'var(--amber-soft)' },
  ]

  return (
    <>
      <TopBar title={tr('Percurso')} />
      <div className="page">
        <section className="card neon">
          <div className="row between">
            <div className="stack" style={{ gap: 2 }}>
              <h2>{tr('O teu caminho')}</h2>
              <span className="small muted">{tr('{0} de {1} etapas', done, steps.length)}</span>
            </div>
            <Ring value={done / steps.length} size={62} color="var(--accent)" track="var(--surface-2)" />
          </div>
          <ol className="path">
            {steps.map(s => (
              <li key={s.id} className={s.done ? 'done' : s.id === nowId ? 'now' : ''}>
                <Link to={s.to}>
                  <span className="dot" aria-hidden="true">{s.done && <Icon name="check" size={12} />}</span>
                  <span className="grow">{s.title}{s.sub && <span className="xs muted"> · {s.sub}</span>}</span>
                  {s.id === nowId && <span className="badge accent">{tr('A seguir')}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <div className="list">
          {tools.map(t => (
            <Link key={t.to} to={t.to} className="item">
              <div className="lead" style={{ background: t.bg, color: t.color }}><Icon name={t.icon} /></div>
              <div className="grow"><h3>{t.title}</h3><p className="small muted">{t.sub}</p></div>
              <Icon name="chevron" />
            </Link>
          ))}
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>{tr('Não encontraste o que procuravas?')} <Link to="/sugerir">{tr('Diz-nos o que falta')}</Link></p>
      </div>
    </>
  )
}
