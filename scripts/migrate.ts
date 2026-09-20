import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { connection, db } from '../server/infrastructure/Database/client.ts'

await migrate(db, {
  migrationsFolder: './server/infrastructure/Database/migrations',
})

await connection.end()
