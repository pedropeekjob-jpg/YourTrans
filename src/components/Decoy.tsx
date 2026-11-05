import { useRef, useState } from 'react'
import { useVault } from '../lib/vault-context'
import { tr } from '../i18n'

// Calculadora funcional usada como disfarce após o botão de pânico.
// Modo PIN: escrever o PIN e carregar em "=" volta à app.
// Sem PIN: manter "=" carregado durante 2 segundos.
export function Decoy() {
  const { mode, unlock, leaveDecoy } = useVault()
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true)
  const typed = useRef('')
  const hold = useRef<number | undefined>(undefined)

  const digit = (d: string) => {
    typed.current = (typed.current + d).slice(-12)
    setDisplay(cur => (fresh || cur === '0' ? d : (cur + d).slice(0, 12)))
    setFresh(false)
  }
  const compute = (a: number, b: number, o: string) =>
    o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? (b === 0 ? NaN : a / b) : b
  const operator = (o: string) => {
    typed.current = ''
    const cur = parseFloat(display.replace(',', '.'))
    if (acc !== null && op && !fresh) {
      const r = compute(acc, cur, op)
      setAcc(r); setDisplay(fmt(r))
    } else setAcc(cur)
    setOp(o); setFresh(true)
  }
  const equals = async () => {
    const candidate = typed.current
    typed.current = ''
    if (mode === 'pin' && candidate.length >= 4) {
      try { await unlock(candidate); return } catch { /* não é o PIN: segue como conta normal */ }
    }
    if (acc !== null && op) {
      const r = compute(acc, parseFloat(display.replace(',', '.')), op)
      setDisplay(fmt(r)); setAcc(null); setOp(null); setFresh(true)
    }
  }
  const clearAll = () => { setDisplay('0'); setAcc(null); setOp(null); setFresh(true); typed.current = '' }

  const startHold = () => {
    if (mode !== 'device') return
    hold.current = window.setTimeout(() => { void leaveDecoy() }, 2000)
  }
  const endHold = () => window.clearTimeout(hold.current)

  const keys: [string, string][] = [
    ['AC', 'fn'], ['±', 'fn'], ['%', 'fn'], ['÷', 'op'],
    ['7', ''], ['8', ''], ['9', ''], ['×', 'op'],
    ['4', ''], ['5', ''], ['6', ''], ['−', 'op'],
    ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
    ['0', 'zero'], [',', ''], ['=', 'op'],
  ]
  const press = (k: string) => {
    if (/\d/.test(k)) digit(k)
    else if (k === ',') { if (!display.includes(',')) { setDisplay(fresh ? '0,' : display + ','); setFresh(false) } }
    else if (k === 'AC') clearAll()
    else if (k === '±') setDisplay(fmt(-parseFloat(display.replace(',', '.'))))
    else if (k === '%') setDisplay(fmt(parseFloat(display.replace(',', '.')) / 100))
    else if (k === '=') void equals()
    else operator(k)
  }

  return (
    <div className="calc" aria-label={tr('Calculadora')}>
      <div className="display">{display}</div>
      <div className="keys">
        {keys.map(([k, cls]) => (
          <button key={k} className={cls} onClick={() => press(k)}
            onPointerDown={k === '=' ? startHold : undefined} onPointerUp={k === '=' ? endHold : undefined} onPointerLeave={k === '=' ? endHold : undefined}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

function fmt(n: number): string {
  if (!isFinite(n)) return 'Erro'
  return String(Math.round(n * 1e8) / 1e8).replace('.', ',')
}
