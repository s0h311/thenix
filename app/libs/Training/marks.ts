import type { DayOnShelf } from '../../../shared/training.ts'

/**
 * How far a Day has got, in the three states anywhere Days are shown together —
 * the strip at the top of a Week, and the strip on a Week's card on the Shelf.
 * `part` is deliberately not "started": a Day carrying only a note ("walked") has
 * nothing logged on it and is still a Day something happened on.
 */
export type Mark = 'done' | 'part' | 'untouched'

/**
 * A Day's state as a shape and as a word. Both, always: the fill alone does not
 * survive a glance in daylight, and the word is what is read out. Twenty Weeks of
 * consistency are read at a glance or not at all.
 */
export const MARKS: Record<Mark, { glyph: string; said: string }> = {
  done: { glyph: '✓', said: 'done' },
  part: { glyph: '•', said: 'part trained' },
  untouched: { glyph: '○', said: 'untouched' },
}

/** One Day of a Week as its strip shows it. */
export type DayMark = { ordinal: number; mark: Mark }

/**
 * The mark a Day carries, from the two things that decide it. Done comes first:
 * a rest Day the calendar has passed and a Day asking only for Optional work are
 * both finished with nothing recorded on them, and finished is what they read as.
 */
export function markOf({ complete, touched }: { complete: boolean; touched: boolean }): Mark {
  if (complete) {
    return 'done'
  }

  return touched ? 'part' : 'untouched'
}

/**
 * A Week's Days, in the order they are trained. Sorted by ordinal rather than
 * trusted in order, and never renumbered: a Revision that dropped a Day leaves a
 * gap, and the ordinal is the Day.
 */
export function marksOf(days: DayOnShelf[]): DayMark[] {
  return days
    .toSorted((one, other) => one.ordinal - other.ordinal)
    .map((day) => ({ ordinal: day.ordinal, mark: markOf(day) }))
}
