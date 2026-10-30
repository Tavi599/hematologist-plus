/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults } from 'vitest/config'

// GitHub Pages serves the site from /<repo>/; override with BASE_PATH if the repo is renamed.
const BASE_PATH = process.env.BASE_PATH ?? '/hematologist-plus/'

export default defineConfig({
  // Same base in dev, preview and build so local URLs match production.
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Hematologist+',
        short_name: 'Hematologist+',
        description: 'Dose calculator and reference for hematologists',
        lang: 'uk',
        theme_color: '#b3261e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Reference data caching is handled in the app (IndexedDB), not by the service worker,
        // so patient input never ends up in a network cache.
        navigateFallback: 'index.html',
        // The EBMT handbook is the one exception: it is a published Open Access
        // book served as ~100 static JSON files, with nothing in it about any
        // patient. Precaching all of it would be several megabytes, so a
        // chapter is cached when it is first read and then works offline.
        navigateFallbackDenylist: [/\/ebmt\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ebmt/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ebmt-handbook',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // A page test renders the whole Mantine tree; the CI runner needs more than the 5 s default.
    testTimeout: 20000,
    // Claude Code keeps its working copies of this repository under .claude/worktrees.
    // Each one carries the whole test suite, so without this the local run picks up
    // every old copy as well — minutes of work and failures from stale fixtures.
    exclude: [...configDefaults.exclude, '.claude/**'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts', 'src/domain/index.ts', 'src/domain/types.ts'],
      // Medical calculations: keep the bar high.
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
