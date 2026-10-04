import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../Database/client.ts'
import { account, session, user, verification } from '../Database/schemas/auth.ts'
import { sendMail } from '../Mail/client.ts'
import { getBaseUrl } from '../Utils/getBaseUrl.ts'
import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins/magic-link'
import { SIGN_IN_LINK_TTL_MINUTES, signInMail } from './signInMail.ts'

const baseUrl = getBaseUrl()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  baseURL: baseUrl,
  trustedOrigins: () => [new URL(baseUrl).origin],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    magicLink({
      expiresIn: SIGN_IN_LINK_TTL_MINUTES * 60,
      sendMagicLink: async ({ email, url }) => {
        await sendMail(signInMail({ email, url }))
      },
    }),
  ],
})
