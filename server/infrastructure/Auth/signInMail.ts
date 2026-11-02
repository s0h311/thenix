import { SIGN_IN_CODE_TTL_MINUTES } from '../../../shared/signIn.ts'
import { EMAIL_FOOTER } from '../Mail/consts.ts'
import type { MailData } from '../Mail/types.ts'

type SignInCode = {
  email: string
  code: string
}

export function signInMail({ email, code }: SignInCode): MailData {
  return {
    recipients: [email],
    subject: `${code} is your thenix sign-in code`,
    text: `${code}

It works once and expires in ${SIGN_IN_CODE_TTL_MINUTES} minutes. If you did not ask to sign in, ignore this mail.

${EMAIL_FOOTER}`,
  }
}
