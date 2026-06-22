import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // any request starting with /api gets forwarded to Express
      '/api': 'http://localhost:3001'
    }
  },
  test: {
    globals: true,          // lets you use test(), expect() without importing them
    environment: 'jsdom',   // fake browser environment for component tests
    setupFiles: './src/test/setup.js'
  }
})
