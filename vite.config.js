import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the static build works from any sub-path
  // (e.g. a GitHub Pages project site) with no server config.
  base: './',
})
