import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/static/',
  server: {
    proxy: {
      '/save-note': 'http://127.0.0.1:5000',
      '/get-notes': 'http://127.0.0.1:5000',
      '/static': 'http://127.0.0.1:5000'
    }
  }
})
