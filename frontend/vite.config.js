import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-senfoot.png'],
      manifest: {
        name: 'Sen Foot',
        short_name: 'Sen Foot',
        description: 'Prédictions football par le tracé',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1f2d',
        theme_color: '#0d1f2d',
        icons: [
          { src: '/logo-senfoot.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/logo-senfoot.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'react-dom'
            if (id.includes('react'))     return 'react'
            return 'vendor'
          }
        },
      },
    },
  }
})
