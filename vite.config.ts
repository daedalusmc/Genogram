import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site under /<repo>/ — match that for asset URLs.
// Override with the BASE_PATH env var (e.g. set to "/" for root-domain hosting).
const base = process.env.BASE_PATH ?? '/Genogram/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
