import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './lib/install' // apanha o convite de instalação do browser antes de a app arrancar
import { App } from './App'
import '@fontsource/unbounded/latin-300.css'
import '@fontsource/unbounded/latin-400.css'
import './styles.css'

if (!import.meta.env.VITE_PREVIEW) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
