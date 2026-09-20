import { defineConfig } from 'nitro'

export default defineConfig({
  serverDir: './server',
  imports: {},
  experimental: {
    typescriptBundlerResolution: true,
  },
})
