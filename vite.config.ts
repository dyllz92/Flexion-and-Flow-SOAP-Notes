import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'node20',
    ssr: true,
    outDir: 'dist',
    rollupOptions: {
      input: 'src/server.ts',
      output: {
        format: 'esm',
        entryFileNames: 'server.js'
      },
      // Don't bundle Node.js built-ins or native modules
      external: [
        'node:path', 'node:fs', 'node:os', 'node:crypto',
        'path', 'fs', 'os', 'crypto',
        'better-sqlite3',
        '@hono/node-server',
        '@hono/node-server/serve-static'
      ]
    }
  }
})
