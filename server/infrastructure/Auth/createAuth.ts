import { betterAuth } from 'better-auth'
import type { BetterAuthOptions } from 'better-auth'
import { magicLink } from 'better-auth/plugins/magic-link'
import type { MailData } from '../Mail/types.ts'
import { SIGN_IN_LINK_TTL_MINUTES, signInMail } from './signInMail.ts'

type Dependencies = {
  database: BetterAuthOptions['database']
  sendMail: (mail: MailData) => Promise<unknown>
  baseUrl: string
}

/**
 * The only way in is an email address: requesting a link registers and signs in
 * with the same tap, so there is no password and no separate registration.
 */
export function createAuth({ database, sendMail, baseUrl }: Dependencies) {
  return betterAuth({
    database,
    baseURL: baseUrl,
    trustedOrigins: () => [new URL(baseUrl).origin],
    // A training log is opened mid-workout, with sweaty hands. Thirty days of
    // session, refreshed on every visit, keeps the sign-in out of the way.
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
}
