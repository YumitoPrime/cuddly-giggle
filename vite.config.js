import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ IMPORTANT: Remplacez 'YOUR_REPO_NAME' par le nom réel de votre dépôt GitHub
// Exemple: base: '/stop-before-the-word/'
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPO_NAME/',
})
