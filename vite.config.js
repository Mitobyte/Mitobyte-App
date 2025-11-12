import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://mitobyte-voting.pages.dev',
        changeOrigin: true,
        secure: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      // Use injectManifest strategy for custom service worker with push notifications
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],

      // Inject manifest configuration
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        minify: true,
        sourcemap: true
      },

      // Dev options - enable service worker in development
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      },

      // Use the manifest.json from public folder
      manifest: false, // Use public/manifest.json instead
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React-DOM into separate chunk
          react: ['react', 'react-dom'],
          // Split Framer Motion into separate chunk (likely the largest dependency)
          'framer-motion': ['framer-motion'],
          // Split Crossmint SDK into separate chunk
          crossmint: ['@crossmint/client-sdk-react-ui'],
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase warning limit to 1000 kB
  }
})
