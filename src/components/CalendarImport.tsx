import { useMemo, useRef, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { Icon } from './Icon'
import { Sheet, fmtDate, useToast } from './ui'
import { parseMessage, readCalendarFile, upcoming, type ImportedEvent, type MessageGuess } from '../lib/calendarImport'
import { downloadIcs, icsCalendar, type IcsEventInput } from '../lib/ics'
import { uid, type Appointment, type Reminder, type Vault } from '../lib/types'
import { tr } from '../i18n'

type Target = 'lembretes' | 'consultas'

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

/** Adivinha o tipo de lembrete pelo título do evento. */
function kindOf(title: string): Reminder['kind'] {
  const t = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/hormon|testosteron|estradiol|estrogen|gel\b|injec|adesivo|comprimido|progesteron|ciproterona|bicalutamida/.test(t)) return 'hormona'
  if (/analise|exame|colheita|ecografia|rastreio|raio|tac\b|ressonancia/.test(t)) return 'analises'
  if (/consulta|medic|endocrin|psicolog|psiquiatr|cirurg|usf|hospital|clinica/.test(t)) return 'consulta'
  return 'outro'
}

/** Junta lembretes e consultas futuras num só ficheiro .ics. */
export function exportAll(v: Vault): string {
  const neutral = !!v.settings.discreetNotifications
  const events: IcsEventInput[] = [
    ...v.reminders.map(r => ({ uid: `casulo-r-${r.id}`, title: neutral ? tr('Lembrete') : r.label, start: new Date(r.next), everyDays: r.everyDays || undefined, description: neutral ? undefined : r.notes })),
    ...v.appointments.filter(a => new Date(a.date).getTime() >= Date.now() - 86_400_000).map(a => ({
      uid: `casulo-a-${a.id}`, title: neutral ? tr('Lembrete') : a.with || tr('Consulta'), start: new Date(a.date), durationMin: 60, alarmMin: 60,
      description: neutral ? undefined : [a.notes, ...a.questions.filter(q => !q.done).map(q => `• ${q.text}`)].filter(Boolean).join('\n') || undefined,
    })),
  ]
  return icsCalendar(events)
}

/**
 * Ligação ao calendário e às mensagens do SNS 24, tudo no aparelho:
 * importar um ficheiro .ics/.zip, colar uma mensagem e exportar tudo para o calendário.
 */
export function CalendarTools({ target }: { target: Target }) {
  const { vault } = useVault()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [events, setEvents] = useState<ImportedEvent[] | null>(null)
  const [paste, setPaste] = useState(false)
  const [help, setHelp] = useState(false)
  const count = vault.reminders.length + vault.appointments.length

  const pick = async (f: File | undefined) => {
    if (!f) return
    try {
      const all = await readCalendarFile(f)
      const next = upcoming(all)
      if (!all.length) { toast(tr('Não encontrei eventos neste ficheiro')); return }
      if (!next.length) { toast(tr('Este calendário não tem eventos futuros')); return }
      setEvents(next)
    } catch { toast(tr('Não foi possível ler o ficheiro. Usa um .ics ou o .zip exportado do Google Calendar.')) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <>
      <details className="card flat">
        <summary className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <Icon name="calendar" size={18} />
          <span className="small grow"><b>{tr('Calendário e SNS 24')}</b></span>
        </summary>
        <div className="stack" style={{ marginTop: 8 }}>
          <p className="xs muted">{tr('Traz consultas e exames do teu calendário (Google, Apple, Outlook) ou de uma mensagem do SNS 24. Tudo é lido neste aparelho: o Casulo não acede à tua conta nem envia nada para nenhum servidor.')}</p>
          <div className="grid2">
            <button className="btn sm secondary" onClick={() => fileRef.current?.click()}><Icon name="calendar" size={16} />{tr('Importar calendário')}</button>
            <button className="btn sm secondary" onClick={() => setPaste(true)}><Icon name="copy" size={16} />{tr('Colar mensagem')}</button>
          </div>
          <button className="btn sm ghost" disabled={!count} onClick={() => downloadIcs('casulo', exportAll(vault))}><Icon name="share" size={16} />{tr('Enviar tudo para o meu calendário')}</button>
          <button className="btn sm ghost" onClick={() => setHelp(true)}>{tr('Como tiro o ficheiro do Google Calendar?')}</button>
          <input ref={fileRef} type="file" hidden accept=".ics,.ical,.ifb,.zip,text/calendar,application/zip" onChange={e => void pick(e.target.files?.[0])} />
        </div>
      </details>
      {events && <ImportSheet events={events} target={target} onClose={() => setEvents(null)} />}
      {paste && <PasteSheet onClose={() => setPaste(false)} />}
      <Sheet open={help} onClose={() => setHelp(false)} title={tr('Do Google Calendar para o Casulo')}>
        <ol className="small stack" style={{ paddingLeft: 18 }}>
          <li>{tr('Num computador (ou no navegador do telemóvel, em "versão para computador"), abre calendar.google.com.')}</li>
          <li>{tr('Vai a Definições › Importar e exportar › Exportar. O Google descarrega um ficheiro .zip.')}</li>
          <li>{tr('Aqui, toca em "Importar calendário" e escolhe esse .zip (ou um .ics). Só os eventos futuros aparecem, e és tu que escolhes quais entram.')}</li>
          <li>{tr('Mudou alguma coisa? Importa outra vez: os eventos que já tinhas trazido são atualizados, não duplicados.')}</li>
        </ol>
        <p className="xs muted">{tr('Para uma só consulta, também podes abrir o evento no Google Calendar, copiar o texto e usar "Colar mensagem".')}</p>
        <p className="xs muted">{tr('No sentido contrário, "Enviar tudo para o meu calendário" cria um ficheiro .ics com os teus lembretes e consultas. Com o texto neutro ligado nas Definições, os títulos aparecem só como "Lembrete".')}</p>
      </Sheet>
    </>
  )
}

function ImportSheet({ events, target, onClose }: { events: ImportedEvent[]; target: Target; onClose: () => void }) {
  const { vault, update } = useVault()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [as, setAs] = useState<Target>(target)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const known = useMemo(() => new Set([...vault.reminders, ...vault.appointments].map(x => x.sourceUid).filter(Boolean)), [vault.reminders, vault.appointments])
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const shown = events.filter(e => !q.trim() || norm(`${e.title} ${e.location ?? ''}`).includes(norm(q.trim()))).slice(0, 150)
  const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const save = () => {
    const picked = events.filter(e => chosen.has(e.uid))
    update(v => {
      if (as === 'consultas') {
        const appointments = [...v.appointments]
        for (const e of picked) {
          const data = { date: e.start.toISOString(), with: e.title, notes: e.location, sourceUid: e.uid }
          const i = appointments.findIndex(a => a.sourceUid === e.uid)
          if (i >= 0) appointments[i] = { ...appointments[i], ...data }
          else appointments.push({ id: uid(), questions: [], ...data } satisfies Appointment)
        }
        return { ...v, appointments }
      }
      const reminders = [...v.reminders]
      for (const e of picked) {
        const notes = [e.location, e.description].filter(Boolean).join(' · ').slice(0, 300) || undefined
        const data = { label: e.title, next: e.start.toISOString(), everyDays: e.everyDays, notes, sourceUid: e.uid }
        const i = reminders.findIndex(r => r.sourceUid === e.uid)
        if (i >= 0) reminders[i] = { ...reminders[i], ...data }
        else reminders.push({ id: uid(), kind: kindOf(e.title), ...data } satisfies Reminder)
      }
      return { ...v, reminders }
    })
    toast(tr('{0} evento(s) guardados em {1}', picked.length, as === 'consultas' ? tr('Consultas') : tr('Lembretes')))
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={tr('Escolhe o que trazer')}>
      <p className="xs muted">{tr('{0} eventos futuros. Escolhe só os que têm a ver com a tua saúde: o resto do teu calendário não entra no Casulo.', events.length)}</p>
      <input className="input" placeholder={tr('Procurar (ex.: consulta, análises, hospital)')} value={q} onChange={e => setQ(e.target.value)} />
      <div className="row between">
        <div className="chips">
          <button className={'chip' + (as === 'consultas' ? ' on' : '')} onClick={() => setAs('consultas')}>{tr('Como consultas')}</button>
          <button className={'chip' + (as === 'lembretes' ? ' on' : '')} onClick={() => setAs('lembretes')}>{tr('Como lembretes')}</button>
        </div>
        <button className="btn sm ghost" onClick={() => setChosen(new Set(shown.map(e => e.uid)))}>{tr('Todos')}</button>
      </div>
      <div className="list" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {shown.map(e => (
          <label key={e.uid} className="item" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={chosen.has(e.uid)} onChange={() => toggle(e.uid)} />
            <div className="grow stack" style={{ gap: 2 }}>
              <b className="small">{e.title}</b>
              <span className="xs muted">
                {fmtDate(e.start.toISOString(), e.allDay ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {e.everyDays ? tr(' · a cada {0} dia{1}', e.everyDays, e.everyDays > 1 ? 's' : '') : ''}
                {e.location ? ` · ${e.location}` : ''}
              </span>
            </div>
            {known.has(e.uid) && <span className="badge">{tr('já trazido')}</span>}
          </label>
        ))}
        {!shown.length && <p className="small muted">{tr('Nada encontrado.')}</p>}
      </div>
      <button className="btn block" disabled={!chosen.size} onClick={save}>{tr('Guardar {0}', chosen.size || '')}</button>
    </Sheet>
  )
}

const pasteKinds: { id: MessageGuess['kind']; label: string }[] = [
  { id: 'consulta', label: tr('Consulta') },
  { id: 'analises', label: tr('Exame / análises') },
  { id: 'receita', label: tr('Receita') },
  { id: 'outro', label: tr('Outro') },
]

function PasteSheet({ onClose }: { onClose: () => void }) {
  const { update } = useVault()
  const toast = useToast()
  const [text, setText] = useState('')
  const [form, setForm] = useState<{ kind: MessageGuess['kind']; title: string; when: string; keepText: boolean } | null>(null)

  const titleFor = (g: MessageGuess) => {
    const base = g.kind === 'receita' ? tr('Levantar receita') : pasteKinds.find(k => k.id === g.kind)!.label
    return g.place ? `${base} · ${g.place}` : base
  }
  const read = async () => {
    let t = text
    if (!t.trim()) { try { t = await navigator.clipboard.readText(); setText(t) } catch { /* sem acesso à área de transferência */ } }
    if (!t.trim()) return
    const g = parseMessage(t)
    const when = g.date ?? new Date(Date.now() + 86_400_000)
    if (!g.date) when.setHours(10, 0, 0, 0)
    setForm({ kind: g.kind, title: titleFor(g), when: toLocalInput(when), keepText: true })
  }
  const save = () => {
    if (!form) return
    const date = new Date(form.when).toISOString()
    const notes = form.keepText ? text.trim().slice(0, 600) : undefined
    if (form.kind === 'consulta') {
      update(v => ({ ...v, appointments: [...v.appointments, { id: uid(), date, with: form.title.trim(), questions: [], notes }] }))
      toast(tr('Guardado em Consultas'))
    } else {
      const kind: Reminder['kind'] = form.kind === 'analises' ? 'analises' : 'outro'
      update(v => ({ ...v, reminders: [...v.reminders, { id: uid(), kind, label: form.title.trim() || tr('Lembrete'), next: date, everyDays: 0, notes }] }))
      toast(tr('Guardado em Lembretes'))
    }
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={tr('Colar mensagem')}>
      {!form ? (
        <>
          <p className="xs muted">{tr('Cola aqui o SMS ou o email do SNS 24, do centro de saúde ou da clínica (consulta, exame ou receita). O texto é lido só neste aparelho.')}</p>
          <textarea className="input" rows={5} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={tr('Ex.: Tem consulta marcada para 15/12/2026 às 10:30 na USF…')} />
          <button className="btn block" onClick={() => void read()}>{text.trim() ? tr('Ler mensagem') : tr('Colar e ler')}</button>
        </>
      ) : (
        <>
          <div className="chips">{pasteKinds.map(k => <button key={k.id} className={'chip' + (form.kind === k.id ? ' on' : '')} onClick={() => setForm({ ...form, kind: k.id })}>{k.label}</button>)}</div>
          <label className="field">{tr('Nome')}<input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="field">{form.kind === 'receita' ? tr('Lembrar-me em') : tr('Quando')}<input className="input" type="datetime-local" value={form.when} onChange={e => setForm({ ...form, when: e.target.value })} /></label>
          <label className="row small" style={{ gap: 8 }}>
            <input type="checkbox" checked={form.keepText} onChange={e => setForm({ ...form, keepText: e.target.checked })} />
            {form.kind === 'receita' ? tr('Guardar a mensagem nas notas (com os códigos para a farmácia)') : tr('Guardar a mensagem nas notas')}
          </label>
          <p className="xs muted">{tr('Confirma a data e a hora antes de guardar: a leitura automática pode enganar-se.')}</p>
          <div className="grid2">
            <button className="btn secondary" onClick={() => setForm(null)}>{tr('Voltar')}</button>
            <button className="btn" onClick={save}>{tr('Guardar')}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}
