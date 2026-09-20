import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [],
  test: {
    reporters: ['agent'],
    env: {
      ENVIRONMENT: 'vitest',
      SERVER_HOST: 'vitest',
    },
    projects: [
      {
        test: {
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          include: ['app/**/*.test.ts'],
          browser: {
            provider: playwright(),
            enabled: true,
            // at least one instance is required
            // instances: [{ browser: 'chromium' }],
            headless: true,
          },
        },
      },
    ],
    watch: false,
  },
})
