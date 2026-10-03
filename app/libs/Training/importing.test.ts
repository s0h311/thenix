import { describe, expect, test } from 'vitest'
import { answerOf, setAsideOf, wrote } from './importing.ts'
import type { Revision } from '../../../shared/training.ts'

const FAULT = { day: 1, exercise: 'dips', field: 'raw', message: 'could not be read' }

describe('a paste the server read', () => {
  test('the Week comes back, and it is what the screen shows', () => {
    expect(answerOf({ status: 200, body: { ok: true, number: 21 } })).toEqual({
      at: 'read',
      it: { ok: true, number: 21 },
    })
  })
})

describe('a paste the server refused', () => {
  test('the faults come back, for the coach who wrote them', () => {
    expect(answerOf({ status: 200, body: { ok: false, errors: [FAULT] } })).toEqual({
      at: 'rejected',
      faults: [FAULT],
    })
  })

  test('a refusal naming nothing is no use to the coach, so it is not one', () => {
    expect(answerOf({ status: 200, body: { ok: false, errors: [] } })).toEqual({ at: 'unreachable' })
  })

  test('a refusal with no list at all is the same: the athlete is not shown an empty one', () => {
    expect(answerOf({ status: 200, body: { ok: false } })).toEqual({ at: 'unreachable' })
  })
})

describe('a paste the server would not take', () => {
  test('401 is the session having ended, and nothing else is', () => {
    expect(answerOf({ status: 401, body: { statusCode: 401, statusMessage: 'Unauthorized' } })).toEqual({
      at: 'signedOut',
    })
  })

  test('a server that fell over is unreachable, never a Week refused: nothing was written', () => {
    expect(answerOf({ status: 500, body: { statusCode: 500 } })).toEqual({ at: 'unreachable' })
  })
})

describe('a paste the server never answered', () => {
  test('no status is the gym with no signal', () => {
    expect(answerOf({ status: null, body: null })).toEqual({ at: 'unreachable' })
  })

  test('an answer that is not the contract is not an answer', () => {
    expect(answerOf({ status: 200, body: 'Bad Gateway' })).toEqual({ at: 'unreachable' })
  })
})

describe('what an import may have written', () => {
  test('a Week read back is a Week on the Shelf, so every read of one is old', () => {
    expect(wrote('read')).toBe(true)
  })

  test('an answer that never came back may still have been written, so it is read again', () => {
    expect(wrote('unreachable')).toBe(true)
  })

  test('a paste refused wrote nothing: the Shelf is untouched', () => {
    expect(wrote('rejected')).toBe(false)
  })

  test('an ended session wrote nothing either', () => {
    expect(wrote('signedOut')).toBe(false)
  })
})

/** Day 5 of a Week starting Monday 2025-08-25. */
const FRIDAY = '2025-08-29'

/** Week 20 on the shelf from that Monday: seven Days, each asking for one Exercise, none of it logged. */
const REVISING: Revision = {
  startDate: '2025-08-25',
  logged: 0,
  shelved: [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
    ordinal,
    kind: 'training',
    asked: [{ optional: false, logged: false }],
  })),
}

describe('what a Revision sets aside, as the Preview works it out', () => {
  test('on day 5, a paste of Days 1–4 sets all four aside and still withdraws Days 5–7', () => {
    const { setAside, withdrawing } = setAsideOf({
      ordinals: [1, 2, 3, 4],
      revising: REVISING,
      startsOn: '2025-08-25',
      today: FRIDAY,
    })

    expect(setAside).toEqual([1, 2, 3, 4])
    expect(withdrawing).toBe(true)
  })

  test('leaving out only Days already behind the athlete withdraws nothing', () => {
    const { setAside, withdrawing } = setAsideOf({
      ordinals: [4, 5, 6, 7],
      revising: REVISING,
      startsOn: '2025-08-25',
      today: FRIDAY,
    })

    expect(setAside).toEqual([4])
    expect(withdrawing).toBe(false)
  })

  test('the Days set aside come back lowest first, whatever order the paste held them in', () => {
    expect(
      setAsideOf({ ordinals: [4, 1, 2, 3, 5, 6, 7], revising: REVISING, startsOn: '2025-08-25', today: FRIDAY })
        .setAside,
    ).toEqual([1, 2, 3, 4])
  })

  test('a first Import sets nothing aside and withdraws nothing', () => {
    const { settled, setAside, withdrawing } = setAsideOf({
      ordinals: [1, 2, 3],
      revising: null,
      startsOn: '2025-08-01',
      today: FRIDAY,
    })

    expect(settled(1)).toBe(false)
    expect(setAside).toEqual([])
    expect(withdrawing).toBe(false)
  })

  test('a cleared start date on a Revision marks nothing and does not throw', () => {
    for (const startsOn of ['', '2025-08', '2025-13-45']) {
      const { settled, setAside, withdrawing } = setAsideOf({
        ordinals: [1, 2, 3, 4],
        revising: REVISING,
        startsOn,
        today: FRIDAY,
      })

      expect(settled(1)).toBe(false)
      expect(setAside).toEqual([])
      expect(withdrawing).toBe(false)
    }
  })
})
