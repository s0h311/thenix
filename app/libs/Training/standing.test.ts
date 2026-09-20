import { describe, expect, test } from 'vitest'
import { standingOf } from './standing.ts'

describe('a screen that could not read what it asked the server for', () => {
  test('nothing came back and nothing is coming: unreachable, never a sign-out — the athlete is still signed in', () => {
    expect(standingOf({ pending: false, got: undefined })).toEqual({ at: 'unreachable' })
  })
})

describe('what a screen shows while it waits', () => {
  test('nothing has come back yet, so the screen is opening rather than empty', () => {
    expect(standingOf({ pending: true, got: undefined })).toEqual({ at: 'opening' })
  })

  test('an answer already on screen stays there while the next read is out — nothing is taken away mid-set', () => {
    expect(standingOf({ pending: true, got: ['week 12'] })).toEqual({ at: 'open', it: ['week 12'] })
  })
})

describe('what a screen shows once the server has answered', () => {
  test('an answer is the screen — the Weeks the athlete has', () => {
    expect(standingOf({ pending: false, got: ['week 12'] })).toEqual({ at: 'open', it: ['week 12'] })
  })

  test('an empty answer is still an answer: an empty Shelf is not an unread one', () => {
    expect(standingOf({ pending: false, got: [] })).toEqual({ at: 'open', it: [] })
  })
})

describe('a screen with no session behind it', () => {
  test('null is the server saying who is asking, so the screen asks them to sign in', () => {
    expect(standingOf({ pending: false, got: null })).toEqual({ at: 'signedOut' })
  })
})
