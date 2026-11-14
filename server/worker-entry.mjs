// Ponto de entrada do Worker (wrangler.toml). A página de moderação entra como texto.
import { makeWorker } from './worker.mjs'
import modHtml from './mod.html'

export default makeWorker(modHtml)
