import { defineConfig } from 'vitest/config'

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
    // One project, no DOM. A test earns its place by covering business logic or
    // genuinely complex state; rendering is left to the type checker and to review.
    name: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'app/**/*.test.ts'],
    environment: 'node',
    watch: false,
  },
})
