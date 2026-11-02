import { describe, expect, test } from 'vitest'
import { answered, asked, checkOutcome, differentEmail, screenOf, sendOutcome, startSigningIn } from './signingIn.ts'

const onCodeStep = () => answered(asked(startSigningIn, 'athlete@example.com'), 'sent')

describe('asking for a code', () => {
  test('starts on the email step, with the button ready', () => {
    expect(screenOf(startSigningIn)).toMatchObject({ at: 'email', button: 'Send me a code', busy: false, alert: null })
  })

  test('shows it is sending and takes no second tap', () => {
    expect(screenOf(asked(startSigningIn, 'athlete@example.com'))).toMatchObject({
      at: 'email',
      button: 'Sending…',
      busy: true,
    })
  })

  test('moves on to the code step once it is sent, naming the address it went to', () => {
    expect(screenOf(onCodeStep())).toMatchObject({
      at: 'code',
      heading: 'Enter the code sent to athlete@example.com',
      takesCode: true,
      busy: false,
      alert: null,
    })
  })

  test('that could not be sent stays on the email step and offers a retry', () => {
    const failed = answered(asked(startSigningIn, 'athlete@example.com'), sendOutcome({ status: 500 }))

    expect(screenOf(failed)).toMatchObject({
      at: 'email',
      button: 'Send me a code',
      busy: false,
      alert: { said: 'That code could not be sent. Try again.', next: 'retry' },
    })
  })

  test('no signal at all is a send that failed, not a screen stuck on Sending…', () => {
    expect(sendOutcome({ status: null })).toBe('sendFailed')
  })

  test('rate limited says to wait, then retry', () => {
    const limited = answered(asked(startSigningIn, 'athlete@example.com'), sendOutcome({ status: 429 }))

    expect(screenOf(limited)).toMatchObject({
      at: 'email',
      alert: { said: 'Too many tries just now. Wait a minute, then try again.', next: 'wait' },
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

  test('a wrong one says so and the field stays, so one typo does not end the attempt', () => {
    const wrong = answered(onCodeStep(), checkOutcome({ status: 400, code: 'INVALID_OTP' }))

    expect(screenOf(wrong)).toMatchObject({
      at: 'code',
      takesCode: true,
      alert: { said: 'That code is not right. Check it and try again.', next: 'tryAgain' },
    })
  })

  test('an expired one says so and only a new code is offered, because that one is gone', () => {
    const expired = answered(onCodeStep(), checkOutcome({ status: 400, code: 'OTP_EXPIRED' }))

    expect(screenOf(expired)).toMatchObject({
      at: 'code',
      takesCode: false,
      alert: { said: 'That code has expired. Send a new code.', next: 'sendNew' },
    })
  })

  test('too many tries says to ask for a new code, because that one is gone too', () => {
    const spent = answered(onCodeStep(), checkOutcome({ status: 403, code: 'TOO_MANY_ATTEMPTS' }))

    expect(screenOf(spent)).toMatchObject({
      at: 'code',
      takesCode: false,
      alert: { said: 'That code was wrong too many times. Send a new code.', next: 'sendNew' },
    })
  })

  test('rate limited says to wait, and the code is still good for when the wait is over', () => {
    const limited = answered(onCodeStep(), checkOutcome({ status: 429 }))

    expect(screenOf(limited)).toMatchObject({
      at: 'code',
      takesCode: true,
      alert: { said: 'Too many tries just now. Wait a minute, then try again.', next: 'wait' },
    })
  })

  test('no signal is not blamed on the code', () => {
    const lost = answered(onCodeStep(), checkOutcome({ status: null }))

    expect(screenOf(lost)).toMatchObject({
      at: 'code',
      takesCode: true,
      alert: { said: 'That code could not be checked. Try again.', next: 'tryAgain' },
    })
  })
})

describe('asking for a new code', () => {
  test('says only the newest code works, once one has been resent', () => {
    expect(screenOf(onCodeStep())).toMatchObject({ at: 'code', onlyNewest: false })
    expect(screenOf(answered(asked(onCodeStep(), 'athlete@example.com'), 'sent'))).toMatchObject({
      at: 'code',
      lifetime: 'It works once and expires in 10 minutes.',
      onlyNewest: true,
      alert: null,
    })
  })

  test('keeps saying so after a wrong try, because an older email is the likely mistake', () => {
    const resent = answered(asked(onCodeStep(), 'athlete@example.com'), 'sent')

    expect(screenOf(answered(resent, 'wrongCode'))).toMatchObject({ onlyNewest: true })
  })

  test('brings the field back after a code that was gone', () => {
    const expired = answered(onCodeStep(), 'expired')

    expect(screenOf(answered(asked(expired, 'athlete@example.com'), 'sent'))).toMatchObject({ takesCode: true })
  })

  test('that could not be sent stays on the code step, with the offer still there', () => {
    const failed = answered(asked(onCodeStep(), 'athlete@example.com'), 'sendFailed')

    expect(screenOf(failed)).toMatchObject({
      at: 'code',
      alert: { said: 'That code could not be sent. Try again.', next: 'retry' },
    })
  })
})

describe('using a different email', () => {
  test('returns to the email step with what was typed, so it can be fixed', () => {
    const back = differentEmail(onCodeStep())

    expect(screenOf(back)).toMatchObject({ at: 'email', busy: false, alert: null })
    expect(back.email).toBe('athlete@example.com')
  })

  test('forgets that a code was resent: the next address starts clean', () => {
    const resent = answered(asked(onCodeStep(), 'athlete@example.com'), 'sent')
    const next = answered(asked(differentEmail(resent), 'other@example.com'), 'sent')

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
