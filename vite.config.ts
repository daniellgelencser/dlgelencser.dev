import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { load } from 'js-yaml'
import { readFileSync } from 'fs'

// Vite plugin: transform *.yaml / *.yml imports into JS objects
function yamlPlugin() {
  return {
    name: 'vite-plugin-yaml',
    transform(_code: string, id: string) {
      if (!id.endsWith('.yaml') && !id.endsWith('.yml')) return null
      const raw = readFileSync(id, 'utf-8')
      const data = load(raw)
      return { code: `export default ${JSON.stringify(data)}`, map: null }
    },
  }
}

export default defineConfig({
  plugins: [react(), yamlPlugin()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
