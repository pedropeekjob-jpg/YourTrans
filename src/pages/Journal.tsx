import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Photo } from '../components/Photo'
import { Empty, Sheet, copyText, fmtDate, useToast } from '../components/ui'
import { compressImage } from '../lib/photos'
import { deletePhoto, savePhoto } from '../lib/storage'
import { downloadIcs, icsEvent } from '../lib/ics'
import { uid, type Appointment, type JournalEntry, type Reminder, type Vault } from '../lib/types'
import { moods } from './Home'
import { locale, tr } from '../i18n'
import { disablePush, enablePush, notificationsSupported } from '../lib/notify'

/** Diário pessoal (texto, fotos e euforias). Lembretes, efeitos e consultas vivem em Saúde › Tratamento. */
export function Journal() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  if (tab === 'lembretes' || tab === 'efeitos' || tab === 'consultas') return <Navigate to={`/saude?tab=tratamento&sub=${tab}`} replace />
  return (
    <>
      <TopBar title={tr('Diário')} back />
      <div className="page">
        <Diary />
      </div>
    </>
  )
}

/* ---------- Diário ---------- */

/**
 * Convite para proteger com código, no momento em que faz sentido: depois do primeiro registo
 * no diário (texto ou fotos), e não logo no primeiro minuto da app. Aparece uma vez.
 */
function ProtectNudge({ show }: { show: boolean }) {
  const { vault, update, mode } = useVault()
  if (!show || mode === 'pin' || vault.settings.pinNudgeSeen) return null
  const seen = () => update(v => ({ ...v, settings: { ...v.settings, pinNudgeSeen: true } }))
  return (
    <section className="card tint-accent" role="note">
      <h3>{tr('Proteger o teu diário?')}</h3>
      <p className="small">{tr('Neste momento, quem pegar no telemóvel desbloqueado consegue abrir o diário e as fotos. Com um código, ficam cifrados com uma chave que só tu sabes.')}</p>
      <div className="row">
        <Link className="btn sm" to="/definicoes" onClick={seen}>{tr('Escolher um código')}</Link>
        <button className="btn sm ghost" onClick={seen}>{tr('Agora não')}</button>
      </div>
    </section>
  )
}

function Diary() {
  const { vault, update, key } = useVault()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [onlyEuphoria, setOnlyEuphoria] = useState(false)
  const [text, setText] = useState('')
  const [euphoria, setEuphoria] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const entries = vault.journal.filter(j => (j.text || j.photoIds.length) && (!onlyEuphoria || j.euphoria))
  const allPhotos = vault.journal.filter(j => j.photoIds.length).flatMap(j => j.photoIds.map(id => ({ id, date: j.date }))).reverse()
  const euphoriaCount = vault.journal.filter(j => j.euphoria).length

  const addPhotos = async (files: FileList | null) => {
    if (!files || !key) return
    setBusy(true)
    try {
      const ids: string[] = []
      for (const f of Array.from(files).slice(0, 6)) {
        const id = uid()
        await savePhoto(key, id, await compressImage(f))
        ids.push(id)
      }
      setPhotos(p => [...p, ...ids])
    } catch { toast(tr('Não foi possível guardar a fotografia')) } finally { setBusy(false) }
  }

  const save = () => {
    const entry: JournalEntry = { id: uid(), date: new Date().toISOString(), text: text.trim(), photoIds: photos, euphoria }
    update(v => ({ ...v, journal: [entry, ...v.journal] }))
    setText(''); setPhotos([]); setEuphoria(false); setOpen(false)
    toast(euphoria ? tr('✨ Momento de euforia guardado') : tr('Guardado'))
  }

  const remove = (e: JournalEntry) => {
    if (!confirm(tr('Apagar este registo?'))) return
    e.photoIds.forEach(id => void deletePhoto(id))
    update(v => ({ ...v, journal: v.journal.filter(j => j.id !== e.id) }))
  }

  return (
    <>
      <ProtectNudge show={vault.journal.length > 0} />
      <div className="grid2">
        <button className="tile card tint-accent" onClick={() => { setEuphoria(false); setOpen(true) }}>
          <div className="ico"><Icon name="book" /></div>
          <div><h3>{tr('Novo registo')}</h3><p className="xs muted">{tr('Texto e fotos privadas')}</p></div>
        </button>
        <button className="tile card tint-rose" onClick={() => { setEuphoria(true); setOpen(true) }}>
          <div className="ico"><Icon name="sparkle" /></div>
          <div><h3>{tr('Momento de euforia')}</h3><p className="xs muted">{euphoriaCount ? `${euphoriaCount} guardados` : tr('Guarda o que te fez sentir tu')}</p></div>
        </button>
      </div>

      {allPhotos.length > 1 && (
        <section className="stack">
          <div className="row between"><h3>{tr('A tua linha do tempo')}</h3><span className="xs muted">{allPhotos.length} fotos</span></div>
          <div className="chips" style={{ gap: 8 }}>
            {allPhotos.map(p => (
              <div key={p.id} style={{ width: 96, flexShrink: 0 }} className="stack">
                <Photo id={p.id} onClick={() => setViewing(p.id)} />
                <span className="xs muted" style={{ textAlign: 'center' }}>{fmtDate(p.date, { month: 'short', year: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {euphoriaCount > 0 && (
        <div className="chips">
          <button className={'chip' + (!onlyEuphoria ? ' on' : '')} onClick={() => setOnlyEuphoria(false)}>{tr('Tudo')}</button>
          <button className={'chip' + (onlyEuphoria ? ' on' : '')} onClick={() => setOnlyEuphoria(true)}>{tr('✨ Euforia')}</button>
        </div>
      )}

      {entries.length === 0 ? (
        <Empty icon="book" title={tr('O teu diário começa aqui')} text={tr('Regista mudanças, conquistas e fotos. Ficam cifradas e só tu as vês.')} />
      ) : (
        <div className="stack">
          {entries.map(e => (
            <article key={e.id} className={'card' + (e.euphoria ? ' tint-rose' : '')}>
              <div className="row between">
                <span className="xs muted">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <div className="row" style={{ gap: 4 }}>
                  {e.mood !== undefined && <span>{moods[e.mood]}</span>}
                  {e.euphoria && <span className="badge accent">{tr('✨ euforia')}</span>}
                  <button className="btn ghost sm" onClick={() => remove(e)} aria-label={tr('Apagar')}><Icon name="trash" size={16} /></button>
                </div>
              </div>
              {e.text && <p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>}
              {e.photoIds.length > 0 && <div className="photo-grid">{e.photoIds.map(id => <Photo key={id} id={id} onClick={() => setViewing(id)} />)}</div>}
            </article>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={euphoria ? tr('✨ Momento de euforia') : tr('Novo registo')}>
        {euphoria && <p className="small muted">{tr('Um elogio, uma roupa, ouvir o teu nome… Guarda-o para os dias difíceis.')}</p>}
        <textarea className="input" autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={euphoria ? tr('Hoje senti-me eu quando…') : tr('Como foi o teu dia?')} />
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={euphoria} onChange={e => setEuphoria(e.target.checked)} /> {tr('Marcar como momento de euforia')}</label>
        {photos.length > 0 && <div className="photo-grid">{photos.map(id => <Photo key={id} id={id} />)}</div>}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => addPhotos(e.target.files)} />
        <button className="btn secondary" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="camera" size={18} />{busy ? tr('A cifrar…') : tr('Adicionar foto')}</button>
        <p className="xs muted">{tr('As fotos são cifradas e a localização é removida. Não aparecem na galeria do telemóvel.')}</p>
        <button className="btn block" onClick={save} disabled={!text.trim() && !photos.length}>{tr('Guardar')}</button>
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={tr('Fotografia')}>
        {viewing && <Photo id={viewing} />}
      </Sheet>
    </>
  )
}

/* ---------- Lembretes ---------- */

const reminderKinds: { id: Reminder['kind']; label: string; icon: string }[] = [
  { id: 'hormona', label: tr('Hormona'), icon: 'bell' },
  { id: 'analises', label: tr('Análises'), icon: 'chart' },
  { id: 'consulta', label: tr('Consulta'), icon: 'calendar' },
  { id: 'outro', label: tr('Outro'), icon: 'star' },
]

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function useReminderNotifications(vault: Vault) {
  // Com a app aberta, avisa quando um lembrete chega à hora. Na app nativa
  // isto passa para notificações locais do sistema (Capacitor).
  const fired = useRef(new Set<string>())
  useEffect(() => {
    const tick = () => {
      // Com os avisos com a app fechada ligados, o service worker já trata disto.
      if (!('Notification' in window) || Notification.permission !== 'granted' || vault.settings.pushReminders) return
      const now = Date.now()
      for (const r of vault.reminders) {
        const t = new Date(r.next).getTime()
        const k = r.id + r.next
        if (t <= now && now - t < 60 * 60_000 && !fired.current.has(k)) {
          fired.current.add(k)
          new Notification(vault.settings.discreetNotifications ? tr('Notas') : r.label, { body: vault.settings.discreetNotifications ? tr('Tens um lembrete') : r.notes ?? '' })
        }
      }
    }
    tick()
    const t = window.setInterval(tick, 30_000)
    return () => window.clearInterval(t)
  }, [vault.reminders, vault.settings.discreetNotifications, vault.settings.pushReminders])
}

export function Reminders() {
  const { vault, update } = useVault()
  const toast = useToast()
  useReminderNotifications(vault)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ kind: 'hormona' as Reminder['kind'], label: '', when: toLocalInput(new Date(Date.now() + 3600_000)), everyDays: 7, notes: '' })
  const list = [...vault.reminders].sort((a, b) => a.next.localeCompare(b.next))
  const now = Date.now()

  const add = () => {
    const r: Reminder = { id: uid(), kind: form.kind, label: form.label.trim() || reminderKinds.find(k => k.id === form.kind)!.label, next: new Date(form.when).toISOString(), everyDays: form.everyDays, notes: form.notes.trim() || undefined }
    update(v => ({ ...v, reminders: [...v.reminders, r] }))
    setOpen(false); setForm({ ...form, label: '', notes: '' })
  }
  const done = (r: Reminder) => {
    update(v => ({
      ...v,
      doseLog: [{ id: uid(), reminderId: r.id, at: new Date().toISOString() }, ...v.doseLog].slice(0, 500),
      reminders: r.everyDays
        ? v.reminders.map(x => {
          if (x.id !== r.id) return x
          let next = new Date(x.next).getTime()
          do next += x.everyDays * 86_400_000; while (next < Date.now())
          return { ...x, next: new Date(next).toISOString() }
        })
        : v.reminders.filter(x => x.id !== r.id),
    }))
    toast(tr('Registado ✓'))
  }
  const askNotif = async () => {
    if (!('Notification' in window)) { toast(tr('Este navegador não suporta notificações')); return }
    const p = await Notification.requestPermission()
    toast(p === 'granted' ? tr('Notificações ativas enquanto a app estiver aberta') : tr('Notificações não autorizadas'))
  }
  const togglePush = async (on: boolean) => {
    if (!on) {
      update(v => ({ ...v, settings: { ...v.settings, pushReminders: false } }))
      await disablePush(); toast(tr('Avisos desligados. O servidor esqueceu este aparelho.')); return
    }
    try {
      const ok = await enablePush(vault.reminders, vault.settings.discreetNotifications)
      if (!ok) { toast(tr('Notificações não autorizadas')); return }
      update(v => ({ ...v, settings: { ...v.settings, pushReminders: true } }))
      toast(tr('Avisos ligados'))
    } catch (e) { toast((e as Error).message) }
  }
  const exportIcs = (r: Reminder) => {
    const neutral = vault.settings.discreetNotifications
    downloadIcs('lembrete', icsEvent({ title: neutral ? tr('Lembrete') : r.label, start: new Date(r.next), everyDays: r.everyDays || undefined, description: neutral ? undefined : r.notes }))
  }

  return (
    <>
      <div className="row">
        <button className="btn grow" onClick={() => setOpen(true)}><Icon name="plus" size={18} />{tr('Novo lembrete')}</button>
        {!notificationsSupported() && 'Notification' in window && Notification.permission !== 'granted' && <button className="btn secondary" onClick={askNotif} aria-label={tr('Ativar notificações')}><Icon name="bell" size={18} /></button>}
      </div>
      {notificationsSupported() && (
        <details className="card flat">
          <summary className="row" style={{ gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!vault.settings.pushReminders} onChange={e => void togglePush(e.target.checked)} onClick={e => e.stopPropagation()} aria-label={tr('Avisar-me mesmo com a app fechada')} />
            <span className="small"><b>{tr('Avisar-me mesmo com a app fechada')}</b></span>
          </summary>
          <p className="xs muted" style={{ marginTop: 6 }}>{tr('Para isto funcionar, o servidor do Casulo guarda o endereço de notificações deste aparelho e as horas dos avisos dos próximos 35 dias. Não guarda o texto, o tipo de lembrete nem quem és, e cada hora é apagada depois do aviso. A notificação diz só "Tens um lembrete" (ou "Tens uma nota" com o texto neutro). Ao desligar, o servidor esquece este aparelho.')}</p>
        </details>
      )}
      {list.length === 0 ? (
        <Empty icon="bell" title={tr('Sem lembretes')} text={tr('Cria lembretes para a toma de hormonas, análises ou consultas.')} />
      ) : (
        <div className="list">
          {list.map(r => {
            const due = new Date(r.next).getTime() <= now
            const k = reminderKinds.find(x => x.id === r.kind)!
            const last = vault.doseLog.find(d => d.reminderId === r.id)
            return (
              <div key={r.id} className="item" style={{ alignItems: 'flex-start' }}>
                <div className="lead" style={{ background: due ? 'var(--amber-soft)' : 'var(--sky-soft)' }}><Icon name={k.icon} /></div>
                <div className="grow stack" style={{ gap: 2 }}>
                  <h3>{r.label}</h3>
                  <p className="small muted">{due ? tr('Agora · ') : ''}{fmtDate(r.next, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{r.everyDays ? tr(' · a cada {0} dia{1}', r.everyDays, r.everyDays > 1 ? 's' : '') : ''}</p>
                  {last && <p className="xs muted">{tr('Último registo:')}{' '}{fmtDate(last.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                    <button className="btn sm" onClick={() => done(r)}>{r.kind === 'hormona' ? tr('Tomei') : tr('Feito')}</button>
                    <button className="btn sm secondary" onClick={() => exportIcs(r)}><Icon name="calendar" size={16} />{tr('Calendário')}</button>
                    <button className="btn sm ghost" onClick={() => update(v => ({ ...v, reminders: v.reminders.filter(x => x.id !== r.id) }))} aria-label={tr('Apagar')}><Icon name="trash" size={16} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Novo lembrete')}>
        <div className="chips">{reminderKinds.map(k => <button key={k.id} className={'chip' + (form.kind === k.id ? ' on' : '')} onClick={() => setForm({ ...form, kind: k.id, everyDays: k.id === 'hormona' ? 7 : 0 })}>{k.label}</button>)}</div>
        <label className="field">{tr('Nome')}<input className="input" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder={tr('Ex.: Gel, injeção, análises ao sangue')} /></label>
        <label className="field">{tr('Quando')}<input className="input" type="datetime-local" value={form.when} onChange={e => setForm({ ...form, when: e.target.value })} /></label>
        <label className="field">{tr('Repetir')}<select className="input" value={form.everyDays} onChange={e => setForm({ ...form, everyDays: Number(e.target.value) })}>
            <option value={0}>{tr('Não repetir')}</option><option value={1}>{tr('Todos os dias')}</option><option value={7}>{tr('Todas as semanas')}</option>
            <option value={14}>{tr('De 2 em 2 semanas')}</option><option value={21}>{tr('De 3 em 3 semanas')}</option><option value={28}>{tr('De 4 em 4 semanas')}</option>
            <option value={84}>{tr('De 12 em 12 semanas')}</option><option value={90}>{tr('De 3 em 3 meses')}</option><option value={180}>{tr('De 6 em 6 meses')}</option>
          </select>
        </label>
        <label className="field">{tr('Notas (opcional)')}<input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={tr('Dose, local, jejum…')} /></label>
        <button className="btn block" onClick={add}>{tr('Guardar')}</button>
      </Sheet>
    </>
  )
}

/* ---------- Efeitos ---------- */

// Nomes em PT: são as chaves guardadas em vault.effects; traduzem-se só ao mostrar.
export const effectNames = ['Humor', 'Energia', 'Ansiedade', 'Sono', 'Libido', 'Pele/acne', 'Sensibilidade mamária', 'Dores de cabeça', 'Disforia', 'Euforia']

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="xs muted">—</span>
  const w = 90, h = 28
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 5) * h}`).join(' ')
  return <svg width={w} height={h} aria-hidden="true"><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

export function Effects() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [values, setValues] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const history = useMemo(() => [...vault.effects].sort((a, b) => a.date.localeCompare(b.date)).slice(-20), [vault.effects])

  const save = () => {
    update(v => ({ ...v, effects: [...v.effects, { id: uid(), date: new Date().toISOString(), values, notes: notes.trim() || undefined }] }))
    setValues({}); setNotes(''); toast(tr('Registado. Vais poder mostrar a evolução na consulta.'))
  }

  return (
    <>
      <section className="card">
        <h3>{tr('Como estás hoje?')}{' '}<span className="muted small">{tr('0 = nada, 5 = muito')}</span></h3>
        {effectNames.map(n => (
          <div key={n} className="stack" style={{ gap: 4 }}>
            <div className="row between small"><span>{tr(n)}</span><b>{values[n] ?? '–'}</b></div>
            <div className="row" style={{ gap: 4 }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <button key={i} className={'chip' + (values[n] === i ? ' on' : '')} style={{ flex: 1, padding: '6px 0' }} onClick={() => setValues({ ...values, [n]: i })}>{i}</button>
              ))}
            </div>
          </div>
        ))}
        <textarea className="input" style={{ minHeight: 70 }} placeholder={tr('Notas (opcional)')} value={notes} onChange={e => setNotes(e.target.value)} />
        <button className="btn" disabled={!Object.keys(values).length} onClick={save}>{tr('Guardar registo')}</button>
      </section>
      {history.length > 0 && (
        <section className="stack">
          <h3>{tr('Evolução')}</h3>
          <div className="list">
            {effectNames.map(n => {
              const vals = history.map(h => h.values[n]).filter((x): x is number => x !== undefined)
              if (!vals.length) return null
              return (
                <div key={n} className="item">
                  <span className="grow">{tr(n)}</span>
                  <Spark values={vals} />
                  <b style={{ width: 24, textAlign: 'right' }}>{vals[vals.length - 1]}</b>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

/* ---------- Consultas ---------- */

const questionBank = [
  tr('Que análises preciso de fazer e com que frequência?'),
  tr('Que efeitos devo esperar nos primeiros 3, 6 e 12 meses?'),
  tr('Que efeitos secundários devem levar-me a contactar-vos?'),
  tr('Posso preservar a fertilidade antes de começar?'),
  tr('Há interações com outros medicamentos que tomo?'),
  tr('Quanto tempo demora a próxima etapa e o que preciso para avançar?'),
  tr('Podem registar o meu nome e pronomes no processo?'),
  tr('Que rastreios continuo a precisar de fazer?'),
]

export function buildSummary(v: Vault): string {
  const since = Date.now() - 90 * 86_400_000
  const recent = v.effects.filter(e => new Date(e.date).getTime() >= since)
  const avg = (n: string) => {
    const xs = recent.map(e => e.values[n]).filter((x): x is number => x !== undefined)
    return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null
  }
  const hormones = v.reminders.filter(r => r.kind === 'hormona')
  const doses = v.doseLog.filter(d => new Date(d.at).getTime() >= since && hormones.some(h => h.id === d.reminderId)).length
  const next = v.appointments.filter(a => new Date(a.date).getTime() >= Date.now() - 86_400_000).sort((a, b) => a.date.localeCompare(b.date))[0]
  const lines = [
    tr('Resumo para consulta — {0}', new Date().toLocaleDateString(locale)),
    v.settings.displayName ? tr('Nome: {0}{1}', v.settings.displayName, v.settings.pronouns ? ` (${v.settings.pronouns})` : '') : '',
    '',
    tr('Medicação/hormonas registadas:'),
    ...(hormones.length ? hormones.map(h => `• ${h.label}${h.everyDays ? tr(' — a cada {0} dia(s)', h.everyDays) : ''}${h.notes ? ` — ${h.notes}` : ''}`) : [tr('• Nenhuma registada')]),
    tr('Tomas registadas nos últimos 90 dias: {0}', doses),
    '',
    tr('Efeitos (média de 0 a 5, últimos 90 dias, {0} registos):', recent.length),
    ...effectNames.map(n => { const a = avg(n); return a ? `• ${tr(n)}: ${a}` : '' }).filter(Boolean),
    '',
    ...(next ? [tr('Perguntas para a consulta com {0}:', next.with || tr('o/a médico/a')), ...next.questions.filter(q => !q.done).map(q => `• ${q.text}`)] : []),
  ]
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function Appointments() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState(false)
  const [form, setForm] = useState({ with: '', date: toLocalInput(new Date(Date.now() + 7 * 86_400_000)) })
  const [newQ, setNewQ] = useState<Record<string, string>>({})
  const list = [...vault.appointments].sort((a, b) => b.date.localeCompare(a.date))

  const setAppt = (id: string, fn: (a: Appointment) => Appointment) => update(v => ({ ...v, appointments: v.appointments.map(a => (a.id === id ? fn(a) : a)) }))
  const add = () => {
    const a: Appointment = { id: uid(), date: new Date(form.date).toISOString(), with: form.with.trim(), questions: [] }
    update(v => ({ ...v, appointments: [...v.appointments, a] }))
    setOpen(false); setForm({ ...form, with: '' })
  }
  const text = buildSummary(vault)

  return (
    <>
      <div className="grid2">
        <button className="btn" onClick={() => setOpen(true)}><Icon name="plus" size={18} />{tr('Consulta')}</button>
        <button className="btn secondary" onClick={() => setSummary(true)}><Icon name="doc" size={18} />{tr('Resumo')}</button>
      </div>
      {list.length === 0 ? (
        <Empty icon="calendar" title={tr('Prepara a próxima consulta')} text={tr('Junta as perguntas que queres fazer e leva um resumo dos teus registos.')} />
      ) : list.map(a => (
        <section key={a.id} className="card">
          <div className="row between">
            <div><h3>{a.with || tr('Consulta')}</h3><p className="small muted">{fmtDate(a.date, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div>
            <button className="btn ghost sm" aria-label={tr('Apagar')} onClick={() => update(v => ({ ...v, appointments: v.appointments.filter(x => x.id !== a.id) }))}><Icon name="trash" size={16} /></button>
          </div>
          {a.questions.map(q => (
            <div key={q.id} className="row" style={{ alignItems: 'flex-start' }}>
              <button className={'check' + (q.done ? ' on' : '')} onClick={() => setAppt(a.id, x => ({ ...x, questions: x.questions.map(y => (y.id === q.id ? { ...y, done: !y.done } : y)) }))} aria-label={tr('Respondida')}><Icon name="check" size={18} /></button>
              <span className="small grow" style={{ textDecoration: q.done ? 'line-through' : 'none', paddingTop: 4 }}>{q.text}</span>
            </div>
          ))}
          <div className="row">
            <input className="input grow" placeholder={tr('Nova pergunta')} value={newQ[a.id] ?? ''} onChange={e => setNewQ({ ...newQ, [a.id]: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter' && newQ[a.id]?.trim()) { setAppt(a.id, x => ({ ...x, questions: [...x.questions, { id: uid(), text: newQ[a.id].trim(), done: false }] })); setNewQ({ ...newQ, [a.id]: '' }) } }} />
          </div>
          <details>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent)' }}>{tr('Sugestões de perguntas')}</summary>
            <div className="stack" style={{ marginTop: 8 }}>
              {questionBank.filter(q => !a.questions.some(x => x.text === q)).map(q => (
                <button key={q} className="chip" style={{ whiteSpace: 'normal', textAlign: 'left' }} onClick={() => setAppt(a.id, x => ({ ...x, questions: [...x.questions, { id: uid(), text: q, done: false }] }))}>+ {q}</button>
              ))}
            </div>
          </details>
        </section>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Nova consulta')}>
        <label className="field">{tr('Com quem')}<input className="input" value={form.with} onChange={e => setForm({ ...form, with: e.target.value })} placeholder={tr('Ex.: Endocrinologia')} /></label>
        <label className="field">{tr('Quando')}<input className="input" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <button className="btn block" onClick={add}>{tr('Guardar')}</button>
      </Sheet>
      <Sheet open={summary} onClose={() => setSummary(false)} title={tr('Resumo para a consulta')}>
        <div className="letter">{text}</div>
        <div className="grid2">
          <button className="btn" onClick={async () => toast((await copyText(text)) ? tr('Copiado') : tr('Não foi possível copiar'))}><Icon name="copy" size={18} />{tr('Copiar')}</button>
          <button className="btn secondary" onClick={async () => { if (navigator.share) { try { await navigator.share({ text }) } catch { /* cancelado */ } } else toast(tr('Usa Copiar')) }}><Icon name="share" size={18} />{tr('Partilhar')}</button>
        </div>
        <p className="xs muted">{tr('Mostra no ecrã ou partilha só com quem quiseres.')}</p>
      </Sheet>
    </>
  )
}
