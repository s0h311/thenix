import { SIGN_IN_CODE_TTL_MINUTES } from '../../../shared/signIn.ts'

/**
 * What became of asking for a code or typing one, in the answers it can actually
 * be. They are told apart because the athlete can do something different about each:
 * a typo is typed again, a code that is gone needs a new one, and a rate limit is
 * only waited out.
 */
export type Outcome =
  | 'sent'
  | 'sendFailed'
  | 'wrongCode'
  | 'expired'
  | 'tooManyTries'
  | 'rateLimited'
  | 'checkFailed'
  | 'signedIn'

/** A call that did not succeed. `status: null` is the request never completing at all. */
export type Failure = Readonly<{ status: number | null; code?: string }>

export type SigningIn = Readonly<{
  step: 'email' | 'code' | 'signedIn'
  email: string
  waiting: boolean
  /** A new code was sent after the first, so any older email is now no use. */
  resent: boolean
  /** The code on its way out is spent or expired, so typing it can only fail. */
  codeGone: boolean
  outcome: Outcome | null
}>

export const startSigningIn: SigningIn = {
  step: 'email',
  email: '',
  waiting: false,
  resent: false,
  codeGone: false,
  outcome: null,
}

export function sendOutcome(failure: Failure | null): Outcome {
  if (failure === null) {
    return 'sent'
  }

  return failure.status === 429 ? 'rateLimited' : 'sendFailed'
}

/**
 * Anything but the three codes the plugin answers about the code itself is not the
 * code's fault, and must not read as a typo: the gym losing signal mid-check would
 * otherwise tell the athlete the right code was wrong.
 */
export function checkOutcome(failure: Failure | null): Outcome {
  if (failure === null) {
    return 'signedIn'
  }

  if (failure.status === 429) {
    return 'rateLimited'
  }

  switch (failure.code) {
    case 'INVALID_OTP':
      return 'wrongCode'
    case 'OTP_EXPIRED':
      return 'expired'
    case 'TOO_MANY_ATTEMPTS':
      return 'tooManyTries'
    default:
      return 'checkFailed'
  }
}

/** A code asked for, or a typed one on its way to be checked: either way, no second tap. */
export function asked(state: SigningIn, email: string): SigningIn {
  return { ...state, email, waiting: true, outcome: null }
}

export function answered(state: SigningIn, outcome: Outcome): SigningIn {
  const settled = { ...state, waiting: false, outcome }

  switch (outcome) {
    case 'sent':
      return { ...settled, step: 'code', resent: state.step === 'code', codeGone: false, outcome: null }
    case 'expired':
    case 'tooManyTries':
      return { ...settled, codeGone: true }
    case 'signedIn':
      return { ...settled, step: 'signedIn' }
    default:
      return settled
  }
}

export function differentEmail(state: SigningIn): SigningIn {
  return { ...startSigningIn, email: state.email }
}

/** What the next thing to do is, so the wording and the offer cannot drift apart. */
export type Alert = Readonly<{ said: string; next: 'retry' | 'tryAgain' | 'sendNew' | 'wait' }>

function alertOf(outcome: Outcome | null): Alert | null {
  switch (outcome) {
    case 'sendFailed':
      return { said: 'That code could not be sent. Try again.', next: 'retry' }
    case 'wrongCode':
      return { said: 'That code is not right. Check it and try again.', next: 'tryAgain' }
    case 'checkFailed':
      return { said: 'That code could not be checked. Try again.', next: 'tryAgain' }
    case 'expired':
      return { said: 'That code has expired. Send a new code.', next: 'sendNew' }
    case 'tooManyTries':
      return { said: 'That code was wrong too many times. Send a new code.', next: 'sendNew' }
    case 'rateLimited':
      return { said: 'Too many tries just now. Wait a minute, then try again.', next: 'wait' }
    default:
      return null
  }
}

export type SigningInScreen =
  | Readonly<{ at: 'email'; button: string; busy: boolean; alert: Alert | null }>
  | Readonly<{
      at: 'code'
      heading: string
      lifetime: string
      onlyNewest: boolean
      takesCode: boolean
      busy: boolean
      alert: Alert | null
    }>
  | Readonly<{ at: 'signedIn' }>

export function screenOf(state: SigningIn): SigningInScreen {
  const alert = alertOf(state.outcome)

  if (state.step === 'signedIn') {
    return { at: 'signedIn' }
  }

  if (state.step === 'email') {
    return { at: 'email', button: state.waiting ? 'Sending…' : 'Send me a code', busy: state.waiting, alert }
  }

  return {
    at: 'code',
    heading: `Enter the code sent to ${state.email}`,
    lifetime: `It works once and expires in ${SIGN_IN_CODE_TTL_MINUTES} minutes.`,
    onlyNewest: state.resent,
    takesCode: !state.codeGone,
    busy: state.waiting,
    alert,
  }
}
