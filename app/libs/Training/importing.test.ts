import { describe, expect, test } from 'vitest'
import { answerOf } from './importing.ts'

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
