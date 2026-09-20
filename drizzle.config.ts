import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./server/infrastructure/Database/schemas/public.ts'],
  out: './server/infrastructure/Database/migrations',
  dbCredentials: {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    url: process.env.DATABASE_CONNECTION_STRING!,
  },
})
