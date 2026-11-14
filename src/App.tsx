import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { VaultProvider, useVault } from './lib/vault-context'
import { ToastProvider } from './components/ui'
import { Layout } from './components/Layout'
import { allowSplash, hideSplash } from './lib/splash'
import { NewPinSheet, RecoveryCodeSheet } from './components/Recovery'
import { Lock } from './components/Lock'
import { NativeBridge } from './components/Native'
import { TermsSheet } from './components/TermsSheet'
import { useReminderPushSync } from './lib/notify'
import { Onboarding } from './pages/Onboarding'
import { Home } from './pages/Home'

/**
 * Ecrã carregado só quando é aberto. Se a app foi atualizada entretanto e o ficheiro antigo
 * já não existe, recarrega uma vez para ir buscar a versão nova (em vez de ficar em branco).
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return lazy(() => load().then(
    m => { try { sessionStorage.removeItem('reload-chunk') } catch { /* ignorado */ } return { default: m[name] as ComponentType } },
    err => {
      try {
        if (!sessionStorage.getItem('reload-chunk')) { sessionStorage.setItem('reload-chunk', '1'); location.reload(); return new Promise<never>(() => {}) }
      } catch { /* ignorado */ }
      throw err
    },
  ))
}

const Documents = page(() => import('./pages/Documents'), 'Documents')
const NameRehearsal = page(() => import('./pages/NameRehearsal'), 'NameRehearsal')
const Health = page(() => import('./pages/Health'), 'Health')
const ProviderPage = page(() => import('./pages/ProviderPage'), 'ProviderPage')
const Journal = page(() => import('./pages/Journal'), 'Journal')
const Safety = page(() => import('./pages/Safety'), 'Safety')
const Seal = page(() => import('./pages/Seal'), 'Seal')
const SealEntityPage = page(() => import('./pages/Seal'), 'SealEntityPage')
const Community = page(() => import('./pages/Community'), 'Community')
const Work = page(() => import('./pages/Work'), 'Work')
const Settings = page(() => import('./pages/Settings'), 'Settings')
const Share = page(() => import('./pages/Share'), 'Share')
const Rights = page(() => import('./pages/Rights'), 'Rights')
const Journey = page(() => import('./pages/Journey'), 'Journey')
const HealthPath = page(() => import('./pages/HealthPath'), 'HealthPath')
const Me = page(() => import('./pages/Me'), 'Me')
const Help = page(() => import('./pages/Help'), 'Help')
const DataCare = page(() => import('./pages/DataCare'), 'DataCare')
const Privacy = page(() => import('./pages/Privacy'), 'Privacy')
const Suggest = page(() => import('./pages/Suggest'), 'Suggest')
const Transfer = page(() => import('./pages/Transfer'), 'Transfer')
const AllyCards = page(() => import('./pages/Ally'), 'AllyCards')
const AllyForMe = page(() => import('./pages/Ally'), 'AllyForMe')
const AllyHome = page(() => import('./pages/Ally'), 'AllyHome')
const AllyLearn = page(() => import('./pages/Ally'), 'AllyLearn')
const AllyPractice = page(() => import('./pages/Ally'), 'AllyPractice')
const Receive = page(() => import('./pages/Ally'), 'Receive')
const Search = page(() => import('./pages/Search'), 'Search')
const NameCard = page(() => import('./pages/NameCard'), 'NameCard')
const Voice = page(() => import('./pages/Voice'), 'Voice')
const Travel = page(() => import('./pages/Travel'), 'Travel')

function Shell() {
  return <><Screen /><RecoveryCodeSheet /><NewPinSheet /><TermsSheet /><NativeBridge /></>
}

function Screen() {
  const { status, vault, mode } = useVault()

  useEffect(() => {
    if (status === 'loading') return
    hideSplash()
    allowSplash(mode === 'device' && status === 'open')
  }, [status, mode])

  useEffect(() => {
    const theme = vault?.settings.theme ?? 'dark'
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [vault?.settings.theme])

  useReminderPushSync(vault?.reminders, vault?.settings.pushReminders, vault?.settings.discreetNotifications)

  if (status === 'loading') return null
  if (status === 'locked') return <Lock />
  if (!vault.settings.onboarded) return <Onboarding />

  const ally = vault.settings.profile === 'ally'
  return (
    <HashRouter>
      <Layout>
        {/* Cada ecrã é um ficheiro à parte: o arranque só lê o Início; os outros já estão
            guardados pelo service worker e abrem sem rede. */}
        <Suspense fallback={null}>
        {ally ? (
        <Routes>
          <Route path="/" element={<AllyHome />} />
          <Route path="/aprender" element={<AllyLearn />} />
          <Route path="/praticar" element={<AllyPractice />} />
          <Route path="/cartoes" element={<AllyCards />} />
          <Route path="/para-mim" element={<AllyForMe />} />
          <Route path="/receber/:data" element={<Receive />} />
          <Route path="/comunidade" element={<Community />} />
          <Route path="/selo" element={<Seal />} />
          <Route path="/selo/:id" element={<SealEntityPage />} />
          <Route path="/definicoes" element={<Settings />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/sugerir" element={<Suggest />} />
          <Route path="/dados" element={<DataCare />} />
          <Route path="/passar" element={<Transfer />} />
          <Route path="*" element={<AllyHome />} />
        </Routes>
        ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/percurso" element={<Journey />} />
          <Route path="/percurso/saude" element={<HealthPath />} />
          <Route path="/eu" element={<Me />} />
          <Route path="/procurar" element={<Search />} />
          <Route path="/cartao-nome" element={<NameCard />} />
          <Route path="/voz" element={<Voice />} />
          <Route path="/viagem" element={<Travel />} />
          <Route path="/ajuda" element={<Help />} />
          <Route path="/partilhar" element={<Share />} />
          <Route path="/direitos" element={<Rights />} />
          <Route path="/receber/:data" element={<Receive />} />
          <Route path="/documentos" element={<Documents />} />
          <Route path="/nome" element={<NameRehearsal />} />
          <Route path="/saude" element={<Health />} />
          <Route path="/saude/:id" element={<ProviderPage />} />
          <Route path="/diario" element={<Journal />} />
          <Route path="/seguranca" element={<Safety />} />
          <Route path="/selo" element={<Seal />} />
          <Route path="/selo/:id" element={<SealEntityPage />} />
          <Route path="/comunidade" element={<Community />} />
          <Route path="/emprego" element={<Work />} />
          <Route path="/definicoes" element={<Settings />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/sugerir" element={<Suggest />} />
          <Route path="/dados" element={<DataCare />} />
          <Route path="/passar" element={<Transfer />} />
          <Route path="*" element={<Home />} />
        </Routes>
        )}
        </Suspense>
      </Layout>
    </HashRouter>
  )
}

export function App() {
  return (
    <VaultProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </VaultProvider>
  )
}
