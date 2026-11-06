/** Tira o ecrã de carregamento quando a app estiver pronta (mínimo de 0,9 s para não piscar). */
export function hideSplash() {
  const el = document.getElementById('splash')
  if (!el) return
  const at = (window as unknown as { __splashAt?: number }).__splashAt ?? 0
  window.setTimeout(() => { el.classList.add('out'); window.setTimeout(() => el.remove(), 400) }, Math.max(0, 900 - (Date.now() - at)))
}

/** Lembra se o próximo arranque pode mostrar o ecrã do Casulo (não com código). */
export function allowSplash(ok: boolean) {
  try { localStorage.setItem('splash', ok ? '1' : '0') } catch { /* ignorado */ }
}
