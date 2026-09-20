import { describe, expect, test } from 'vitest'
import { MARKS, markOf, marksOf } from './marks.ts'
import type { DayOnShelf } from '../../../shared/training.ts'

function dayOnShelf(day: Partial<DayOnShelf>): DayOnShelf {
  return { ordinal: 1, kind: 'training', date: '2025-08-25', complete: false, touched: false, ...day }
}

describe('how far one Day got', () => {
  test('a Day everything asked of it has been done on is done', () => {
    expect(markOf({ complete: true, touched: true })).toBe('done')
  })

  test('a Day with something on it but not everything is part trained', () => {
    expect(markOf({ complete: false, touched: true })).toBe('part')
  })

  test('a Day nothing was ever recorded on is untouched', () => {
    expect(markOf({ complete: false, touched: false })).toBe('untouched')
  })

  test('a Day finished without anything being recorded on it is still done', () => {
    // A rest Day the calendar has passed, and a Day asking only for Optional work.
    expect(markOf({ complete: true, touched: false })).toBe('done')
  })

  test('every mark is a shape and a word, so none of them is only a colour', () => {
    expect(Object.values(MARKS).map((one) => one.said)).toEqual(['done', 'part trained', 'untouched'])
    expect(new Set(Object.values(MARKS).map((one) => one.glyph)).size).toBe(3)
  })
})

describe('the strip of Days on a Week', () => {
  test('a Week reads left to right in ordinal order, whatever order it arrived in', () => {
    const marks = marksOf([
      dayOnShelf({ ordinal: 3, touched: true }),
      dayOnShelf({ ordinal: 1, complete: true }),
      dayOnShelf({ ordinal: 2 }),
    ])

    expect(marks).toEqual([
      { ordinal: 1, mark: 'done' },
      { ordinal: 2, mark: 'untouched' },
      { ordinal: 3, mark: 'part' },
    ])
  })

  test('a gap a Revision left in the ordinals stays a gap, never renumbered', () => {
    const marks = marksOf([dayOnShelf({ ordinal: 1 }), dayOnShelf({ ordinal: 3 }), dayOnShelf({ ordinal: 4 })])

    expect(marks.map((one) => one.ordinal)).toEqual([1, 3, 4])
  })

  test('a Week the coach wrote with no Days at all has no strip', () => {
    expect(marksOf([])).toEqual([])
  })
})
