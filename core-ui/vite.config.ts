import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'styled-components': 'styled-components',
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/v1': {
        target: 'http://api:8000',
        changeOrigin: true,
      }
    },
  }
})
