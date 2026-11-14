// Avisos de lembretes (carregado pelo service worker da app).
// A notificação chega vazia do servidor: o texto vem de uma preferência guardada pela própria
// app no aparelho (nome discreto, língua), por isso o servidor nunca sabe o que é o lembrete.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let p = { title: 'Notas', body: 'Tens uma nota', icon: './icon-192.png' }
    try {
      const c = await caches.open('casulo-prefs')
      const r = await c.match('./__prefs')
      if (r) p = { ...p, ...(await r.json()) }
    } catch { /* fica o texto neutro */ }
    await self.registration.showNotification(p.title, { body: p.body, icon: p.icon, badge: p.icon, tag: 'lembrete', renotify: true })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = all.find(c => 'focus' in c)
    if (open) return open.focus()
    return self.clients.openWindow('./#/saude')
  })())
})
