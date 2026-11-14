import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
const nodeModules = fileURLToPath(new URL('./node_modules', import.meta.url))

export default defineConfig({
  plugins: [react()],
  // The theme/cn helpers live in the repo-root shared/ dir (single source).
  // Bare imports inside shared/ must point at this app's node_modules.
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}` },
      { find: /^react$/, replacement: `${nodeModules}/react` },
      { find: /^react\/(.*)$/, replacement: `${nodeModules}/react/$1` },
      { find: /^clsx$/, replacement: `${nodeModules}/clsx` },
      { find: /^tailwind-merge$/, replacement: `${nodeModules}/tailwind-merge` },
    ],
  },
  server: { fs: { allow: ['..'] } },
})
