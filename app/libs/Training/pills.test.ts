import { describe, expect, test } from 'vitest'
import { noTaps, withTap } from './logging.ts'
import { pillsOf } from './pills.ts'
import type { Day, Exercise, Log, Week } from '../../../shared/training.ts'

function exercise({
  key = 'dips',
  optional = false,
  log = null,
}: {
  key?: string
  optional?: boolean
  log?: Log | null
} = {}): Exercise {
  return {
    key,
    movementId: 'dip',
    name: 'Dips',
    variant: null,
    side: 'both',
    optional,
    toFailure: false,
    prescription: { kind: 'reps', sets: 3, reps: { min: 6, max: 6 } },
    load: null,
    tempo: null,
    restSeconds: null,
    cue: null,
    raw: 'Dips: 3×6',
    log,
  }
}

function day({
  ordinal = 1,
  kind = 'training' as Day['kind'],
  exercises = [exercise()],
  orphans = [],
  log = null,
  complete = false,
}: Partial<Pick<Day, 'ordinal' | 'kind' | 'exercises' | 'orphans' | 'log' | 'complete'>> = {}): Day {
  return {
    ordinal,
    date: '2025-08-25',
    weekday: 'monday',
    kind,
    focus: 'Upper Push + Core',
    notes: null,
    log,
    exercises,
    orphans,
    complete,
  }
}

function week(days: Day[]): Week {
  return { number: 12, startDate: '2025-08-25', notes: null, days }
}

function marks(...days: Day[]): string[] {
  return pillsOf({ week: week(days), taps: noTaps, notes: {} }).map((pill) => pill.mark)
}

describe('what a Day is marked with', () => {
  test('a Day whose every asked-for Exercise has a Log is done, so the Week reads at a glance', () => {
    expect(
      marks(day({ exercises: [exercise({ log: { kind: 'difficulty', difficulty: 'good', note: null } })] })),
    ).toEqual(['done'])
  })

  test('an optional Exercise left undone never holds the Day open — it was not asked for', () => {
    const done = day({
      exercises: [exercise({ log: { kind: 'skipped', note: null } }), exercise({ key: 'hangs', optional: true })],
    })

    expect(marks(done)).toEqual(['done'])
  })

  test('a rest Day is done by the athlete’s clock, which the server already read, not by a Log', () => {
    expect(marks(day({ kind: 'rest', exercises: [], complete: true }))).toEqual(['done'])
  })

  test('a Day with one of two asked-for Exercises logged is part trained', () => {
    const half = day({
      exercises: [exercise({ log: { kind: 'skipped', note: null } }), exercise({ key: 'rows' })],
    })

    expect(marks(half)).toEqual(['part'])
  })

  test('a Day nothing has been recorded on is untouched', () => {
    expect(marks(day({ exercises: [exercise(), exercise({ key: 'rows' })] }))).toEqual(['untouched'])
  })
})

describe('what counts as something recorded', () => {
  test('a tap just made counts before the server has it — the strip says what the screen does', () => {
    const taps = withTap(noTaps, {
      dayOrdinal: 2,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'easy', note: null },
    })
    const days = [day({ ordinal: 2, exercises: [exercise(), exercise({ key: 'rows' })] })]

    expect(pillsOf({ week: week(days), taps, notes: {} }).map((pill) => pill.mark)).toEqual(['part'])
  })

  test('a Log taken back leaves the Day untouched again, rather than marked for a tap that is gone', () => {
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: null })
    const logged = day({ exercises: [exercise({ log: { kind: 'note', note: 'shoulder' } })] })

    expect(pillsOf({ week: week([logged]), taps, notes: {} }).map((pill) => pill.mark)).toEqual(['untouched'])
  })

  test('a Day carrying only its own note — "walked" — is a Day something happened on', () => {
    expect(marks(day({ log: 'walked' }))).toEqual(['part'])
  })

  test('a note being written on screen counts before the server has it', () => {
    const days = [day({ ordinal: 3 })]

    expect(
      pillsOf({ week: week(days), taps: noTaps, notes: { 3: 'swapped with day 4' } }).map((pill) => pill.mark),
    ).toEqual(['part'])
  })

  test('a note emptied takes the mark back with it, the way it takes the Log back', () => {
    expect(
      pillsOf({ week: week([day({ log: 'walked' })]), taps: noTaps, notes: { 1: '' } }).map((pill) => pill.mark),
    ).toEqual(['untouched'])
  })

  test('work the plan has since dropped still marks the Day it was done on', () => {
    const orphaned = day({
      orphans: [{ ...exercise({ key: 'chair-dips' }), log: { kind: 'skipped', note: null } }],
    })

    expect(marks(orphaned)).toEqual(['part'])
  })
})

describe('the Days the strip shows', () => {
  test('a Week the coach cut short navigates, and one that runs long does too', () => {
    const three = pillsOf({
      week: week([day({ ordinal: 1 }), day({ ordinal: 2 }), day({ ordinal: 3 })]),
      taps: noTaps,
      notes: {},
    })
    const nine = pillsOf({
      week: week([1, 2, 3, 4, 5, 6, 7, 8, 9].map((ordinal) => day({ ordinal }))),
      taps: noTaps,
      notes: {},
    })

    expect(three.map((pill) => pill.ordinal)).toEqual([1, 2, 3])
    expect(nine.map((pill) => pill.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  test('the gap a Revision left where it dropped a Day is kept — the ordinal is the Day, not its place', () => {
    const cut = [day({ ordinal: 1 }), day({ ordinal: 2 }), day({ ordinal: 5 })]

    expect(pillsOf({ week: week(cut), taps: noTaps, notes: {} }).map((pill) => pill.ordinal)).toEqual([1, 2, 5])
  })

  test('Days are read in ordinal order however they arrive', () => {
    const shuffled = [day({ ordinal: 3 }), day({ ordinal: 1 }), day({ ordinal: 2 })]

    expect(pillsOf({ week: week(shuffled), taps: noTaps, notes: {} }).map((pill) => pill.ordinal)).toEqual([1, 2, 3])
  })

  test('each pill carries the weekday its Day falls on, for a strip read without dates', () => {
    const [pill] = pillsOf({ week: week([day()]), taps: noTaps, notes: {} })

    expect(pill?.weekday).toBe('monday')
  })
})
