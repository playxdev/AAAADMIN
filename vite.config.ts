import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // AAAAPI: npm run dev (wrangler dev)
        changeOrigin: true,
      },
    },
  },
})