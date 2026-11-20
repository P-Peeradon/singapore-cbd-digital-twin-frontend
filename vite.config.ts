import vue from '@vitejs/plugin-vue'
import path from 'path';
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/compute': { 
        target: 'http://localhost:8000', 
        changeOrigin: true, 
        rewrite: (path) => path.replace(/^\/compute/, ''), }
    }
  }
})
