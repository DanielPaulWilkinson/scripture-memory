/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/scripture-memory/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globIgnores: ['**/models/**', '**/ort/**', '**/*.wasm', '**/transformers*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: ({ url }) => /\/(models|ort)\/|\.wasm$|transformers[^/]*\.js$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'voice-model', expiration: { maxEntries: 20 }, cacheableResponse: { statuses: [200] } },
        }],
      },
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: 'hide-it', name: 'Hide It: scripture memory', short_name: 'Hide It',
        description: 'Learn Bible verses by heart, a few minutes a day. Private and offline.',
        lang: 'en-GB', start_url: './', scope: './', display: 'standalone',
        theme_color: '#1B2420', background_color: '#EEF0EE',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom' },
})
