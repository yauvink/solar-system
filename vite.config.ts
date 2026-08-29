import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function omitPublicExr(): Plugin {
  return {
    name: 'omit-public-exr',
    closeBundle() {
      rmSync(resolve(__dirname, 'dist/textures/milky-way/starmap_2020_4k_gal.exr'), {
        force: true,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), omitPublicExr()],
  base: '/solar-system/',
})
