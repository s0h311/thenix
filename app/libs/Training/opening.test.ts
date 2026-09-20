import { describe, expect, test } from 'vitest'
import { openOn } from './opening.ts'
import type { Day, Week } from '../../../shared/training.ts'

function day({ ordinal = 1, date = '2025-08-25' }: { ordinal?: number; date?: string } = {}): Day {
  return {
    ordinal,
    date,
    weekday: 'monday',
    kind: 'training',
    focus: 'Upper Push + Core',
    notes: null,
    log: null,
    exercises: [],
    orphans: [],
    complete: false,
  }
}

function week({
  number = 12,
  days = [day({ ordinal: 1 }), day({ ordinal: 2 }), day({ ordinal: 3 })],
}: {
  number?: number
  days?: Day[]
} = {}): Week {
  return { number, startDate: '2025-08-25', notes: null, days }
}

describe('the Day a Week opens on', () => {
  test('a Week that covers today opens on today’s Day, so training starts with no navigation', () => {
    const today = day({ ordinal: 2 })

    expect(openOn({ week: week(), today, picked: null })?.ordinal).toBe(2)
  })

  test('a Week that holds no today — one off the shelf — opens on its first Day, not on nothing', () => {
    expect(openOn({ week: week(), today: null, picked: null })?.ordinal).toBe(1)
  })

  test('a Week with no Days at all opens on nothing — there is no Day to put on screen', () => {
    expect(openOn({ week: week({ days: [] }), today: null, picked: null })).toBe(null)
  })
})

describe('the Day the athlete picks', () => {
  test('a Day picked off the strip is the Day shown, over the one the Week opened on', () => {
    const today = day({ ordinal: 2 })

    expect(openOn({ week: week(), today, picked: { ordinal: 3, ofWeek: 12 } })?.ordinal).toBe(3)
  })

  test('a Day picked on another Week is not carried onto this one — Day 3 is a different Day here', () => {
    expect(openOn({ week: week({ number: 13 }), today: null, picked: { ordinal: 3, ofWeek: 12 } })?.ordinal).toBe(1)
  })

  test('a Day a Revision has since dropped falls back to the Day the Week opens on', () => {
    const today = day({ ordinal: 2 })

    expect(openOn({ week: week(), today, picked: { ordinal: 7, ofWeek: 12 } })?.ordinal).toBe(2)
  })
})
