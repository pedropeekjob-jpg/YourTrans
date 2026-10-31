import { useState } from 'react'
import QRCode from 'qrcode'
import { useSearchParams } from 'react-router-dom'
import { useVault } from '../lib/vault-context'
import { TopBar } from '../components/Layout'
import { Icon } from '../components/Icon'
import { PayloadView } from '../components/CardView'
import { Seg, Sheet, copyText, useToast } from '../components/ui'
import { helpSuggestions, hurtSuggestions, systemsSchool, systemsWork, whoKnowsSuggestions } from '../data/allies'
import { encodeShare, shareUrl } from '../lib/share'
import { uid, type KnowState, type SharedPayload, type SupportCard, type TransitionPlan } from '../lib/types'
import { knowLabels } from '../components/CardView'

type Tab = 'cartao' | 'plano'

function ChipPicker({ options, value, onChange, placeholder }: { options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [custom, setCustom] = useState('')
  const all = [...options, ...value.filter(v => !options.includes(v))]
  const add = () => { const c = custom.trim(); if (c && !value.includes(c)) onChange([...value, c]); setCustom('') }
  return (
    <div className="stack">
      <div className="row wrap">
        {all.map(o => {
          const on = value.includes(o)
          return <button key={o} className={'chip' + (on ? ' on' : '')} onClick={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}>{o}</button>
        })}
      </div>
      <div className="row">
        <input className="input grow" value={custom} placeholder={placeholder} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn secondary" onClick={add} aria-label="Acrescentar"><Icon name="plus" /></button>
      </div>
    </div>
  )
}

export function Share() {
  const { vault, update } = useVault()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'cartao'
  const s = vault.settings
  const card: SupportCard = vault.supportCard ?? { name: s.displayName, pronouns: s.pronouns === 'sem preferência' ? '' : s.pronouns, message: '', helps: [], hurts: [], whoKnows: [] }
  const plan: TransitionPlan = vault.workPlan ?? { context: 'trabalho', org: '', startDate: '', whoTells: 'juntos', howTell: '', systems: [], facilities: '', confidential: '', contact: '' }
  const setCard = (c: Partial<SupportCard>) => update(v => ({ ...v, supportCard: { ...card, ...c } }))
  const setPlan = (p: Partial<TransitionPlan>) => update(v => ({ ...v, workPlan: { ...plan, ...p } }))
  const [who, setWho] = useState('')

  const [sharing, setSharing] = useState<SharedPayload | null>(null)
  const [preview, setPreview] = useState(false)
  const [pass, setPass] = useState('')
  const [link, setLink] = useState('')
  const [qr, setQr] = useState('')

  const payload = (which: 'card' | 'plan' | 'both'): SharedPayload => ({
    v: 1, sentAt: new Date().toISOString().slice(0, 10),
    card: which !== 'plan' ? card : undefined,
    plan: which !== 'card' ? plan : undefined,
  })
  const openShare = (which: 'card' | 'plan' | 'both') => { setSharing(payload(which)); setLink(''); setQr(''); setPass('') }
  const generate = async () => {
    if (!sharing) return
    const url = shareUrl(await encodeShare(sharing, pass || undefined))
    setLink(url)
    try { setQr(await QRCode.toDataURL(url, { errorCorrectionLevel: 'L', margin: 1, width: 520 })) } catch { setQr('') }
  }
  const send = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Como me podes apoiar', text: pass ? 'Abre esta ligação. Digo-te a palavra-passe pessoalmente.' : 'Abre esta ligação para veres como me podes apoiar.', url: link }); return } catch { /* cancelado */ }
    }
    if (await copyText(link)) toast('Ligação copiada')
  }

  const addWho = (name: string, state: KnowState = 'ainda') => {
    const n = name.trim()
    if (!n || card.whoKnows.some(w => w.who === n)) return
    setCard({ whoKnows: [...card.whoKnows, { id: uid(), who: n, state }] })
    setWho('')
  }
  const toggleSystem = (label: string) => {
    const has = plan.systems.find(x => x.label === label)
    setPlan({ systems: has ? plan.systems.filter(x => x.label !== label) : [...plan.systems, { id: uid(), label }] })
  }
  const sysOptions = plan.context === 'escola' ? systemsSchool : systemsWork

  return (
    <>
      <TopBar title="Pessoas que me apoiam" back />
      <div className="page">
        <p className="small muted">Diz às pessoas à tua volta o que te ajuda, sem teres de repetir a conversa vezes sem conta. Elas recebem uma ligação, guardam o cartão na app e aprendem a apoiar-te.</p>
        <Seg<Tab> value={tab} onChange={t => setParams({ tab: t }, { replace: true })} options={[{ id: 'cartao', label: 'O meu cartão' }, { id: 'plano', label: 'Trabalho ou escola' }]} />

        {tab === 'cartao' && (
          <>
            <section className="card">
              <h3>Como queres ser tratade</h3>
              <div className="grid2">
                <label className="field">Nome<input className="input" value={card.name} onChange={e => setCard({ name: e.target.value })} /></label>
                <label className="field">Pronomes<input className="input" value={card.pronouns} placeholder="ela/dela" onChange={e => setCard({ pronouns: e.target.value })} /></label>
              </div>
              <label className="field">Uma mensagem <span className="xs muted">(opcional)</span>
                <textarea className="input" rows={2} value={card.message} placeholder="Obrigada por estares comigo nisto." onChange={e => setCard({ message: e.target.value })} />
              </label>
            </section>
            <section className="card">
              <h3>O que me ajuda</h3>
              <ChipPicker options={helpSuggestions} value={card.helps} onChange={helps => setCard({ helps })} placeholder="Escreve outra coisa" />
            </section>
            <section className="card">
              <h3>O que me magoa</h3>
              <ChipPicker options={hurtSuggestions} value={card.hurts} onChange={hurts => setCard({ hurts })} placeholder="Escreve outra coisa" />
            </section>
            <section className="card">
              <h3>Quem já sabe</h3>
              <p className="xs muted">Assim ninguém conta a quem ainda não sabe. Toca no estado para mudar.</p>
              {card.whoKnows.map(w => (
                <div key={w.id} className="row between">
                  <span className="small grow">{w.who}</span>
                  <button className={'know ' + w.state} onClick={() => setCard({ whoKnows: card.whoKnows.map(x => x.id === w.id ? { ...x, state: ({ sim: 'ainda', ainda: 'nao', nao: 'sim' } as const)[x.state] } : x) })}>{knowLabels[w.state]}</button>
                  <button className="icon-btn" aria-label={`Remover ${w.who}`} onClick={() => setCard({ whoKnows: card.whoKnows.filter(x => x.id !== w.id) })}><Icon name="x" size={18} /></button>
                </div>
              ))}
              <div className="row wrap">
                {whoKnowsSuggestions.filter(x => !card.whoKnows.some(w => w.who === x)).map(x => <button key={x} className="chip" onClick={() => addWho(x)}>+ {x}</button>)}
              </div>
              <div className="row">
                <input className="input grow" value={who} placeholder="Outra pessoa ou grupo" onChange={e => setWho(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWho(who)} />
                <button className="btn secondary" onClick={() => addWho(who)} aria-label="Acrescentar"><Icon name="plus" /></button>
              </div>
            </section>
          </>
        )}

        {tab === 'plano' && (
          <>
            <section className="card">
              <h3>Onde</h3>
              <Seg<'trabalho' | 'escola'> value={plan.context} onChange={c => setPlan({ context: c, systems: [] })} options={[{ id: 'trabalho', label: 'Trabalho' }, { id: 'escola', label: 'Escola ou universidade' }]} />
              <label className="field">{plan.context === 'escola' ? 'Escola' : 'Empresa ou equipa'}<input className="input" value={plan.org} onChange={e => setPlan({ org: e.target.value })} /></label>
              <label className="field">A partir de quando uso o novo nome<input className="input" type="date" value={plan.startDate} onChange={e => setPlan({ startDate: e.target.value })} /></label>
            </section>
            <section className="card">
              <h3>Quem comunica</h3>
              <Seg<TransitionPlan['whoTells']> value={plan.whoTells} onChange={w => setPlan({ whoTells: w })} options={[{ id: 'eu', label: 'Eu' }, { id: 'outra', label: plan.context === 'escola' ? 'A escola' : 'A chefia' }, { id: 'juntos', label: 'Juntos' }]} />
              <label className="field">Como <span className="xs muted">(opcional)</span>
                <textarea className="input" rows={2} value={plan.howTell} placeholder={plan.context === 'escola' ? 'Na aula de cidadania, sem mim presente.' : 'E-mail curto à equipa na segunda de manhã.'} onChange={e => setPlan({ howTell: e.target.value })} />
              </label>
            </section>
            <section className="card">
              <h3>O que tem de ser atualizado</h3>
              <div className="row wrap">
                {sysOptions.map(o => <button key={o} className={'chip' + (plan.systems.some(x => x.label === o) ? ' on' : '')} onClick={() => toggleSystem(o)}>{o}</button>)}
              </div>
              <p className="xs muted">Quem recebe o plano vê isto como uma lista para ir marcando.</p>
            </section>
            <section className="card">
              <h3>Instalações e contactos</h3>
              <label className="field">Casas de banho e balneários<textarea className="input" rows={2} value={plan.facilities} placeholder="Uso o balneário feminino. Gostava de ter acesso ao duche individual." onChange={e => setPlan({ facilities: e.target.value })} /></label>
              <label className="field">Pessoa de referência<input className="input" value={plan.contact} placeholder={plan.context === 'escola' ? 'Diretora de turma' : 'Ana, RH'} onChange={e => setPlan({ contact: e.target.value })} /></label>
              <label className="field">Confidencial <span className="xs muted">(o que não deve ser partilhado)</span><textarea className="input" rows={2} value={plan.confidential} placeholder="Os meus pais ainda não sabem: não contactem a família sobre isto." onChange={e => setPlan({ confidential: e.target.value })} /></label>
            </section>
          </>
        )}

        <div className="stack">
          <button className="btn block" onClick={() => openShare(tab === 'cartao' ? 'card' : 'plan')} disabled={tab === 'cartao' ? !card.name.trim() : !plan.org.trim() && !plan.startDate}>
            <Icon name="share" size={18} />Partilhar {tab === 'cartao' ? 'o cartão' : 'o plano'}
          </button>
          {vault.supportCard && vault.workPlan && <button className="btn secondary block" onClick={() => openShare('both')}>Partilhar cartão e plano juntos</button>}
          <button className="btn ghost" onClick={() => setPreview(true)}>Ver como fica</button>
        </div>

        <section className="card flat">
          <div className="row"><Icon name="lock" /><h3>Nada passa por um servidor</h3></div>
          <p className="small muted">O conteúdo vai dentro da própria ligação ou do QR e só fica guardado no telemóvel de quem o abre. Com palavra-passe, só quem a souber consegue ler. Para mudar alguma coisa, envia uma ligação nova.</p>
        </section>
      </div>

      <Sheet open={preview} onClose={() => setPreview(false)} title="Como fica">
        <PayloadView payload={payload(tab === 'cartao' ? 'card' : 'plan')} />
      </Sheet>

      <Sheet open={!!sharing} onClose={() => setSharing(null)} title="Partilhar">
        {!link ? (
          <div className="stack">
            <label className="field">Palavra-passe <span className="xs muted">(recomendado)</span>
              <input className="input" value={pass} onChange={e => setPass(e.target.value)} placeholder="Uma palavra que dizes pessoalmente" autoComplete="off" />
            </label>
            <p className="xs muted">Diz a palavra-passe pessoalmente ou por outro meio. Assim, mesmo que a ligação seja reencaminhada, ninguém mais a abre.</p>
            <button className="btn block" onClick={generate}>Criar ligação e QR</button>
          </div>
        ) : (
          <div className="stack">
            {qr && <div className="qr"><img src={qr} alt="Código QR com o cartão" /></div>}
            <p className="xs muted" style={{ textAlign: 'center' }}>Mostra o QR à pessoa ou envia a ligação.</p>
            <button className="btn block" onClick={send}><Icon name="share" size={18} />Enviar ligação</button>
            <button className="btn secondary block" onClick={async () => { if (await copyText(link)) toast('Ligação copiada') }}><Icon name="copy" size={18} />Copiar</button>
          </div>
        )}
      </Sheet>
    </>
  )
}
