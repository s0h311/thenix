import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

// Only for migrations
export const connection = new pg.Client({
  connectionString: process.env.DATABASE_CONNECTION_STRING,
})

export const db = drizzle(
  new pg.Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
  }),
)
