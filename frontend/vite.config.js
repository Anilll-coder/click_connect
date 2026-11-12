import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: "0.0.0.0",
    // Read PORT in Node instead of the shell so `npm run dev` works on
    // Windows (PowerShell/cmd) as well as bash. Falls back to 5173.
    port: Number(process.env.PORT) || 5173,
    allowedHosts: true,
  },
})
