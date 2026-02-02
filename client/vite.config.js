import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin-new/', // Base path for production deployment
  build: {
    outDir: '../public/admin-new',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Needed for Docker
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/wh': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true
      },
      '/docs': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
