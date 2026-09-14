import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: 'auto',
        manifest: {
          name: 'PULSO · Espacio de trabajo',
          short_name: 'PULSO',
          lang: 'es-AR',
          description: 'La memoria compartida de nuestro equipo',
          theme_color: '#10182c',
          background_color: '#f5f6fa',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        injectManifest: { globPatterns: ['**/*.{js,css,html,png,woff2,svg}'] },
      }),
    ],
    server: { port: 5173, fs: { deny: ['**/.env*', '**/.qa/**', '**/.git/**', '**/.secrets/**'] } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
