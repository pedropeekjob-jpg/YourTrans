import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { Progress, Seg, useToast } from '../components/ui'
import { Collector, newTransferCode, packVault, parseFrame, unpackVault } from '../lib/transfer'
import { hasRecords } from './DataCare'
import { tr } from '../i18n'

// Passar os registos para outro aparelho com códigos QR animados. Nada passa por servidores.

function Send() {
  const { vault } = useVault()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [code] = useState(newTransferCode)
  const [frames, setFrames] = useState<string[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => { void packVault(vault, code).then(setFrames) }, [vault, code])

  useEffect(() => {
    if (!frames.length) return
    const t = window.setInterval(() => setIdx(i => (i + 1) % frames.length), 350)
    return () => window.clearInterval(t)
  }, [frames])

  useEffect(() => {
    if (canvas.current && frames[idx]) void QRCode.toCanvas(canvas.current, frames[idx], { errorCorrectionLevel: 'L', margin: 2, width: 300, color: { dark: '#000000', light: '#ffffff' } })
  }, [frames, idx])

  return (
    <div className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
      <p className="small">{tr('No outro aparelho, abre a app, vai a Eu › Os teus dados › Passar por QR e escolhe "Receber aqui". Aponta a câmara para este ecrã até a barra encher.')}</p>
      <div className="qr-box">{frames.length ? <canvas ref={canvas} aria-label={tr('Código QR animado')} /> : <p className="small muted">{tr('A preparar…')}</p>}</div>
      {frames.length > 0 && <p className="xs muted">{tr('Parte {0} de {1}', idx + 1, frames.length)}</p>}
      <div className="stack" style={{ gap: 4 }}>
        <span className="small">{tr('Código para escrever no outro aparelho')}</span>
        <div className="recovery-code" style={{ fontSize: '1.5rem' }}>{code}</div>
      </div>
      <p className="xs muted">{tr('Os dados vão cifrados: sem este código, quem filmar o ecrã não os consegue ler. As fotos não passam.')}</p>
    </div>
  )
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }

function Receive() {
  const { vault, replaceVault } = useVault()
  const toast = useToast()
  const nav = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const col = useRef(new Collector())
  const [got, setGot] = useState({ have: 0, n: 0 })
  const [camError, setCamError] = useState(false)
  const [done, setDone] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (done) return
    let stream: MediaStream | undefined
    let timer = 0
    let stopped = false
    const cv = document.createElement('canvas')
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
    const detector = BD ? new BD({ formats: ['qr_code'] }) : null

    const onText = (text: string) => {
      const f = parseFrame(text)
      if (!f) return
      if (col.current.add(f)) setGot({ have: col.current.parts.size, n: col.current.n })
      if (col.current.done) setDone(true)
    }
    const tick = async () => {
      const v = video.current
      if (stopped || !v || v.readyState < 2) return
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight))
      cv.width = Math.round(v.videoWidth * scale); cv.height = Math.round(v.videoHeight * scale)
      ctx.drawImage(v, 0, 0, cv.width, cv.height)
      try {
        if (detector) (await detector.detect(cv)).forEach(r => onText(r.rawValue))
        else {
          const r = jsQR(ctx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' })
          if (r) onText(r.data)
        }
      } catch { /* moldura ilegível */ }
    }

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        if (video.current) { video.current.srcObject = s; void video.current.play() }
        timer = window.setInterval(() => { void tick() }, 120)
      })
      .catch(() => setCamError(true))
    if (!navigator.mediaDevices) setCamError(true)
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach(t => t.stop()) }
  }, [done])

  const finish = async () => {
    setBusy(true); setError('')
    try {
      const v = await unpackVault(col.current.blob, code)
      if (hasRecords(vault) && !confirm(tr('Importar substitui os registos que estão neste aparelho pelos da cópia. Continuar?'))) return
      await replaceVault(v)
      toast(tr('Dados recebidos'))
      nav('/')
    } catch { setError(tr('Código errado. Confirma o código que aparece no outro aparelho.')) }
    finally { setBusy(false) }
  }

  if (camError) return <p className="small">{tr('Não foi possível usar a câmara. Confirma a permissão, ou passa os dados com um ficheiro de cópia de segurança.')}</p>

  if (done) return (
    <div className="stack">
      <p className="small"><Icon name="check" size={16} /> {tr('Tudo recebido. Escreve o código que aparece no outro aparelho.')}</p>
      <input className="input" style={{ textAlign: 'center', letterSpacing: '.08em', fontFamily: 'ui-monospace, monospace' }} autoCapitalize="characters" autoComplete="off" spellCheck={false}
        placeholder="XXXX-XXXX" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }} />
      {error && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
      <button className="btn block" disabled={busy || code.replace(/[^0-9A-Z]/gi, '').length < 8} onClick={finish}>{busy ? tr('A verificar…') : tr('Receber os dados')}</button>
    </div>
  )

  return (
    <div className="stack">
      <p className="small">{tr('Aponta a câmara para o código QR do outro aparelho. Mantém-na quieta até a barra encher.')}</p>
      <video ref={video} className="qr-video" playsInline muted />
      <Progress value={got.n ? got.have / got.n : 0} />
      <p className="xs muted">{got.n ? tr('Parte {0} de {1}', got.have, got.n) : tr('À procura do código…')}</p>
    </div>
  )
}

export function Transfer() {
  const [mode, setMode] = useState<'send' | 'receive'>('send')
  return (
    <>
      <TopBar title={tr('Passar por QR')} back />
      <div className="page">
        <section className="card">
          <Seg<'send' | 'receive'> value={mode} onChange={setMode} options={[{ id: 'send', label: tr('Enviar daqui') }, { id: 'receive', label: tr('Receber aqui') }]} />
          {mode === 'send' ? <Send /> : <Receive key="r" />}
        </section>
        <p className="xs muted">{tr('Receber substitui os registos do aparelho que recebe. Depois, os dois aparelhos seguem separados.')}</p>
      </div>
    </>
  )
}
