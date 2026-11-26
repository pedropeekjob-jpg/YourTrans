import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { installNativeShims, isNative } from './lib/native'
import './lib/install' // apanha o convite de instalação do browser antes de a app arrancar
import { dictUrl, loadDict } from './i18n'
import { catchGoogleRedirect } from './lib/googleCalendar'
import '@fontsource/unbounded/latin-300.css'
import '@fontsource/unbounded/latin-400.css'
import './styles.css'

// Na app nativa (lojas) os ficheiros já vêm dentro da app: sem service worker.
if (isNative()) installNativeShims()
else if (!import.meta.env.VITE_PREVIEW) registerSW({ immediate: true })

// Regresso da Google (ligação ao calendário): o token vem no endereço depois de "#". Guarda-se na
// sessão e o endereço é limpo antes de o router o ler, para não ficar no histórico.
const back = catchGoogleRedirect()
if (back) history.replaceState(null, '', `${location.pathname}#${back}`)

// O dicionário do idioma ativo tem de estar carregado antes dos módulos da app,
// porque alguns textos fixos são traduzidos logo quando o módulo é lido.
void loadDict().then(async () => {
  const { App } = await import('./App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

// Na primeira visita o service worker ainda não controla a página: guardamos o dicionário
// à mão, para a app funcionar no idioma certo mesmo sem rede.
const url = dictUrl
if (url && !isNative() && 'serviceWorker' in navigator && 'caches' in window) {
  navigator.serviceWorker.ready
    .then(() => caches.open('casulo-idioma'))
    .then(async c => { if (!(await c.match(url))) await c.add(url) })
    .catch(() => { /* fica para a próxima vez que houver rede */ })
}
