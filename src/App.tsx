import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { VaultProvider, useVault } from './lib/vault-context'
import { ToastProvider } from './components/ui'
import { Layout } from './components/Layout'
import { Decoy } from './components/Decoy'
import { Lock } from './components/Lock'
import { Onboarding } from './pages/Onboarding'
import { Home } from './pages/Home'
import { Documents } from './pages/Documents'
import { NameRehearsal } from './pages/NameRehearsal'
import { Health } from './pages/Health'
import { ProviderPage } from './pages/ProviderPage'
import { Journal } from './pages/Journal'
import { Safety } from './pages/Safety'
import { Community } from './pages/Community'
import { Work } from './pages/Work'
import { Settings } from './pages/Settings'
import { Share } from './pages/Share'
import { AllyCards, AllyForMe, AllyHome, AllyLearn, AllyPractice, Receive } from './pages/Ally'

function Shell() {
  const { status, vault } = useVault()

  useEffect(() => {
    const theme = vault?.settings.theme ?? 'system'
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [vault?.settings.theme])

  if (status === 'loading') return null
  if (status === 'decoy') return <Decoy />
  if (status === 'locked') return <Lock />
  if (!vault.settings.onboarded) return <Onboarding />

  const ally = vault.settings.profile === 'ally'
  return (
    <HashRouter>
      <Layout>
        {ally ? (
        <Routes>
          <Route path="/" element={<AllyHome />} />
          <Route path="/aprender" element={<AllyLearn />} />
          <Route path="/praticar" element={<AllyPractice />} />
          <Route path="/cartoes" element={<AllyCards />} />
          <Route path="/para-mim" element={<AllyForMe />} />
          <Route path="/receber/:data" element={<Receive />} />
          <Route path="/comunidade" element={<Community />} />
          <Route path="/definicoes" element={<Settings />} />
          <Route path="*" element={<AllyHome />} />
        </Routes>
        ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/partilhar" element={<Share />} />
          <Route path="/receber/:data" element={<Receive />} />
          <Route path="/documentos" element={<Documents />} />
          <Route path="/nome" element={<NameRehearsal />} />
          <Route path="/saude" element={<Health />} />
          <Route path="/saude/:id" element={<ProviderPage />} />
          <Route path="/diario" element={<Journal />} />
          <Route path="/seguranca" element={<Safety />} />
          <Route path="/comunidade" element={<Community />} />
          <Route path="/emprego" element={<Work />} />
          <Route path="/definicoes" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
        )}
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
