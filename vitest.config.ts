import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [],
  test: {
    reporters: ['agent'],
    env: {
      ENVIRONMENT: 'vitest',
      SERVER_HOST: 'vitest',
      MAIL_SMTP_HOST: 'vitest',
      MAIL_SMTP_USER: 'vitest',
      MAIL_SMTP_PASSWORD: 'vitest',
      MAIL_FROM_NAME: 'vitest',
      MAIL_FROM_ADDRESS: 'vitest',
    },
    projects: [
      {
        test: {
          // App tests that need no DOM (design tokens, pure helpers) run here as .test.ts;
          // anything that renders is .test.tsx and runs in the browser project below.
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'app/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          include: ['app/**/*.test.tsx'],
          browser: {
            provider: playwright(),
            enabled: true,
            // at least one instance is required
            instances: [{ browser: 'chromium' }],
            headless: true,
          },
        },
      },
    ],
    watch: false,
  },
})
