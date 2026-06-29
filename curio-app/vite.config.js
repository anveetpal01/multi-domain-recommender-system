import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the production build also opens directly from the
  // file system (double-click dist/index.html) — not just from a server.
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
})
