import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../Database/client.ts'
import { account, session, user, verification } from '../Database/schemas/auth.ts'
import { sendMail } from '../Mail/client.ts'
import { logInfo } from '../Utils/logging.ts'
import { getHost } from '../Utils/getHost.ts'
import { getBaseUrl } from '../Utils/getBaseUrl.ts'

const FEATURE = 'libs/Auth auth'

export const auth = betterAuth({
  emailAndPassword: {
    disableSignUp: true,
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        recipients: [user.email],
        subject: 'Passwort zurücksetzen',
        text: `Klick auf den Link, um dein Passwort zurückzusetzen: ${url}`,
      })
    },
    onPasswordReset: async ({ user }) => {
      logInfo({
        feature: FEATURE,
        message: 'User password has been reset.',
        additional: {
          userEmail: user.email,
        },
      })
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendMail({
          recipients: [user.email],
          subject: 'E-Mail-Änderung bestätigen',
          text: `Klick auf den Link, um die Änderung zu ${newEmail} zu bestätigen: ${url}`,
        })
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        recipients: [user.email],
        subject: 'Neue E-Mail bestätigen',
        text: `Klick auf den Link, um deine E-Mail zu bestätigen: ${url}`,
      })
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  baseURL: getBaseUrl(),
  trustedOrigins: () => {
    return [getHost()]
  },
})
