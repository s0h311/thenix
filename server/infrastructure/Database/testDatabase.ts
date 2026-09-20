import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from './types.ts'

/**
 * A real Postgres for tests — PGlite is the Postgres source tree built to wasm, so
 * JSONB, constraints and transactions behave as they do in production. It runs
 * in-process, which keeps `pnpm test` free of a docker dependency.
 *
 * The app's own migrations are applied, so tests run against the shipped schema.
 */
export async function createTestDatabase(): Promise<Database> {
  const database = drizzle(new PGlite())

  await migrate(database, { migrationsFolder: './server/infrastructure/Database/migrations' })

  return database
}
