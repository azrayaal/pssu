import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Served from the domain root; the SPA fallback lives in vercel.json.
  base: '/',
  resolve: {
    alias: {
      // fileURLToPath decodes escapes that a raw .pathname would leave in place.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
})
