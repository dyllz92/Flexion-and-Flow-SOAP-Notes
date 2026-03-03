import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      build: {
        outDir: 'dist/static',
        rollupOptions: {
          input: './src/client.ts',
          output: {
            entryFileNames: 'client.js'
          }
        }
      }
    }
  }
  
  return {
    plugins: [
      build(),
      devServer({
        adapter,
        entry: 'src/index.tsx'
      })
    ]
  }
})
