import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@store': path.resolve(__dirname, './src/store'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      "@documentView": path.resolve(__dirname, './src/features/documentView'),
      '@documentGallery': path.resolve(__dirname, './src/features/documentGallery'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks')
    }
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
