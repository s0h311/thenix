import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

/** Any Postgres drizzle client — node-postgres in the app, PGlite under test. */
export type Database = PgDatabase<PgQueryResultHKT>
