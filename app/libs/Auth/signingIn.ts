import { SIGN_IN_CODE_TTL_MINUTES, SIGN_IN_CODE_WRONG_TRIES } from '../../../shared/signIn.ts'

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

/**
 * A call that did not succeed. `status: null` is the request never completing at all, and
 * `reason` is what the plugin says about the Sign-in code, when it says anything.
 */
export type Failure = Readonly<{ status: number | null; reason?: string | undefined }>

export type SigningIn = Readonly<{
  step: 'email' | 'code' | 'signedIn'
  email: string
  waiting: boolean
  /** A new code was sent after the first, so any older email is now no use. */
  resent: boolean
  /** The code on its way out is spent or expired, so typing it can only fail. */
  codeGone: boolean
  /** How many times the server has called the current code wrong. */
  wrongTries: number
  outcome: Outcome | null
}>

export const startSigningIn: SigningIn = {
  step: 'email',
  email: '',
  waiting: false,
  resent: false,
  codeGone: false,
  wrongTries: 0,
  outcome: null,
}

/** The shape both calls answer in: nothing wrong, a rate limit, or their own kind of failure. */
function outcomeOf(
  failure: Failure | null,
  { success, ownFailure }: { success: Outcome; ownFailure: (failure: Failure) => Outcome },
): Outcome {
  if (failure === null) {
    return success
  }

  return failure.status === 429 ? 'rateLimited' : ownFailure(failure)
}

export function sendOutcome(failure: Failure | null): Outcome {
  return outcomeOf(failure, { success: 'sent', ownFailure: () => 'sendFailed' })
}

/**
 * Anything but the three reasons the plugin gives about the code itself is not the
 * code's fault, and must not read as a typo: the gym losing signal mid-check would
 * otherwise tell the athlete the right code was wrong.
 */
export function checkOutcome(failure: Failure | null): Outcome {
  return outcomeOf(failure, {
    success: 'signedIn',
    ownFailure: ({ reason }) => {
      switch (reason) {
        case 'INVALID_OTP':
          return 'wrongCode'
        case 'OTP_EXPIRED':
          return 'expired'
        case 'TOO_MANY_ATTEMPTS':
          return 'tooManyTries'
        default:
          return 'checkFailed'
      }
    },
  })
}

/** A code asked for, or a typed one on its way to be checked: either way, no second tap. */
export function awaitingAnswer(state: SigningIn, email: string): SigningIn {
  return { ...state, email, waiting: true, outcome: null }
}

/**
 * The plugin answers INVALID_OTP to the last wrong try it allows and TOO_MANY_ATTEMPTS only
 * to the one after, so wrong tries are counted here: otherwise the last "try again" offers a
 * code that is already dead. TOO_MANY_ATTEMPTS still stands for when this count is behind.
 */
export function answered(state: SigningIn, outcome: Outcome): SigningIn {
  const settled = { ...state, waiting: false, outcome }

  switch (outcome) {
    case 'sent':
      return {
        ...settled,
        step: 'code',
        resent: state.step === 'code',
        codeGone: false,
        wrongTries: 0,
        outcome: null,
      }
    case 'wrongCode': {
      const wrongTries = state.wrongTries + 1

      return wrongTries < SIGN_IN_CODE_WRONG_TRIES
        ? { ...settled, wrongTries }
        : { ...settled, wrongTries, codeGone: true, outcome: 'tooManyTries' }
    }
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

/** What the code step offers next. `retry` is sending again, and `tryAgain` is typing again. */
export type Next = 'typeCode' | 'tryAgain' | 'retry' | 'sendNew' | 'wait'

/** The wording and the offer side by side, so they cannot drift apart. */
const ANSWERS: Partial<Record<Outcome, Readonly<{ said: string; next: Next }>>> = {
  sendFailed: { said: 'That code could not be sent. Try again.', next: 'retry' },
  wrongCode: { said: 'That code is not right. Check it and try again.', next: 'tryAgain' },
  checkFailed: { said: 'That code could not be checked. Try again.', next: 'tryAgain' },
  expired: { said: 'That code has expired. Send a new code.', next: 'sendNew' },
  tooManyTries: { said: 'That code was wrong too many times. Send a new code.', next: 'sendNew' },
  rateLimited: { said: 'Too many tries just now. Wait a minute, then try again.', next: 'wait' },
}

/**
 * On the email step there is only the one button to offer, so only the code step says
 * what is next. A code that is gone settles it whatever else went wrong: typing it can
 * only fail, so a new code is the one thing left, even while that is what is failing.
 */
export type SigningInScreen =
  | Readonly<{ at: 'email'; button: string; busy: boolean; said: string | null }>
  | Readonly<{
      at: 'code'
      heading: string
      lifetime: string
      onlyNewest: boolean
      next: Next
      busy: boolean
      said: string | null
    }>
  | Readonly<{ at: 'signedIn' }>

export function screenOf(state: SigningIn): SigningInScreen {
  const answer = state.outcome === null ? undefined : ANSWERS[state.outcome]
  const said = answer?.said ?? null

  if (state.step === 'signedIn') {
    return { at: 'signedIn' }
  }

  if (state.step === 'email') {
    return { at: 'email', button: state.waiting ? 'Sending…' : 'Send me a code', busy: state.waiting, said }
  }

  return {
    at: 'code',
    heading: `Enter the code sent to ${state.email}`,
    lifetime: `It works once and expires in ${SIGN_IN_CODE_TTL_MINUTES} minutes.`,
    onlyNewest: state.resent,
    next: state.codeGone ? 'sendNew' : (answer?.next ?? 'typeCode'),
    busy: state.waiting,
    said,
  }
}
