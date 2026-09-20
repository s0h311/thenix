import type { Day, Exercise, Orphan, Week } from '../../../shared/training.ts'

/**
 * A Week as it comes off the database, before anything is derived from the athlete's
 * clock. Completion belongs to reading a Week *today*; handing one back does not.
 */
export type PlannedWeek = Omit<Week, 'days'> & { days: PlannedDay[] }

type PlannedDay = Omit<Day, 'complete'>

/**
 * The Week the coach reads back: the plan it wrote, and what happened against it.
 *
 * It is a shape of its own rather than the screen's, because this is the other half
 * of the published interface of ADR 0001 — the coach writes to the import schema and
 * reads this, so neither may drift when the training screen changes its mind. What it
 * adds to what the coach sent is the start date (which the athlete picked), the dates
 * that follow from it, and every Log.
 */
export type ExportedWeek = {
  number: number
  startDate: string
  notes: string | null
  days: ExportedDay[]
}

type ExportedDay = {
  ordinal: number
  /** Derived from the start date. The weekday is not: the date already says it. */
  date: string
  kind: Day['kind']
  focus: string | null
  /** The coach's own words about the Day, as it sent them. */
  notes: string | null
  /** The athlete's note on the Day as a whole. Null when there was none. */
  log: string | null
  /** The plan, each Exercise carrying its Log — null where nothing was recorded. */
  exercises: Exercise[]
  /**
   * Work recorded against Exercises a later revision of this Week dropped. Present
   * only when there is some: the coach asked for it once, and it was done.
   */
  orphans?: Orphan[]
}

export function forCoach(week: PlannedWeek): ExportedWeek {
  return {
    number: week.number,
    startDate: week.startDate,
    notes: week.notes,
    days: week.days.map((day) => ({
      ordinal: day.ordinal,
      date: day.date,
      kind: day.kind,
      focus: day.focus,
      notes: day.notes,
      log: day.log,
      exercises: day.exercises,
      ...(day.orphans.length === 0 ? {} : { orphans: day.orphans }),
    })),
  }
}
