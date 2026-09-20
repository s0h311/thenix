import { describe, expect, test } from 'vitest'
import { asAsked, asDate, asImport, asLoad, asMoved, asPrescribed, asRest, asRevision, asSpan } from './notation.ts'
import type { Prescription, Revision, Side } from '../../../shared/training.ts'

/** The coach's own notation, as the Week prose writes it. */
function written({ prescription, side = 'both' }: { prescription: Prescription; side?: Side }): string {
  return asPrescribed({ prescription, side })
}

describe('a prescription in the coach’s notation', () => {
  test('sets of reps worked per side read as the coach wrote them', () => {
    expect(written({ prescription: { kind: 'reps', sets: 4, reps: { min: 3, max: 3 } }, side: 'each' })).toBe(
      '4×3/side',
    )
  })

  test('a rep range keeps both ends', () => {
    expect(written({ prescription: { kind: 'reps', sets: 5, reps: { min: 2, max: 3 } } })).toBe('5×2–3')
  })

  test('a set taken to failure asks for max, not for a number', () => {
    expect(written({ prescription: { kind: 'reps', sets: 3, reps: null } })).toBe('3× max')
  })

  test('held time stays in seconds while it reads as seconds', () => {
    expect(written({ prescription: { kind: 'time', sets: 3, seconds: { min: 35, max: 35 } } })).toBe('3×35s')
  })

  test('a single long effort is minutes, without a set count', () => {
    expect(written({ prescription: { kind: 'time', sets: 1, seconds: { min: 600, max: 720 } } })).toBe('10–12 min')
  })

  test('a run carries its distance and its pace', () => {
    expect(written({ prescription: { kind: 'distance', km: { min: 10, max: 11 }, pace: '6:00–6:10/km' } })).toBe(
      '10–11 km @ 6:00–6:10/km',
    )
  })

  test('a run with no pace asked for is just the distance', () => {
    expect(written({ prescription: { kind: 'distance', km: { min: 5, max: 5 } } })).toBe('5 km')
  })

  test('an interval protocol shows the work and the recovery it alternates with', () => {
    expect(
      written({
        prescription: {
          kind: 'rounds',
          rounds: 4,
          work: { kind: 'time', sets: 1, seconds: { min: 240, max: 240 } },
          recovery: { kind: 'time', sets: 1, seconds: { min: 180, max: 180 } },
        },
      }),
    ).toBe('4 rounds: 4 min / 3 min')
  })
})

describe('the load in the coach’s notation', () => {
  test('a symmetric weight names what carries it', () => {
    expect(asLoad({ kind: 'symmetric', value: 11, unit: 'kg', approx: false, implement: 'backpack' })).toBe(
      '11kg (backpack)',
    )
  })

  test('a weight carried one per hand says so', () => {
    expect(asLoad({ kind: 'perHand', value: 1, unit: 'kg', approx: false })).toBe('1kg/hand')
  })

  test('deliberately different weights per arm are shown per arm', () => {
    expect(
      asLoad({
        kind: 'asymmetric',
        left: { value: 7, unit: 'kg', approx: false },
        right: { value: 4, unit: 'kg', approx: true },
        implement: 'backpack',
      }),
    ).toBe('L 7kg / R ~4kg (backpack)')
  })

  test('bodyweight is stated, not left blank', () => {
    expect(asLoad({ kind: 'bodyweight' })).toBe('bodyweight')
  })

  test('an improvised load reads as the coach described it', () => {
    expect(asLoad({ kind: 'improvised', description: 'water canisters' })).toBe('water canisters')
  })
})

describe('the rest in the coach’s notation', () => {
  test('short rests stay in seconds', () => {
    expect(asRest({ min: 60, max: 60 })).toBe('rest 60s')
  })

  test('long rests read as minutes', () => {
    expect(asRest({ min: 180, max: 180 })).toBe('rest 3 min')
  })

  test('a rest range keeps both ends', () => {
    expect(asRest({ min: 120, max: 180 })).toBe('rest 2–3 min')
  })
})

describe('when a Week ran', () => {
  test('a date reads as the athlete says it, the year left out', () => {
    expect(asDate('2025-08-25')).toBe('25 Aug')
  })

  test('a Week spans from its first Day to its last', () => {
    expect(asSpan({ startDate: '2025-08-25', endDate: '2025-08-31' })).toBe('25 Aug – 31 Aug')
  })

  test('a Week with no Days at all is shown by where it starts', () => {
    expect(asSpan({ startDate: '2025-08-25', endDate: null })).toBe('25 Aug')
  })
})

describe('a Week the paste would revise', () => {
  test('it names the Week, when it runs, and what is recorded against it', () => {
    expect(asRevision({ number: 12, revising: { startDate: '2025-06-23', logged: 4 } })).toBe(
      'Week 12 is already on your shelf, from 23 Jun, with 4 Logs on it. Importing replaces the plan and keeps your Logs.',
    )
  })

  test('one Log is one Log, not 1 Logs', () => {
    expect(asRevision({ number: 12, revising: { startDate: '2025-06-23', logged: 1 } })).toBe(
      'Week 12 is already on your shelf, from 23 Jun, with 1 Log on it. Importing replaces the plan and keeps your Logs.',
    )
  })

  test('a Week nothing was recorded against promises nothing about Logs', () => {
    expect(asRevision({ number: 12, revising: { startDate: '2025-06-23', logged: 0 } })).toBe(
      'Week 12 is already on your shelf, from 23 Jun. Importing replaces its plan.',
    )
  })
})

describe('the button that confirms a paste', () => {
  test('a Week number the athlete does not have is imported', () => {
    expect(asImport({ number: 21, revising: null })).toBe('Import this Week')
  })

  test('a Week number already on the shelf is replaced, and the button says which', () => {
    expect(asImport({ number: 12, revising: { startDate: '2025-06-23', logged: 4 } })).toBe('Replace Week 12')
  })
})

/** Every Day's date is derived from the Week's start, so moving the Week moves the Logs. */
function moved({ revising, startsOn }: { revising: Revision | null; startsOn: string }): string | null {
  return asMoved({ number: 12, revising, startsOn })
}

describe('re-dating a Week the athlete is already training', () => {
  test('a Week pushed on a week says how far it goes and that the Logs go with it', () => {
    expect(moved({ revising: { startDate: '2025-06-23', logged: 4 }, startsOn: '2025-06-30' })).toBe(
      'This moves Week 12 forward 7 days, to 30 Jun. Its 4 Logs move with it.',
    )
  })

  test('a Week pulled back reads as back, not as a negative number of days', () => {
    expect(moved({ revising: { startDate: '2025-06-23', logged: 2 }, startsOn: '2025-06-21' })).toBe(
      'This moves Week 12 back 2 days, to 21 Jun. Its 2 Logs move with it.',
    )
  })

  test('a Week out by a single day is out by a day, not by 1 days', () => {
    expect(moved({ revising: { startDate: '2025-06-23', logged: 1 }, startsOn: '2025-06-24' })).toBe(
      'This moves Week 12 forward 1 day, to 24 Jun. Its 1 Log moves with it.',
    )
  })

  test('a Week nothing is recorded against still moves, and promises nothing about Logs', () => {
    expect(moved({ revising: { startDate: '2025-06-23', logged: 0 }, startsOn: '2025-06-30' })).toBe(
      'This moves Week 12 forward 7 days, to 30 Jun.',
    )
  })

  test('the date the Week already runs on moves nothing, so nothing is said', () => {
    expect(moved({ revising: { startDate: '2025-06-23', logged: 4 }, startsOn: '2025-06-23' })).toBeNull()
  })

  test('a Week number the athlete does not have has nothing to move', () => {
    expect(moved({ revising: null, startsOn: '2025-06-30' })).toBeNull()
  })
})

/** What one Day of a pasted Week asks for, read before any of it is written. */
function asked({ kind, exercises }: { kind: 'training' | 'rest'; exercises: number }): string {
  return asAsked({ kind, exercises: Array.from({ length: exercises }, () => ({})) })
}

describe('a Day of a Week as it parsed', () => {
  test('a Day of work says how much of it there is', () => {
    expect(asked({ kind: 'training', exercises: 6 })).toBe('6 Exercises')
  })

  test('a Day asking for one thing does not ask for 1 Exercises', () => {
    expect(asked({ kind: 'training', exercises: 1 })).toBe('1 Exercise')
  })

  test('a rest Day says it is a rest Day, not that it holds nothing', () => {
    expect(asked({ kind: 'rest', exercises: 0 })).toBe('Rest')
  })

  test('a training Day the coach left empty is named as empty, not as rest', () => {
    expect(asked({ kind: 'training', exercises: 0 })).toBe('Nothing asked for')
  })

  test('a Day marked rest that still carries work is read by the work, not by the mark', () => {
    expect(asked({ kind: 'rest', exercises: 2 })).toBe('2 Exercises')
  })
})
