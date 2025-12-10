import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Budget Tracker',
        short_name: 'Budget Tracker',
        description: 'Budget Tracker Baihaqi',
        theme_color: '#ffffff',
        display: 'standalone', // Ini yang bikin dia kayak aplikasi native
        icons: [
          {
            src: '/vite.svg', // Gunakan icon default vite dulu untuk tes
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})