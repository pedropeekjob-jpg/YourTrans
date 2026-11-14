import { useEffect, useRef, useState } from 'react'
import { TopBar } from '../components/Layout'
import { useVault } from '../lib/vault-context'
import { detectPitch, PITCH_BANDS } from '../lib/pitch'
import { todayKey } from '../lib/types'
import { tr } from '../i18n'

const bandLabel = (id: string) => id === 'grave' ? tr('mais grave') : id === 'neutra' ? tr('zona neutra') : tr('mais aguda')

const exercises = [
  { t: tr('Aquecer'), d: tr('Boceja devagar e solta o ar com um "hmmm" suave, a descer e a subir. Um minuto.') },
  { t: tr('Ressonância'), d: tr('Diz "mi-mi-mi" a sentir a vibração na cara, perto do nariz, e não no peito. Repete com frases curtas.') },
  { t: tr('Altura'), d: tr('Lê uma frase em voz alta e vê onde fica no medidor. Tenta mantê-la estável, sem forçar.') },
  { t: tr('Entoação'), d: tr('Faz uma pergunta e uma afirmação com as mesmas palavras. Repara como a melodia muda.') },
]

/** Treino de voz: medidor de altura em tempo real. O som nunca é gravado nem sai do aparelho. */
export function Voice() {
  const { vault, update } = useVault()
  const [on, setOn] = useState(false)
  const [hz, setHz] = useState<number | null>(null)
  const [avg, setAvg] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const stop = useRef<() => void>(() => {})
  const samples = useRef<number[]>([])

  useEffect(() => () => stop.current(), [])

  const start = async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true } })
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 2048
      src.connect(an)
      const buf = new Float32Array(an.fftSize)
      samples.current = []
      let raf = 0
      const tick = () => {
        an.getFloatTimeDomainData(buf)
        const f = detectPitch(buf, ctx.sampleRate)
        if (f && f > 60 && f < 500) {
          setHz(Math.round(f))
          samples.current.push(f)
          if (samples.current.length > 300) samples.current.shift()
          const sorted = [...samples.current].sort((a, b) => a - b)
          setAvg(Math.round(sorted[Math.floor(sorted.length / 2)]))
        }
        raf = requestAnimationFrame(tick)
      }
      tick()
      stop.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); void ctx.close(); setOn(false) }
      setOn(true)
    } catch {
      setErr(tr('Não foi possível usar o microfone. Dá autorização nas definições do browser ou do telemóvel.'))
    }
  }

  const finish = () => {
    stop.current()
    if (avg) {
      const day = todayKey()
      update(v => ({ ...v, voiceLog: [...(v.voiceLog ?? []).filter(x => x.date !== day), { date: day, hz: avg }].slice(-120) }))
    }
  }

  const pct = hz ? Math.min(100, Math.max(0, (hz - 80) / (300 - 80) * 100)) : 0
  const band = (f: number) => PITCH_BANDS.find(b => f >= b.from && f < b.to)!.id
  const log = vault.voiceLog ?? []

  return (
    <>
      <TopBar title={tr('Treino de voz')} back />
      <div className="page">
        <section className="card">
          <p className="small">{tr('Fala normalmente e vê a altura da tua voz. O som é analisado no momento e nunca é gravado nem enviado.')}</p>
          <div className="voice-meter" aria-hidden="true">
            <div className="voice-band" style={{ left: `${(145 - 80) / 220 * 100}%`, width: `${30 / 220 * 100}%` }} />
            {hz && <div className="voice-needle" style={{ left: `${pct}%` }} />}
          </div>
          <div className="row between xs muted"><span>80 Hz</span><span>{tr('zona neutra')}</span><span>300 Hz</span></div>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, textAlign: 'center' }} aria-live="polite">
            {hz ? `${hz} Hz` : '—'}
          </p>
          {avg && <p className="small muted" style={{ textAlign: 'center' }}>{tr('Média desta sessão: {0} Hz ({1})', avg, bandLabel(band(avg)))}</p>}
          {err && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{err}</p>}
          {on
            ? <button className="btn block" onClick={finish}>{tr('Parar e guardar a média')}</button>
            : <button className="btn block" onClick={() => void start()}>{tr('Começar')}</button>}
          <p className="xs muted">{tr('As faixas são aproximadas e não são metas. A voz também depende da ressonância, da entoação e do ritmo. Se sentires dor ou rouquidão, para; um/a terapeuta da fala pode ajudar.')}</p>
        </section>

        <section className="card">
          <h3>{tr('Exercícios de 5 minutos')}</h3>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            {exercises.map(e => <li key={e.t}><b>{e.t}.</b> {e.d}</li>)}
          </ol>
        </section>

        {log.length > 0 && (
          <section className="card">
            <h3>{tr('A tua evolução')}</h3>
            <div className="list">
              {[...log].reverse().slice(0, 10).map(l => (
                <div key={l.date} className="row between small"><span>{l.date}</span><b>{l.hz} Hz</b></div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
