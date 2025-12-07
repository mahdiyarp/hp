import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = Number(process.env.BACKEND_PORT || process.env.PORT || 8881)
const backend = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: Number(process.env.FRONTEND_PORT || process.env.PORT || 8880),
    strictPort: true,
    // Proxy API requests to the backend (default 8000). Can override with BACKEND_URL env var.
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        secure: false,
        ws: false,
      },
    },
  },
})
