import { Link } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Progress, Ring, fmtDate, useToast } from '../components/ui'
import { checklistPT, guides } from '../data/guides'
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
  const guide = guides.find(g => g.country === s.country) ?? guides[0]
  const stepsDone = guide.steps.filter(st => vault.guideSteps[st.id]).length
  const checksDone = checklistPT.filter(c => vault.checklist[c.id]).length
  const total = guide.steps.length + checklistPT.length
  const progress = (stepsDone + checksDone) / total
  const nextStep = guide.steps.find(st => !vault.guideSteps[st.id])
  const today = todayKey()
  const checkedIn = vault.checkins.includes(today)
  const todayMood = vault.journal.find(j => j.date.slice(0, 10) === today && j.mood !== undefined)?.mood
  const upcoming = [...vault.reminders].sort((a, b) => a.next.localeCompare(b.next)).slice(0, 2)
  const fact = facts[Math.floor(Date.now() / 86_400_000) % facts.length]
  const days = streak(vault.checkins)

  const checkIn = (mood: number) => {
    update(v => {
      const existing = v.journal.find(j => j.date.slice(0, 10) === today && j.mood !== undefined)
      const journal = existing
        ? v.journal.map(j => (j.id === existing.id ? { ...j, mood } : j))
        : [{ id: uid(), date: new Date().toISOString(), text: '', mood, photoIds: [] }, ...v.journal]
      return { ...v, journal, checkins: v.checkins.includes(today) ? v.checkins : [...v.checkins, today] }
    })
    if (!checkedIn) toast(mood <= 1 ? tr('Obrigado por partilhares. Vê o separador Apoio se precisares.') : tr('Registado. Bom trabalho!'))
  }

  const tiles = [
    { to: '/nome', icon: 'sparkle', title: tr('Ensaiar nome'), sub: tr('Ouve-o e vê-o no dia a dia'), tint: 'tint-accent' },
    { to: '/documentos', icon: 'doc', title: tr('Documentos'), sub: tr('{0}/{1} passos', stepsDone, guide.steps.length), tint: 'tint-sky' },
    { to: '/saude', icon: 'heart', title: tr('Saúde'), sub: tr('Profissionais e SNS'), tint: 'tint-rose' },
    { to: '/diario', icon: 'camera', title: tr('Diário'), sub: tr('{0} registos', vault.journal.filter(j => j.text || j.photoIds.length).length), tint: 'tint-mint' },
    { to: '/seguranca', icon: 'shield', title: tr('Segurança'), sub: tr('Alerta e locais seguros'), tint: 'tint-amber' },
    { to: '/comunidade?tab=agenda', icon: 'calendar', title: tr('Agenda'), sub: tr('Marchas e eventos'), tint: 'tint-rose' },
    { to: '/emprego', icon: 'briefcase', title: tr('Trabalho'), sub: tr('Empresas inclusivas'), tint: 'tint-sky' },
    { to: '/documentos?tab=pedidos', icon: 'copy', title: tr('Cartas prontas'), sub: tr('Banco, escola, trabalho…'), tint: 'tint-mint' },
    { to: '/direitos', icon: 'book', title: tr('Direitos e lei'), sub: tr('O que fazer e a quem recorrer'), tint: 'tint-amber' },
    { to: '/saude?tab=mente', icon: 'chat', title: tr('Saúde mental'), sub: tr('Apoio informado'), tint: 'tint-rose' },
  ]

  return (
    <>
      <TopBar title="" right={<Link to="/definicoes" className="icon-btn" aria-label={tr('Definições')}><Icon name="gear" /></Link>} />
      <div className="page">
        <section className="hero">
          <div className="row between" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="small muted">{greeting()}</span>
              <h1>{s.displayName || tr('Olá')} 👋</h1>
              {days > 1 && <span className="badge" style={{ background: 'var(--hero-glass)', color: 'var(--hero-ink)', width: 'fit-content' }}>🔥 {days} {tr('dias seguidos')}</span>}
            </div>
            <Ring value={progress} color="var(--accent)" track="var(--hero-glass)" />
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

        {nextStep && (
          <Link to="/documentos" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row">
              <span className="badge accent">{tr('Próximo passo')}</span>
              <span className="xs muted grow" style={{ textAlign: 'right' }}>{Math.round(progress * 100)}{tr('% do percurso')}</span>
            </div>
            <div className="row">
              <div className="grow stack" style={{ gap: 4 }}>
                <h3>{nextStep.title}</h3>
                <p className="small muted">{nextStep.body.slice(0, 110)}…</p>
              </div>
              <Icon name="chevron" />
            </div>
            <Progress value={progress} />
          </Link>
        )}

        <section className="stack">
          <h2>{tr('Explorar')}</h2>
          <div className="grid2">
            {tiles.map(t => (
              <Link key={t.to} to={t.to} className={`tile card ${t.tint}`}>
                <div className="ico"><Icon name={t.icon} /></div>
                <div>
                  <h3>{t.title}</h3>
                  <p className="xs muted">{t.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="stack">
          <div className="row between">
            <h2>{tr('A seguir')}</h2>
            <Link to="/diario" className="btn ghost sm">{tr('Ver tudo')}</Link>
          </div>
          {upcoming.length === 0 ? (
            <Link to="/diario" className="card flat row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="lead-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: 0 }}><Icon name="bell" /></div>
              <div className="grow">
                <h3>{tr('Criar um lembrete')}</h3>
                <p className="small muted">{tr('Hormonas, análises ou consultas')}</p>
              </div>
              <Icon name="plus" />
            </Link>
          ) : (
            <div className="list">
              {upcoming.map(r => (
                <Link key={r.id} to="/diario" className="item">
                  <div className="lead" style={{ background: 'var(--sky-soft)' }}><Icon name="bell" /></div>
                  <div className="grow"><h3>{r.label}</h3><p className="small muted">{fmtDate(r.next, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link to="/partilhar" className="card tint-sky" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="row"><Icon name="heart" /><h3 className="grow">{tr('Pessoas que me apoiam')}</h3><Icon name="chevron" /></div>
          <p className="small">{vault.supportCard ? tr('Atualiza e volta a enviar o teu cartão ou o plano para o trabalho ou a escola.') : tr('Cria um cartão para família, amigues, colegas ou professores: o que te ajuda, o que te magoa e quem já sabe.')}</p>
        </Link>

        <Link to="/comunidade?tab=testemunhos" className="card tint-rose" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="row"><Icon name="people" /><h3 className="grow">{tr('Como é depois?')}</h3><Icon name="chevron" /></div>
          <p className="small">{tr('Testemunhos de quem já passou pelas hormonas e pelas cirurgias, fase a fase.')}</p>
        </Link>

        <section className="card tint-amber">
          <div className="row"><Icon name="sparkle" /><h3>{tr('Sabias que…')}</h3></div>
          <p className="small">{fact}</p>
        </section>

        <Link to="/comunidade" className="card flat row" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="lead-ico" style={{ background: 'var(--rose-soft)', color: 'var(--rose)', padding: 0 }}><Icon name="chat" /></div>
          <div className="grow">
            <h3>{tr('Precisas de falar com alguém?')}</h3>
            <p className="small muted">{tr('Linhas de apoio e associações, a qualquer hora')}</p>
          </div>
          <Icon name="chevron" />
        </Link>
      </div>
    </>
  )
}
