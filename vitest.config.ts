import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
    },
  },
  // Prevent Vite from trying to load the project's PostCSS/Tailwind config when running tests
  css: {
    postcss: {},
  },
})