import { useMemo, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from '../components/Icon'
import { Sheet, copyText, fmtDate, useToast } from '../components/ui'
import { supportOrgs } from '../data/support'
import { uid, type SharedSummary } from '../lib/types'
import { moods } from './Home'

const askFirst = [
  'Que experiência tem a acompanhar pessoas trans e não binárias?',
  'Segue uma abordagem afirmativa (não questiona a minha identidade)?',
  'Posso usar o meu nome e pronomes nos registos, mesmo antes da mudança legal?',
  'Como funciona a confidencialidade? Quem tem acesso às notas?',
  'Quanto custa, e há comparticipação, seguro ou valor social?',
]

const redFlags = [
  'Tenta mudar, “curar” ou adiar indefinidamente a tua identidade. Isso é uma prática de conversão e é crime em Portugal desde 2024.',
  'Usa o teu nome antigo depois de lhe dizeres o teu.',
  'Faz da tua identidade o problema, quando vieste por outra razão.',
  'Exige que “proves” que és trans para te dar apoio ou um relatório.',
]

const sectionLabels = { humor: 'Como me tenho sentido', euforia: 'Momentos de euforia', notas: 'Entradas do diário que escolhi', temas: 'O que quero falar' } as const
type Section = keyof typeof sectionLabels

export function MentalHealth({ onDirectory }: { onDirectory: () => void }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const services = supportOrgs.filter(o => ['ilga', 'opus', 'casaqui', 'planoi', 'rea'].includes(o.id))
  const crisis = supportOrgs.filter(o => ['sns24', 'vozamiga', '112'].includes(o.id))

  const forget = async (s: SharedSummary) => {
    const msg = `Olá${s.to ? ` ${s.to}` : ''},\n\nNo dia ${fmtDate(s.at, { day: 'numeric', month: 'long', year: 'numeric' })} partilhei consigo um resumo do meu diário. Retiro o consentimento para a utilização desse resumo e peço que o apague, ao abrigo do artigo 17.º do RGPD. Agradeço que me confirme quando estiver apagado.\n\nObrigade.`
    if (await copyText(msg)) toast('Mensagem copiada: envia-a à pessoa')
  }

  return (
    <>
      <section className="card tint-danger">
        <h3>Se precisas de falar agora</h3>
        <div className="row wrap">
          {crisis.map(o => <a key={o.id} className="btn sm secondary" href={`tel:${o.phone}`}><Icon name="phone" size={16} />{o.name}</a>)}
        </div>
        <p className="xs">No SNS 24, escolhe a opção de aconselhamento psicológico.</p>
      </section>

      <section className="stack">
        <h2>Onde encontrar apoio informado</h2>
        <div className="list">
          <div className="item" style={{ alignItems: 'flex-start' }}>
            <div className="lead" style={{ background: 'var(--sky-soft)', color: 'var(--accent)' }}><Icon name="heart" /></div>
            <div className="grow"><h3>SNS</h3><p className="small muted">Pede ao/à médico/a de família uma consulta de psicologia no centro de saúde. Os três centros especializados (Coimbra, Lisboa e Porto) têm equipas de psicologia e psiquiatria.</p></div>
          </div>
          {services.map(o => (
            <a key={o.id} className="item" href={o.url} target="_blank" rel="noreferrer noopener">
              <div className="lead" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}><Icon name="people" /></div>
              <div className="grow"><h3>{o.name}</h3><p className="small muted">{o.description}</p></div>
            </a>
          ))}
        </div>
        <button className="btn secondary block" onClick={onDirectory}><Icon name="star" size={18} />Psicólogos/as avaliados pela comunidade</button>
      </section>

      <section className="card">
        <h3>Perguntas para a primeira consulta</h3>
        <ul className="stack small" style={{ margin: 0, paddingLeft: 18 }}>{askFirst.map(q => <li key={q}>{q}</li>)}</ul>
      </section>

      <section className="card tint-amber">
        <h3>Sinais de alerta</h3>
        <ul className="stack small" style={{ margin: 0, paddingLeft: 18 }}>{redFlags.map(q => <li key={q}>{q}</li>)}</ul>
        <p className="xs">Podes denunciar práticas de conversão ao Ministério Público e à Ordem dos Psicólogos ou dos Médicos.</p>
      </section>

      <section className="card tint-sky">
        <div className="row"><Icon name="book" /><h3 className="grow">Resumo para a consulta</h3></div>
        <p className="small">Escolhe o que queres mostrar do teu diário (humor, momentos de euforia, entradas) e leva um resumo para a consulta. Só sai do telemóvel o que escolheres, quando escolheres.</p>
        <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => setOpen(true)}>Preparar resumo</button>
      </section>

      {vault.summaries.length > 0 && (
        <section className="stack">
          <h2>O que já partilhaste</h2>
          <div className="list">
            {vault.summaries.map(s => (
              <div key={s.id} className="item" style={{ alignItems: 'flex-start' }}>
                <div className="grow stack" style={{ gap: 2 }}>
                  <h3>{s.to || 'Terapeuta'}</h3>
                  <p className="xs muted">{fmtDate(s.at, { day: 'numeric', month: 'short', year: 'numeric' })} · de {fmtDate(s.from)} a {fmtDate(s.until)}</p>
                  <p className="xs muted">{s.sections.map(x => sectionLabels[x as Section] ?? x).join(', ')}</p>
                  <div className="row wrap">
                    <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => forget(s)}>Retirar consentimento</button>
                    <button className="btn ghost sm" onClick={() => update(v => ({ ...v, summaries: v.summaries.filter(x => x.id !== s.id) }))}>Tirar do histórico</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="xs muted">“Retirar consentimento” copia um pedido para a pessoa apagar o resumo (art. 17.º do RGPD). Como o resumo é uma cópia que deste, a app não o consegue apagar por ti.</p>
        </section>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Resumo para a consulta">
        {open && <SummaryBuilder onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  )
}

function SummaryBuilder({ onDone }: { onDone: () => void }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [weeks, setWeeks] = useState(4)
  const [to, setTo] = useState('')
  const [sections, setSections] = useState<Section[]>(['humor', 'euforia', 'temas'])
  const [picked, setPicked] = useState<string[]>([])
  const [topics, setTopics] = useState('')
  const [consent, setConsent] = useState(false)

  const from = new Date(Date.now() - weeks * 7 * 86_400_000)
  const entries = useMemo(() => vault.journal.filter(j => new Date(j.date) >= from).sort((a, b) => a.date.localeCompare(b.date)), [vault.journal, weeks]) // eslint-disable-line react-hooks/exhaustive-deps
  const withText = entries.filter(j => j.text.trim())
  const has = (s: Section) => sections.includes(s)
  const toggle = (s: Section) => setSections(has(s) ? sections.filter(x => x !== s) : [...sections, s])

  const text = useMemo(() => {
    const out: string[] = [`Resumo do meu diário · ${fmtDate(from.toISOString(), { day: 'numeric', month: 'short' })} a ${fmtDate(new Date().toISOString(), { day: 'numeric', month: 'short', year: 'numeric' })}`]
    if (has('humor')) {
      const m = entries.filter(j => j.mood !== undefined)
      if (m.length) {
        const avg = m.reduce((a, j) => a + (j.mood ?? 0), 0) / m.length
        const counts = moods.map((e, i) => `${e} ${m.filter(j => j.mood === i).length}`).join('  ')
        const half = Math.floor(m.length / 2)
        const trend = m.length >= 4 ? (() => {
          const a = m.slice(0, half).reduce((x, j) => x + (j.mood ?? 0), 0) / half
          const b = m.slice(half).reduce((x, j) => x + (j.mood ?? 0), 0) / (m.length - half)
          return b - a > 0.4 ? 'a melhorar' : a - b > 0.4 ? 'a piorar' : 'estável'
        })() : ''
        out.push(`\n${sectionLabels.humor}\n${m.length} registos, média ${(avg + 1).toFixed(1)} em 5${trend ? `, tendência ${trend}` : ''}.\n${counts}`)
      } else out.push(`\n${sectionLabels.humor}\nSem registos neste período.`)
    }
    if (has('euforia')) {
      const e = entries.filter(j => j.euphoria)
      out.push(`\n${sectionLabels.euforia}\n${e.length ? e.map(j => `• ${fmtDate(j.date)}: ${j.text.trim() || '(sem texto)'}`).join('\n') : 'Nenhum registado neste período.'}`)
    }
    if (has('notas') && picked.length) {
      out.push(`\n${sectionLabels.notas}\n${withText.filter(j => picked.includes(j.id)).map(j => `• ${fmtDate(j.date)}: ${j.text.trim()}`).join('\n')}`)
    }
    if (has('temas') && topics.trim()) out.push(`\n${sectionLabels.temas}\n${topics.trim()}`)
    return out.join('\n')
  }, [entries, sections, picked, topics]) // eslint-disable-line react-hooks/exhaustive-deps

  const log = () => update(v => ({ ...v, summaries: [{ id: uid(), at: new Date().toISOString(), to: to.trim(), from: from.toISOString(), until: new Date().toISOString(), sections: sections.filter(s => s !== 'notas' || picked.length) }, ...v.summaries] }))
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Resumo para a consulta', text }); log(); onDone(); return } catch { return }
    }
    if (await copyText(text)) { log(); toast('Resumo copiado'); onDone() }
  }
  const print = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<title>Resumo</title><pre style="font:15px/1.6 Georgia,serif;white-space:pre-wrap;max-width:640px;margin:40px auto">${text.replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;'))}</pre>`)
    w.document.close(); w.print(); log(); onDone()
  }

  return (
    <div className="stack">
      <label className="field">Para quem <span className="xs muted">(só para o teu histórico)</span><input className="input" value={to} placeholder="Dra. Ana" onChange={e => setTo(e.target.value)} /></label>
      <div className="chips">{[2, 4, 12].map(w => <button key={w} className={'chip' + (weeks === w ? ' on' : '')} onClick={() => setWeeks(w)}>Últimas {w} semanas</button>)}</div>
      <div className="stack" style={{ gap: 8 }}>
        {(Object.keys(sectionLabels) as Section[]).map(s => (
          <label key={s} className="row small" style={{ gap: 8 }}><input type="checkbox" checked={has(s)} onChange={() => toggle(s)} />{sectionLabels[s]}</label>
        ))}
      </div>
      {has('notas') && (
        <div className="stack" style={{ gap: 6 }}>
          <b className="small">Escolhe as entradas</b>
          {withText.length === 0 ? <p className="xs muted">Não há entradas com texto neste período.</p> : withText.map(j => (
            <label key={j.id} className="row xs" style={{ gap: 8, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={picked.includes(j.id)} onChange={() => setPicked(picked.includes(j.id) ? picked.filter(x => x !== j.id) : [...picked, j.id])} />
              <span><b>{fmtDate(j.date)}</b> {j.text.slice(0, 90)}{j.text.length > 90 ? '…' : ''}</span>
            </label>
          ))}
        </div>
      )}
      {has('temas') && <textarea className="input" rows={2} value={topics} placeholder="O que quero mesmo falar desta vez…" onChange={e => setTopics(e.target.value)} />}
      <pre className="letter">{text}</pre>
      <label className="row small card flat" style={{ gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Revi o resumo e quero partilhá-lo. Percebo que quem o receber fica com uma cópia, e que posso pedir que a apague.</span>
      </label>
      <div className="grid2">
        <button className="btn" disabled={!consent} onClick={share}><Icon name="share" size={18} />Partilhar</button>
        <button className="btn secondary" disabled={!consent} onClick={print}>Imprimir</button>
      </div>
    </div>
  )
}
