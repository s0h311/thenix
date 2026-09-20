import type { Day, Difficulty, Exercise, Log } from '../../../shared/training.ts'

/** One Log, named by where it belongs — logging acts on whichever Day is open. */
export type Logged = { dayOrdinal: number; exerciseKey: string; log: Log }

/** The Day's own note, which belongs to no Exercise on it. Empty takes it back. */
export type Noted = { dayOrdinal: number; note: string }

/**
 * What has been tapped since the screen opened. The tap is the save, so the screen
 * answers from here rather than waiting for the Week to come back around — a phone
 * on the floor mid-set must never show a set as unlogged because a request is slow.
 */
export type Taps = Readonly<Record<string, Log>>

export const noTaps: Taps = {}

/** Keyed by Day as well as Exercise: one Movement recurs across the Days of a Week. */
function keyOf({ dayOrdinal, exerciseKey }: { dayOrdinal: number; exerciseKey: string }): string {
  return `${dayOrdinal}:${exerciseKey}`
}

export function withTap(taps: Taps, entry: Logged): Taps {
  return { ...taps, [keyOf(entry)]: entry.log }
}

/** The Log to show against an Exercise: what was tapped here, else what arrived. */
export function logFor({
  taps,
  dayOrdinal,
  exercise,
}: {
  taps: Taps
  dayOrdinal: number
  exercise: Pick<Exercise, 'key' | 'log'>
}): Log | null {
  return taps[keyOf({ dayOrdinal, exerciseKey: exercise.key })] ?? exercise.log
}

/**
 * What one tap records. Exactly the shapes of ADR 0003 and nothing else: a rating or
 * a skip, carrying whatever was already written. No number is asked for or kept.
 */
export function tapOf({ chip, note }: { chip: Difficulty | 'skipped'; note: string }): Log {
  const written = writtenIn(note)

  return chip === 'skipped'
    ? { kind: 'skipped', note: written }
    : { kind: 'difficulty', difficulty: chip, note: written }
}

/**
 * What leaving the note alone records — null when there is nothing new to save, so
 * walking away from an untouched box costs nothing. A note with no rating is a Log
 * in its own right ("walked", "back hurt"); a note beside one keeps what was tapped.
 */
export function noteOf({ log, note }: { log: Log | null; note: string }): Log | null {
  const written = writtenIn(note)

  if (written === (log?.note ?? null)) {
    return null
  }

  if (log === null || log.kind === 'note') {
    // Cleared, there is no Log left to record: the three shapes hold no empty note,
    // and a Log is written, never deleted.
    return written === null ? null : { kind: 'note', note: written }
  }

  return log.kind === 'skipped' ? { kind: 'skipped', note: written } : { ...log, note: written }
}

/** An empty box is not a note, and neither is a box holding only spaces. */
function writtenIn(note: string): string | null {
  return note.trim() === '' ? null : note
}

/**
 * How much of the Day is left, counted against what it actually asks for. A Day
 * finishes itself — optional Exercises never block it, and a rest Day asks for none,
 * so the only thing that can finish one is the clock the server already read.
 */
export function tally({ taps, day }: { taps: Taps; day: Day }): { done: number; asked: number; complete: boolean } {
  const asked = day.exercises.filter((one) => !one.optional)
  const done = asked.filter((one) => logFor({ taps, dayOrdinal: day.ordinal, exercise: one }) !== null).length

  return { done, asked: asked.length, complete: day.kind === 'rest' ? day.complete : done === asked.length }
}
