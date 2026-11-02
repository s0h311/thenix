import { describe, expect, test } from 'vitest'
import {
  answered,
  awaitingAnswer,
  checkOutcome,
  differentEmail,
  screenOf,
  sendOutcome,
  startSigningIn,
} from './signingIn.ts'
import type { SigningIn } from './signingIn.ts'

const onCodeStep = () => answered(awaitingAnswer(startSigningIn, 'athlete@example.com'), 'sent')
const newCode = (state: SigningIn) => answered(awaitingAnswer(state, 'athlete@example.com'), 'sent')
const wrongTry = (state: SigningIn) => answered(state, checkOutcome({ status: 400, reason: 'INVALID_OTP' }))

describe('asking for a code', () => {
  test('starts on the email step, with the button ready', () => {
    expect(screenOf(startSigningIn)).toMatchObject({ at: 'email', button: 'Send me a code', busy: false, said: null })
  })

  test('shows it is sending and takes no second tap', () => {
    expect(screenOf(awaitingAnswer(startSigningIn, 'athlete@example.com'))).toMatchObject({
      at: 'email',
      button: 'Sending…',
      busy: true,
    })
  })

  test('moves on to the code step once it is sent, naming the address it went to', () => {
    expect(screenOf(onCodeStep())).toMatchObject({
      at: 'code',
      heading: 'Enter the code sent to athlete@example.com',
      next: 'typeCode',
      busy: false,
      said: null,
    })
  })

  test('that could not be sent stays on the email step and says to try again', () => {
    const failed = answered(awaitingAnswer(startSigningIn, 'athlete@example.com'), sendOutcome({ status: 500 }))

    expect(screenOf(failed)).toMatchObject({
      at: 'email',
      button: 'Send me a code',
      busy: false,
      said: 'That code could not be sent. Try again.',
    })
  })

  test('no signal at all is a send that failed, not a screen stuck on Sending…', () => {
    expect(sendOutcome({ status: null })).toBe('sendFailed')
  })

  test('rate limited says to wait, then retry', () => {
    const limited = answered(awaitingAnswer(startSigningIn, 'athlete@example.com'), sendOutcome({ status: 429 }))

    expect(screenOf(limited)).toMatchObject({
      at: 'email',
      said: 'Too many tries just now. Wait a minute, then try again.',
    })
  })

  test('a send the server took is simply sent', () => {
    expect(sendOutcome(null)).toBe('sent')
  })
})

describe('typing the code', () => {
  test('a right one signs the athlete in', () => {
    expect(screenOf(answered(onCodeStep(), checkOutcome(null))).at).toBe('signedIn')
  })

  test('a wrong one says so and asks for another go, so one typo does not end the attempt', () => {
    expect(screenOf(wrongTry(onCodeStep()))).toMatchObject({
      at: 'code',
      next: 'tryAgain',
      said: 'That code is not right. Check it and try again.',
    })
  })

  test('an expired one says so and only a new code is offered, because that one is gone', () => {
    const expired = answered(onCodeStep(), checkOutcome({ status: 400, reason: 'OTP_EXPIRED' }))

    expect(screenOf(expired)).toMatchObject({
      at: 'code',
      next: 'sendNew',
      said: 'That code has expired. Send a new code.',
    })
  })

  test('too many tries from the server says to ask for a new code, because that one is gone too', () => {
    const spent = answered(onCodeStep(), checkOutcome({ status: 403, reason: 'TOO_MANY_ATTEMPTS' }))

    expect(screenOf(spent)).toMatchObject({
      at: 'code',
      next: 'sendNew',
      said: 'That code was wrong too many times. Send a new code.',
    })
  })

  test('rate limited says to wait, and the code is still good for when the wait is over', () => {
    const limited = answered(onCodeStep(), checkOutcome({ status: 429 }))

    expect(screenOf(limited)).toMatchObject({
      at: 'code',
      next: 'wait',
      said: 'Too many tries just now. Wait a minute, then try again.',
    })
  })

  test('no signal is not blamed on the code', () => {
    const lost = answered(onCodeStep(), checkOutcome({ status: null }))

    expect(screenOf(lost)).toMatchObject({
      at: 'code',
      next: 'tryAgain',
      said: 'That code could not be checked. Try again.',
    })
  })
})

describe('wrong tries on one code', () => {
  test('the second still offers another go', () => {
    expect(screenOf(wrongTry(wrongTry(onCodeStep())))).toMatchObject({ next: 'tryAgain' })
  })

  test('the third says to ask for a new code, because a fourth could only be refused', () => {
    expect(screenOf(wrongTry(wrongTry(wrongTry(onCodeStep()))))).toMatchObject({
      at: 'code',
      next: 'sendNew',
      said: 'That code was wrong too many times. Send a new code.',
    })
  })

  test('start over on a new code', () => {
    const twoThenNew = newCode(wrongTry(wrongTry(onCodeStep())))

    expect(screenOf(wrongTry(wrongTry(twoThenNew)))).toMatchObject({ next: 'tryAgain' })
    expect(screenOf(wrongTry(wrongTry(wrongTry(twoThenNew))))).toMatchObject({ next: 'sendNew' })
  })

  test('do not start over on a new code that was never sent, because the old one still stands', () => {
    const twoThenFailed = answered(
      awaitingAnswer(wrongTry(wrongTry(onCodeStep())), 'athlete@example.com'),
      'sendFailed',
    )

    expect(screenOf(wrongTry(twoThenFailed))).toMatchObject({ next: 'sendNew' })
  })

  test('do not count a check that never reached an answer about the code', () => {
    const lost = answered(wrongTry(wrongTry(onCodeStep())), checkOutcome({ status: null }))

    expect(screenOf(lost)).toMatchObject({ next: 'tryAgain' })
  })

  test('start over on a different email', () => {
    const next = answered(awaitingAnswer(differentEmail(wrongTry(wrongTry(onCodeStep()))), 'other@example.com'), 'sent')

    expect(screenOf(wrongTry(next))).toMatchObject({ next: 'tryAgain' })
  })
})

describe('asking for a new code', () => {
  test('says only the newest code works, once one has been resent', () => {
    expect(screenOf(onCodeStep())).toMatchObject({ at: 'code', onlyNewest: false })
    expect(screenOf(newCode(onCodeStep()))).toMatchObject({
      at: 'code',
      lifetime: 'It works once and expires in 10 minutes.',
      onlyNewest: true,
      said: null,
    })
  })

  test('keeps saying so after a wrong try, because an older email is the likely mistake', () => {
    expect(screenOf(wrongTry(newCode(onCodeStep())))).toMatchObject({ onlyNewest: true })
  })

  test('brings the field back after a code that was gone', () => {
    const expired = answered(onCodeStep(), 'expired')

    expect(screenOf(newCode(expired))).toMatchObject({ next: 'typeCode' })
  })

  test('that could not be sent stays on the code step and points at sending again', () => {
    const failed = answered(awaitingAnswer(onCodeStep(), 'athlete@example.com'), 'sendFailed')

    expect(screenOf(failed)).toMatchObject({
      at: 'code',
      next: 'retry',
      said: 'That code could not be sent. Try again.',
    })
  })

  test('while on its way, a code that was gone stays gone: the field does not flash back', () => {
    const expired = answered(onCodeStep(), 'expired')

    expect(screenOf(awaitingAnswer(expired, 'athlete@example.com'))).toMatchObject({ next: 'sendNew', busy: true })
  })

  test('that failed or was limited, a code that was gone still only offers a new one', () => {
    const expired = answered(onCodeStep(), 'expired')

    expect(screenOf(answered(expired, 'sendFailed'))).toMatchObject({
      next: 'sendNew',
      said: 'That code could not be sent. Try again.',
    })
    expect(screenOf(answered(expired, 'rateLimited'))).toMatchObject({
      next: 'sendNew',
      said: 'Too many tries just now. Wait a minute, then try again.',
    })
  })
})

describe('using a different email', () => {
  test('returns to the email step with what was typed, so it can be fixed', () => {
    const back = differentEmail(onCodeStep())

    expect(screenOf(back)).toMatchObject({ at: 'email', busy: false, said: null })
    expect(back.email).toBe('athlete@example.com')
  })

  test('forgets that a code was resent: the next address starts clean', () => {
    const next = answered(awaitingAnswer(differentEmail(newCode(onCodeStep())), 'other@example.com'), 'sent')

    expect(screenOf(next)).toMatchObject({
      heading: 'Enter the code sent to other@example.com',
      onlyNewest: false,
    })
  })
})

describe('the lifetime the page quotes', () => {
  test('is the ten minutes the code lasts', () => {
    expect(screenOf(onCodeStep())).toMatchObject({ lifetime: 'It works once and expires in 10 minutes.' })
  })
})
