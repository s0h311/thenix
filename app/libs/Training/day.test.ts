import { describe, expect, test } from 'vitest'
import { asLogged, headingOf, progressOf } from './day.ts'
import { noTaps, withTap } from './logging.ts'
import type { Day, Exercise, Log } from '../../../shared/training.ts'

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
  kind = 'training' as Day['kind'],
  focus = 'Upper Push + Core' as string | null,
  exercises = [exercise()],
  complete = false,
}: Partial<Pick<Day, 'kind' | 'focus' | 'exercises' | 'complete'>> = {}): Day {
  return {
    ordinal: 1,
    date: '2025-08-25',
    weekday: 'monday',
    kind,
    focus,
    notes: null,
    log: null,
    exercises,
    orphans: [],
    complete,
  }
}

const good: Log = { kind: 'difficulty', difficulty: 'good', note: null }

describe('how much of the Day is left', () => {
  test('a training Day counts what it asks for against what has a Log', () => {
    const half = day({
      exercises: [exercise({ key: 'dips', log: good }), exercise({ key: 'rows' }), exercise({ key: 'hangs' })],
    })

    expect(progressOf({ taps: noTaps, day: half })).toEqual({ complete: false, said: '1 of 3 logged' })
  })

  test('the Day is done when the last Exercise it asks for has one', () => {
    const finished = day({ exercises: [exercise({ log: good })] })

    expect(progressOf({ taps: noTaps, day: finished })).toEqual({ complete: true, said: 'Day done' })
  })

  test('an optional Exercise left undone never holds the Day open — it was not asked for', () => {
    const finished = day({
      exercises: [exercise({ key: 'dips', log: good }), exercise({ key: 'hangs', optional: true })],
    })

    expect(progressOf({ taps: noTaps, day: finished })).toEqual({ complete: true, said: 'Day done' })
  })

  test('a tap answers before the server does — the phone is on the floor mid-set', () => {
    const half = day({ exercises: [exercise({ key: 'dips' }), exercise({ key: 'rows' })] })
    const tapped = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: good })

    expect(progressOf({ taps: tapped, day: half })).toEqual({ complete: false, said: '1 of 2 logged' })
  })

  test('a rest Day still to come says nothing: nothing is asked, so nothing is left', () => {
    expect(progressOf({ taps: noTaps, day: day({ kind: 'rest', exercises: [] }) })).toBeNull()
  })

  test('a rest Day is done by the athlete’s clock, which the server already read', () => {
    const past = day({ kind: 'rest', exercises: [], complete: true })

    expect(progressOf({ taps: noTaps, day: past })).toEqual({ complete: true, said: 'Day done' })
  })
})

describe('what the Day is called', () => {
  test('the coach’s Focus, when the Day has one', () => {
    expect(headingOf(day())).toBe('Upper Push + Core')
  })

  test('a rest Day with no Focus says it is a rest Day, not that it is empty', () => {
    expect(headingOf(day({ kind: 'rest', focus: null, exercises: [] }))).toBe('Full Rest')
  })

  test('a training Day with no Focus is still training', () => {
    expect(headingOf(day({ focus: null }))).toBe('Training')
  })
})

describe('a Log read back, where there is nothing left to tap', () => {
  test('the rating is the athlete’s word for it, not the difficulty it is stored as', () => {
    expect(asLogged({ kind: 'difficulty', difficulty: 'challenging', note: null })).toBe('Challenging')
  })

  test('a rating and a note read as one line', () => {
    expect(asLogged({ kind: 'difficulty', difficulty: 'easy', note: 'felt strong' })).toBe('Easy · felt strong')
  })

  test('a skip says so, because a skip is not an Exercise left unlogged', () => {
    expect(asLogged({ kind: 'skipped', note: 'knee' })).toBe('Skipped · knee')
  })

  test('a note standing on its own is the whole line', () => {
    expect(asLogged({ kind: 'note', note: 'walked instead' })).toBe('walked instead')
  })
})
