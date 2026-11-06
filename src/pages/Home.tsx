import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Progress, Ring, fmtDate, useToast } from '../components/ui'
import { annualEvents, nextOccurrence } from '../data/events'
import { useMilestones } from './Journey'
import { todayKey, uid } from '../lib/types'
import { tr } from '../i18n'

export const moods = ['😞', '😕', '😐', '🙂', '🤩']

const facts = [
  tr('Em Portugal, desde 2018, maiores de 18 anos mudam o nome e o sexo no registo sem relatório médico.'),
  tr('Tens direito, pelo RGPD, a pedir que qualquer entidade corrija o teu nome. Têm um mês para responder.'),
  tr('Nas escolas portuguesas podes usar o nome escolhido mesmo antes da mudança legal.'),
  tr('O rastreio do colo do útero continua a ser importante para homens trans com testosterona.'),
  tr('Antes de iniciar hormonas podes perguntar pela preservação de fertilidade no SNS.'),
  tr('Há três centros especializados do SNS: Coimbra, Lisboa (São José) e Porto (Santo António).'),
  tr('Podes pedir ao teu centro de saúde para atualizar o nome no RNU logo que tenhas o novo Cartão de Cidadão.'),
]

function greeting(): string {
  const h = new Date().getHours()
  return h < 6 ? tr('Boa noite') : h < 13 ? tr('Bom dia') : h < 20 ? tr('Boa tarde') : tr('Boa noite')
}

export function streak(days: string[]): number {
  const set = new Set(days)
  let n = 0
  const d = new Date()
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1)
  while (set.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

export function Home() {
  const { vault, update } = useVault()
  const toast = useToast()
  const s = vault.settings
  const today = todayKey()
  const checkedIn = vault.checkins.includes(today)
  const todayMood = vault.journal.find(j => j.date.slice(0, 10) === today && j.mood !== undefined)?.mood
  const fact = facts[Math.floor(Date.now() / 86_400_000) % facts.length]
  const heardDays = vault.checkins.filter(d => d.startsWith(today.slice(0, 7))).length
  const milestones = useMilestones()
  const next = milestones.find(m => !m.done)
  const doneCount = milestones.filter(m => m.done).length
  const soon = Date.now() + 36 * 3_600_000
  const todays = [...vault.reminders].filter(r => new Date(r.next).getTime() < soon).sort((a, b) => a.next.localeCompare(b.next)).slice(0, 3)
  const event = annualEvents.map(e => ({ e, d: nextOccurrence(e) })).sort((a, b) => a.d.getTime() - b.d.getTime())[0]

  const checkIn = (mood: number) => {
    update(v => {
      const existing = v.journal.find(j => j.date.slice(0, 10) === today && j.mood !== undefined)
      const journal = existing
        ? v.journal.map(j => (j.id === existing.id ? { ...j, mood } : j))
        : [{ id: uid(), date: new Date().toISOString(), text: '', mood, photoIds: [] }, ...v.journal]
      return { ...v, journal, checkins: v.checkins.includes(today) ? v.checkins : [...v.checkins, today] }
    })
    if (!checkedIn) toast(mood <= 1 ? tr('Obrigado por partilhares. O botão Ajuda está sempre aqui em cima.') : tr('Registado. Bom trabalho!'))
  }

  return (
    <>
      <TopBar title={tr('Hoje')} />
      <div className="page">
        <section className="hero">
          <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="small muted">{greeting()}</span>
              <h1>{s.displayName || tr('Olá')} 👋</h1>
              {heardDays > 0 && <span className="badge" style={{ background: 'var(--hero-glass)', color: 'var(--hero-ink)', width: 'fit-content' }}>✨ {tr('{0} dias em que te ouviste este mês', heardDays)}</span>}
            </div>
            <Ring value={doneCount / milestones.length} color="var(--accent)" track="var(--hero-glass)" />
          </div>
          <div className="stack" style={{ position: 'relative', zIndex: 1 }}>
            <span className="small" style={{ fontWeight: 650 }}>{checkedIn ? tr('Hoje sentes-te…') : tr('Como te sentes hoje?')}</span>
            <div className="mood" role="group" aria-label={tr('Como te sentes hoje')}>
              {moods.map((m, i) => (
                <button key={i} className={todayMood === i ? 'on' : ''} onClick={() => checkIn(i)} aria-label={tr('Humor {0} de 5', i + 1)}>{m}</button>
              ))}
            </div>
          </div>
        </section>

        {next && (
          <Link to="/percurso" className="card neon-pink" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row">
              <span className="badge accent">{tr('Próximo passo')}</span>
              <span className="xs muted grow" style={{ textAlign: 'right' }}>{tr('{0} de {1} etapas', doneCount, milestones.length)}</span>
            </div>
            <div className="row">
              <h3 className="grow">{next.title}</h3>
              <Icon name="chevron" />
            </div>
            <Progress value={doneCount / milestones.length} />
          </Link>
        )}

        <section className="stack">
          <h2>{tr('Para hoje')}</h2>
          <div className="list">
            {todays.map(r => (
              <Link key={r.id} to="/saude?tab=tratamento" className="item">
                <div className="lead" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><Icon name="bell" /></div>
                <div className="grow"><h3>{r.label}</h3><p className="small muted">{fmtDate(r.next, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                <Icon name="chevron" />
              </Link>
            ))}
            {todays.length === 0 && (
              <Link to="/saude?tab=tratamento" className="item">
                <div className="lead" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}><Icon name="bell" /></div>
                <div className="grow"><h3>{tr('Criar um lembrete')}</h3><p className="small muted">{tr('Hormonas, análises ou consultas')}</p></div>
                <Icon name="plus" />
              </Link>
            )}
            <Link to="/nome" className="item">
              <div className="lead" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="sparkle" /></div>
              <div className="grow"><h3>{tr('Treino do nome · 2 min')}</h3><p className="small muted">{tr('Ouve-o e vê-o no dia a dia')}</p></div>
              <Icon name="chevron" />
            </Link>
            <Link to="/diario" className="item">
              <div className="lead" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="camera" /></div>
              <div className="grow"><h3>{tr('✨ Momento de euforia')}</h3><p className="small muted">{tr('Um elogio, uma roupa, ouvir o teu nome… Guarda-o para os dias difíceis.')}</p></div>
              <Icon name="plus" />
            </Link>
          </div>
        </section>

        <section className="stack">
          <h2>{tr('Da comunidade')}</h2>
          {event && (
            <Link to="/comunidade?tab=agenda" className="card flat row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="lead-ico" style={{ background: 'var(--rose-soft)', color: 'var(--rose)', padding: 0 }}><Icon name="calendar" /></div>
              <div className="grow"><h3>{event.e.title}</h3><p className="small muted">{fmtDate(event.d.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
              <Icon name="chevron" />
            </Link>
          )}
          <Link to="/comunidade?tab=testemunhos" className="card flat row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="lead-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: 0 }}><Icon name="people" /></div>
            <div className="grow"><h3>{tr('Como é depois?')}</h3><p className="small muted">{tr('Testemunhos de quem já passou pelas hormonas e pelas cirurgias, fase a fase.')}</p></div>
            <Icon name="chevron" />
          </Link>
        </section>

        <section className="card tint-amber">
          <div className="row"><Icon name="sparkle" /><h3>{tr('Sabias que…')}</h3></div>
          <p className="small">{fact}</p>
        </section>
      </div>
    </>
  )
}
