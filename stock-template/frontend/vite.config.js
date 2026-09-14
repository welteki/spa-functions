import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Must match the gateway mount path (/function/<name>) or asset URLs 404.
  // Set VITE_BASE_PATH when building for a deploy; '/' is fine for local dev.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://127.0.0.1:3005',
    },
  },
  build: {
    emptyOutDir: true,
    outDir: '../static',
  },
})
