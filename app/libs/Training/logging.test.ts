import { describe, expect, test } from 'vitest'
import { logFor, noTaps, noteOf, tally, tapOf, withTap } from './logging.ts'
import type { Day, Exercise, Log, Side } from '../../../shared/training.ts'

/** An Exercise cut down to what logging cares about: its key, its side, what happened. */
function exercise({
  key = 'dips',
  side = 'both',
  optional = false,
  log = null,
}: { key?: string; side?: Side; optional?: boolean; log?: Log | null } = {}): Exercise {
  return {
    key,
    movementId: 'dip',
    name: 'Dips',
    variant: null,
    side,
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
  kind = 'training',
  exercises = [exercise()],
  complete = false,
}: { ordinal?: number; kind?: Day['kind']; exercises?: Exercise[]; complete?: boolean } = {}): Day {
  return {
    ordinal,
    date: '2025-08-25',
    weekday: 'monday',
    kind,
    focus: 'Upper Push + Core',
    notes: null,
    log: null,
    exercises,
    orphans: [],
    complete,
  }
}

describe('what a tap records', () => {
  test('a tap on a rating is the whole Log, and it carries no number (ADR 0003)', () => {
    expect(tapOf({ chip: 'good', note: '' })).toEqual({ kind: 'difficulty', difficulty: 'good', note: null })
  })

  test('a tap keeps a note already written, so writing first and tapping second loses nothing', () => {
    expect(tapOf({ chip: 'challenging', note: 'did 4x8' })).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: 'did 4x8',
    })
  })

  test('a skip is recorded as a skip, which is not the same as nothing', () => {
    expect(tapOf({ chip: 'skipped', note: '' })).toEqual({ kind: 'skipped', note: null })
  })

  test('whitespace is not a note', () => {
    expect(tapOf({ chip: 'easy', note: '   ' })).toEqual({ kind: 'difficulty', difficulty: 'easy', note: null })
  })
})

describe('what leaving the note alone records', () => {
  test('a note with no rating is a Log in its own right', () => {
    expect(noteOf({ log: null, note: 'back hurt' })).toEqual({ log: { kind: 'note', note: 'back hurt' } })
  })

  test('a note written after a rating keeps the rating', () => {
    expect(noteOf({ log: { kind: 'difficulty', difficulty: 'challenging', note: null }, note: 'did 4x8' })).toEqual({
      log: { kind: 'difficulty', difficulty: 'challenging', note: 'did 4x8' },
    })
  })

  test('a note written against a skip keeps the skip', () => {
    expect(noteOf({ log: { kind: 'skipped', note: null }, note: 'shoulder' })).toEqual({
      log: { kind: 'skipped', note: 'shoulder' },
    })
  })

  test('a note nobody changed records nothing, so leaving the screen is free', () => {
    expect(noteOf({ log: { kind: 'difficulty', difficulty: 'good', note: 'legs fine' }, note: 'legs fine' })).toBe(null)
  })

  test('an empty box against no Log records nothing', () => {
    expect(noteOf({ log: null, note: '   ' })).toBe(null)
  })

  test('clearing the note leaves the rating standing', () => {
    expect(noteOf({ log: { kind: 'difficulty', difficulty: 'easy', note: 'felt light' }, note: '' })).toEqual({
      log: { kind: 'difficulty', difficulty: 'easy', note: null },
    })
  })

  test('emptying a note standing on its own takes the Log back — it was the whole of it', () => {
    expect(noteOf({ log: { kind: 'note', note: 'walked' }, note: '' })).toEqual({ log: null })
  })

  test('whitespace does not keep a note standing on its own alive either', () => {
    expect(noteOf({ log: { kind: 'note', note: 'walked' }, note: '  ' })).toEqual({ log: null })
  })

  test('rewriting a note standing on its own replaces it', () => {
    expect(noteOf({ log: { kind: 'note', note: 'walked' }, note: 'walked 5km' })).toEqual({
      log: { kind: 'note', note: 'walked 5km' },
    })
  })
})

describe('the Log shown against an Exercise', () => {
  test('an Exercise nobody has tapped shows the Log that arrived with the Week', () => {
    const arrived: Log = { kind: 'difficulty', difficulty: 'good', note: null }

    expect(logFor({ taps: noTaps, dayOrdinal: 1, exercise: exercise({ log: arrived }) })).toEqual(arrived)
  })

  test('the tap wins over what arrived, so a mistap is corrected by tapping what was meant', () => {
    const taps = withTap(
      withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: tapOf({ chip: 'easy', note: '' }) }),
      { dayOrdinal: 1, exerciseKey: 'dips', log: tapOf({ chip: 'challenging', note: '' }) },
    )

    expect(logFor({ taps, dayOrdinal: 1, exercise: exercise() })).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: null,
    })
  })

  test('left and right are separate Exercises, so a tap on one leaves the other unlogged', () => {
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'curl-left', log: tapOf({ chip: 'good', note: '' }) })

    expect(logFor({ taps, dayOrdinal: 1, exercise: exercise({ key: 'curl-left', side: 'left' }) })).not.toBe(null)
    expect(logFor({ taps, dayOrdinal: 1, exercise: exercise({ key: 'curl-right', side: 'right' }) })).toBe(null)
  })

  test('a Log taken back stands in front of what arrived, so the Exercise reads as unlogged', () => {
    const arrived: Log = { kind: 'note', note: 'bakc hrut' }
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: null })

    expect(logFor({ taps, dayOrdinal: 1, exercise: exercise({ log: arrived }) })).toBe(null)
  })

  test('the same Exercise on another Day is another Log — logging Day 6 does not log Day 1', () => {
    const taps = withTap(noTaps, { dayOrdinal: 6, exerciseKey: 'dips', log: tapOf({ chip: 'good', note: '' }) })

    expect(logFor({ taps, dayOrdinal: 1, exercise: exercise() })).toBe(null)
    expect(logFor({ taps, dayOrdinal: 6, exercise: exercise() })).not.toBe(null)
  })
})

describe('how much of the Day is left', () => {
  test('only what the Day asks for is counted', () => {
    const today = day({ exercises: [exercise({ key: 'dips' }), exercise({ key: 'hangs', optional: true })] })

    expect(tally({ taps: noTaps, day: today })).toEqual({ done: 0, asked: 1, complete: false })
  })

  test('a tap moves the tally, without waiting for the Week to come back around', () => {
    const today = day({ exercises: [exercise({ key: 'dips' }), exercise({ key: 'hollow' })] })
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: tapOf({ chip: 'good', note: '' }) })

    expect(tally({ taps, day: today })).toEqual({ done: 1, asked: 2, complete: false })
  })

  test('a skip counts as logged — the Day asked, and it was answered', () => {
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: tapOf({ chip: 'skipped', note: '' }) })

    expect(tally({ taps, day: day() })).toEqual({ done: 1, asked: 1, complete: true })
  })

  test('the Day finishes itself when the last Exercise it asks for is logged', () => {
    const today = day({ exercises: [exercise({ key: 'dips', log: { kind: 'skipped', note: null } })] })

    expect(tally({ taps: noTaps, day: today }).complete).toBe(true)
  })

  test('taking the last Log back holds the Day open again', () => {
    const today = day({ exercises: [exercise({ key: 'dips', log: { kind: 'note', note: 'walked' } })] })
    const taps = withTap(noTaps, { dayOrdinal: 1, exerciseKey: 'dips', log: null })

    expect(tally({ taps: noTaps, day: today })).toEqual({ done: 1, asked: 1, complete: true })
    expect(tally({ taps, day: today })).toEqual({ done: 0, asked: 1, complete: false })
  })

  test('an all-optional Day is done, so active recovery never reads as falling behind', () => {
    const today = day({ exercises: [exercise({ key: 'hangs', optional: true })] })

    expect(tally({ taps: noTaps, day: today })).toEqual({ done: 0, asked: 0, complete: true })
  })

  test('a rest Day keeps the completion it was read with — only the clock finishes it', () => {
    expect(tally({ taps: noTaps, day: day({ kind: 'rest', exercises: [], complete: true }) }).complete).toBe(true)
    expect(tally({ taps: noTaps, day: day({ kind: 'rest', exercises: [], complete: false }) }).complete).toBe(false)
  })
})
