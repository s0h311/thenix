import { EMAIL_FOOTER } from '../Mail/consts.ts'
import type { MailData } from '../Mail/types.ts'

/** How long a requested link stays usable. The copy below quotes it, so they move together. */
export const SIGN_IN_LINK_TTL_MINUTES = 15

type SignInLink = {
  email: string
  url: string
}

export function signInMail({ email, url }: SignInLink): MailData {
  return {
    recipients: [email],
    subject: 'Your sign-in link for thenix',
    text: `Tap the link to sign in:

${url}

The link works once and expires in ${SIGN_IN_LINK_TTL_MINUTES} minutes. If you did not ask to sign in, ignore this mail.

${EMAIL_FOOTER}`,
  }
}
