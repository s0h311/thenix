import { defineConfig } from 'nitro'

export default defineConfig({
  serverDir: './server',
  imports: {},
  routeRules: {
    // Browsers must always revalidate the worker, or they would miss new versions.
    '/sw.js': { headers: { 'cache-control': 'no-cache' } },
  },
  experimental: {
    typescriptBundlerResolution: true,
  },
})
