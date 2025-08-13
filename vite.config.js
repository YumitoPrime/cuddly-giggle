import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cuddly-giggle/',   // ← IMPORTANT : le nom exact de ton repo
})
