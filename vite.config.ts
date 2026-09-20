import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/*
 * Da dove viene servita l'app.
 *
 * Su GitHub Pages un progetto sta dentro una sottocartella col nome del
 * deposito (`/Field_Log/`); su Cloudflare Pages, Netlify o un dominio proprio
 * sta invece alla radice. Si decide con una variabile d'ambiente, così lo
 * stesso codice va bene in tutti e due i casi senza toccare niente.
 */
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,

  /*
   * In ascolto su tutta la rete locale, non solo su questo computer: serve per
   * aprire l'app dal telefono mentre la si prova.
   *
   * Attenzione, e non è un dettaglio: su `http://` — cioè da indirizzo di rete
   * locale — il browser del telefono **blocca fotocamera, microfono, posizione
   * e installazione**. Funzionano solo su `localhost` o su `https://`.
   * Per provare la lettura dei documenti e le note vocali serve un indirizzo
   * https (vedi README, "Provare dal telefono").
   */
  server: { host: true },
  preview: { host: true },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Quaderno di Campagna',
        short_name: 'Quaderno',
        description: 'Registro di campagna offline per aziende agricole',
        theme_color: '#1b5e20',
        background_color: '#f5f3ee',
        display: 'standalone',
        orientation: 'portrait',
        // Devono seguire la sottocartella, altrimenti l'icona sulla schermata
        // Home apre una pagina vuota.
        start_url: base,
        scope: base,
        id: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tutto l'applicativo deve essere disponibile senza rete: in campo non c'è.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: base + 'index.html',
        // I file della lingua di Tesseract sono grossi: si tengono da parte la
        // prima volta, e da lì in poi la lettura funziona anche senza rete.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@packs': fileURLToPath(new URL('./src/packs', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    },
  },
})
