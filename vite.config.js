import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development, serve the serverless function in api/contact.js (the "Start a project"
// email) from the dev server, with variables from .env / .env.local. In production
// Vercel runs it as a serverless function.
function apiInDev() {
  return {
    name: 'api-in-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
      server.middlewares.use('/api/contact', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/contact.js')
        await handler(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiInDev()],
  build: {
    // three.js is only loaded lazily by the 3D sections; keep it in its own chunk.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three', '@react-three/fiber'] },
      },
    },
  },
})
