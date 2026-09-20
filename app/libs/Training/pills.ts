import { logFor, tally } from './logging.ts'
import { markOf } from './marks.ts'
import type { Taps } from './logging.ts'
import type { Mark } from './marks.ts'
import type { Day, Week, Weekday } from '../../../shared/training.ts'

export type { Mark } from './marks.ts'

/** One Day as the strip at the top of the Week shows it. */
export type Pill = {
  ordinal: number
  weekday: Weekday
  mark: Mark
}

/** The Day notes being written on screen, by the Day they belong to. */
export type Notes = Readonly<Record<number, string>>

/**
 * The Days of a Week, in the order they are trained, each with what has happened on
 * it. Sorted by ordinal rather than trusted in order, and never renumbered: a
 * Revision that dropped a Day leaves a gap, and the ordinal is the Day.
 *
 * Which pill is today is not answered here — that is the athlete's own date against
 * the Week on screen, and it is one conditional where the strip is rendered.
 */
export function pillsOf({ week, taps, notes }: { week: Week; taps: Taps; notes: Notes }): Pill[] {
  return week.days
    .toSorted((one, other) => one.ordinal - other.ordinal)
    .map((day) => ({
      ordinal: day.ordinal,
      weekday: day.weekday,
      // The same two questions the Shelf's strip asks, answered here against what has
      // been tapped on screen rather than against what the server has been told.
      mark: markOf({ complete: tally({ taps, day }).complete, touched: touched({ day, taps, notes }) }),
    }))
}

/**
 * Whether anything at all was recorded on the Day. Anything means anything: a Log on
 * an Exercise the Day asks for or on one it only offers, the Day's own note, and the
 * work of a Day whose Exercise the plan has since dropped.
 */
function touched({ day, taps, notes }: { day: Day; taps: Taps; notes: Notes }): boolean {
  if (written(notes[day.ordinal] ?? day.log)) {
    return true
  }

  if (day.orphans.length > 0) {
    return true
  }

  return day.exercises.some((exercise) => logFor({ taps, dayOrdinal: day.ordinal, exercise }) !== null)
}

/** An empty box is not a note, and neither is a note the athlete has just taken back. */
function written(note: string | null | undefined): boolean {
  return note !== null && note !== undefined && note.trim() !== ''
}
