import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@yasc/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@yasc/utils': resolve(__dirname, '../../packages/utils/src/index.ts'),
      '@yasc/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@yasc/types', '@yasc/utils', '@yasc/ui'],
  },
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/apps/api/**',
        '**/apps/mobile/**',
        '**/.git/**',
        '**/dist/**',
        '**/infra/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
