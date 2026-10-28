import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In development the API is reached through same-origin "/api", so auth cookies just work.
  server: { proxy: { '/api': 'http://localhost:5000' } },
})
