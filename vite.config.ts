import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

// Política de segurança de conteúdo (CSP). O GitHub Pages não deixa definir cabeçalhos,
// por isso vai numa <meta> no index.html. Só corre código da própria app (os scripts
// inline do index.html entram pelo hash) e só fala com o servidor da comunidade e com
// os mosaicos do mapa. Mesmo que um texto da comunidade tentasse injetar código,
// o browser recusava-o.
function contentSecurityPolicy(): Plugin {
  const api = process.env.VITE_API_URL && process.env.VITE_API_URL !== 'off' ? new URL(process.env.VITE_API_URL).origin : ''
  return {
    name: 'casulo-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
          .map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
        const csp = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          `connect-src 'self' https://tiles.openfreemap.org https://casulo-comunidade.onrender.com https://api.casulo.space ${api}`.trim(),
          "worker-src 'self' blob:",
          "child-src 'self' blob:",
          "media-src 'self' blob: data:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
      },
    },
  }
}

// Instalada, a app chama-se "Casulo" e usa o ícone do Casulo. Quem não está à vontade
// em casa pode escolher, antes de instalar, o nome discreto "Notas" com um ícone neutro:
// nesse caso o index.html troca o manifesto por public/manifest-notas.webmanifest.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        // React e o router mudam pouco: num ficheiro à parte, não se voltam a descarregar
        // em cada atualização da app.
        manualChunks: id => (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id) ? 'vendor' : undefined),
      },
    },
  },
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'manifest-notas.webmanifest'],
      manifest: {
        id: './',
        name: 'Casulo',
        short_name: 'Casulo',
        description: 'Casulo',
        lang: 'pt-PT',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#14283a',
        theme_color: '#14283a',
        icons: [
          { src: 'casulo-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'casulo-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'casulo-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Poupar dados: a instalação só descarrega o essencial. O mapa (MapLibre, ~280 KB)
      // e os idiomas são guardados quando são usados; os ícones PNG são pedidos pelo
      // próprio sistema ao instalar. Os ficheiros têm hash no nome, por isso uma atualização
      // só volta a descarregar o que mudou.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/maplibre-gl-*', 'privacidade/**', 'termos/**', 'suporte/**'],
        // Páginas públicas para as lojas (scripts/paginas-legais.mjs): abrem sempre do servidor.
        navigateFallbackDenylist: [/^\/(privacidade|termos|suporte)(\/|$)/],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/maplibre-gl-.*\.(js|css)$/.test(url.pathname),
            handler: 'CacheFirst', options: { cacheName: 'casulo-mapa', expiration: { maxEntries: 4 } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/(en|es|fr|br)-.*\.json$/.test(url.pathname),
            handler: 'CacheFirst', options: { cacheName: 'casulo-idioma', expiration: { maxEntries: 4 } } },
          // Mosaicos do mapa: guardados até 30 dias, para não voltar a gastar dados nas mesmas zonas.
          { urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst', options: { cacheName: 'casulo-mosaicos', expiration: { maxEntries: 400, maxAgeSeconds: 30 * 86400 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'], setupFiles: ['./src/test-setup.ts'] },
} as never)
