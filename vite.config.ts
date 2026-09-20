import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const IS_TEST = process.env['NODE_ENV'] === 'test'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'app',
      router: {
        routesDirectory: 'pages',
        generatedRouteTree: 'routeTree.gen.ts',
      },
      importProtection: {
        client: {
          files: ['server/**/*'],
          excludeFiles: ['server/api/actions/**/*'],
        },
      },
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
    ...(IS_TEST ? [] : [nitro()]), // TODO temporary, see https://github.com/nitrojs/nitro/issues/3659
  ],
})
