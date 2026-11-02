import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../Database/client.ts'
import { account, session, user, verification } from '../Database/schemas/auth.ts'
import { sendMail } from '../Mail/client.ts'
import { getBaseUrl } from '../Utils/getBaseUrl.ts'
import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { SIGN_IN_CODE_TTL_MINUTES } from '../../../shared/signIn.ts'
import { logError } from '../Utils/logging.ts'
import { signInMail } from './signInMail.ts'

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
  advanced: {
    ipAddress: {
      // Production sits behind a reverse proxy, so the socket address is the proxy's.
      ipAddressHeaders: ['x-forwarded-for'],
    },
  },
  plugins: [
    emailOTP({
      expiresIn: SIGN_IN_CODE_TTL_MINUTES * 60,
      storeOTP: 'hashed',
      sendVerificationOTP: async ({ email, otp, type }) => {
        // The endpoint also takes other types, and this mail says sign-in.
        if (type !== 'sign-in') {
          return
        }

        // Not awaited: the plugin awaits this function unless a global background
        // handler is set, and the time a send takes must not show in the response.
        void sendMail(signInMail({ email, code: otp })).catch((error: unknown) => {
          logError({ feature: 'Auth', message: 'sign-in code could not be sent', additional: error })
        })
      },
    }),
  ],
})
