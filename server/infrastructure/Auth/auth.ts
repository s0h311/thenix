import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../Database/client.ts'
import { account, session, user, verification } from '../Database/schemas/auth.ts'
import { sendMail } from '../Mail/client.ts'
import { getBaseUrl } from '../Utils/getBaseUrl.ts'
import { createAuth } from './createAuth.ts'

export const auth = createAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  sendMail,
  baseUrl: getBaseUrl(),
})
