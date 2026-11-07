import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Instalada, a app chama-se "Casulo" e usa o ícone do Casulo. Quem não está à vontade
// em casa pode escolher, antes de instalar, o nome discreto "Notas" com um ícone neutro:
// nesse caso o index.html troca o manifesto por public/manifest-notas.webmanifest.
export default defineConfig({
  base: './',
  plugins: [
    react(),
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
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'], setupFiles: ['./src/test-setup.ts'] },
} as never)
