import { describe, expect, test } from 'vitest'
import { settledBy } from './settled.ts'
import type { ShelvedDay } from './training.ts'

/** Day 5 of a Week starting Monday 2025-08-25. */
const FRIDAY = '2025-08-29'

/** Seven Days on the shelf, each asking for one Exercise, none of it logged. */
const UNTRAINED: ShelvedDay[] = [1, 2, 3, 4, 5, 6, 7].map((ordinal) => ({
  ordinal,
  kind: 'training',
  asked: [{ optional: false, logged: false }],
}))

function setAside({ shelved, startDate }: { shelved: ShelvedDay[] | null; startDate: string }): number[] {
  const settled = settledBy({ startDate, today: FRIDAY, shelved })

  return [1, 2, 3, 4, 5, 6, 7].filter(settled)
}

describe('which Days a Revision sets aside', () => {
  test('on day 5, with day 5 not done, days 1–4', () => {
    expect(setAside({ shelved: UNTRAINED, startDate: '2025-08-25' })).toEqual([1, 2, 3, 4])
  })

  test('on day 5, with day 5 done, days 1–5', () => {
    const shelved = UNTRAINED.map((one) =>
      one.ordinal === 5 ? { ...one, asked: [{ optional: false, logged: true }] } : one,
    )

    expect(setAside({ shelved, startDate: '2025-08-25' })).toEqual([1, 2, 3, 4, 5])
  })

  test('a Day behind today is set aside even where the shelf holds none', () => {
    expect(setAside({ shelved: UNTRAINED.filter((one) => one.ordinal !== 2), startDate: '2025-08-25' })).toContain(2)
  })

  test('moving the start date forward brings the Days set aside back into the Revision', () => {
    expect(setAside({ shelved: UNTRAINED, startDate: '2025-08-28' })).toEqual([1])
  })

  test('a Week number not on the shelf sets nothing aside, whatever the start date', () => {
    expect(setAside({ shelved: null, startDate: '2025-08-01' })).toEqual([])
  })
})
