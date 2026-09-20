import type { Load, Prescription, Range, Revision, Side, Weight } from '../../../shared/training.ts'

const EN_DASH = '–'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A Prescription in the notation the coach writes it in — `4×6/side`, `3×35s`,
 * `10–11 km @ 6:00–6:10/km`. The structure is what the app counts; this is what the
 * athlete reads mid-set, so it stays as terse as the Week prose it came from.
 */
export function asPrescribed({ prescription, side }: { prescription: Prescription; side: Side }): string {
  const written = notation(prescription)

  return side === 'each' && prescription.kind !== 'distance' ? `${written}/side` : written
}

function notation(prescription: Prescription): string {
  switch (prescription.kind) {
    case 'reps': {
      return prescription.reps === null
        ? `${prescription.sets}× max`
        : `${times(prescription.sets)}${bothEnds(prescription.reps)}`
    }
    case 'time': {
      return prescription.seconds === null
        ? `${prescription.sets}× max`
        : `${times(prescription.sets)}${heldFor(prescription.seconds)}`
    }
    case 'distance': {
      const covered = `${bothEnds(prescription.km)} km`

      return prescription.pace === null || prescription.pace === undefined
        ? covered
        : `${covered} @ ${prescription.pace}`
    }
    case 'rounds': {
      const work = notation(prescription.work)
      const alternating = prescription.recovery === null ? work : `${work} / ${notation(prescription.recovery)}`

      return `${prescription.rounds} rounds: ${alternating}`
    }
  }
}

/** What the Exercise is loaded with, written the way the coach writes it beside the sets. */
export function asLoad(load: Load): string {
  switch (load.kind) {
    case 'symmetric': {
      return withImplement({ written: weighing(load), implement: load.implement })
    }
    case 'perHand': {
      return withImplement({ written: `${weighing(load)}/hand`, implement: load.implement })
    }
    case 'asymmetric': {
      return withImplement({
        written: `L ${weighing(load.left)} / R ${weighing(load.right)}`,
        implement: load.implement,
      })
    }
    case 'bodyweight': {
      return 'bodyweight'
    }
    case 'improvised': {
      return load.description
    }
  }
}

/** Rest is a lever the coach moves, so it is written as prescribed, not as a bare number. */
export function asRest(restSeconds: Range): string {
  return `rest ${heldFor(restSeconds)}`
}

function weighing(weight: Weight): string {
  return `${weight.approx ? '~' : ''}${weight.value}${weight.unit}`
}

/** "25 Aug". The year is left out: a Week is read in the season it was trained. */
export function asDate(date: string): string {
  const [, month, dayOfMonth] = date.split('-')

  return `${Number(dayOfMonth)} ${MONTHS[Number(month) - 1]}`
}

/** The stretch a Week covers. A Week with no Days at all is shown by where it starts. */
export function asSpan({ startDate, endDate }: { startDate: string; endDate: string | null }): string {
  return endDate === null ? asDate(startDate) : `${asDate(startDate)} ${EN_DASH} ${asDate(endDate)}`
}

/**
 * What confirming would land on, for a Week number the athlete already has. A
 * revision replaces the plan, so the Logs are said out loud: the athlete is being
 * asked to overwrite a Week they may be halfway through training.
 */
export function asRevision({ number, revising }: { number: number; revising: Revision }): string {
  const shelf = `Week ${number} is already on your shelf, from ${asDate(revising.startDate)}`

  if (revising.logged === 0) {
    return `${shelf}. Importing replaces its plan.`
  }

  const logs = revising.logged === 1 ? '1 Log' : `${revising.logged} Logs`

  return `${shelf}, with ${logs} on it. Importing replaces the plan and keeps your Logs.`
}

/**
 * What confirming does, in the words of the button that does it. A Revision is not
 * an import: it replaces a Week the athlete may be halfway through, and the last
 * thing read before the tap should say so rather than say "Import this Week".
 */
export function asImport({ number, revising }: { number: number; revising: Revision | null }): string {
  return revising === null ? 'Import this Week' : `Replace Week ${number}`
}

/**
 * What moving a Revision's start date costs, said before it is confirmed. The date
 * field is the escape hatch for a Week imported on the wrong day, so it stays
 * editable — but a Day's date is derived from the Week's start, so re-dating a Week
 * that is already being trained takes every Log on it along. Null when nothing moves.
 */
export function asMoved({
  number,
  revising,
  startsOn,
}: {
  number: number
  revising: Revision | null
  startsOn: string
}): string | null {
  if (revising === null || startsOn === revising.startDate) {
    return null
  }

  const by = daysBetween({ from: revising.startDate, to: startsOn })
  const moves = `This moves Week ${number} ${by < 0 ? 'back' : 'forward'} ${counted({
    of: Math.abs(by),
    one: 'day',
  })}, to ${asDate(startsOn)}.`

  if (revising.logged === 0) {
    return moves
  }

  const logs = counted({ of: revising.logged, one: 'Log' })

  return `${moves} Its ${logs} ${revising.logged === 1 ? 'moves' : 'move'} with it.`
}

/** Both are ISO dates read at midnight UTC, so the difference is whole days. */
function daysBetween({ from, to }: { from: string; to: string }): number {
  const A_DAY = 24 * 60 * 60 * 1000

  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / A_DAY
}

function counted({ of, one }: { of: number; one: string }): string {
  return of === 1 ? `1 ${one}` : `${of} ${one}s`
}

function withImplement({ written, implement }: { written: string; implement?: string | null }): string {
  return implement === null || implement === undefined ? written : `${written} (${implement})`
}

/** A single set is not worth announcing: the warm-up is `10–12 min`, not `1×10–12 min`. */
function times(sets: number): string {
  return sets === 1 ? '' : `${sets}×`
}

/** Seconds while they read as seconds, minutes once they do not. */
function heldFor(seconds: Range): string {
  const inMinutes = seconds.max >= 120 && seconds.min % 60 === 0 && seconds.max % 60 === 0

  return inMinutes ? `${bothEnds({ min: seconds.min / 60, max: seconds.max / 60 })} min` : `${bothEnds(seconds)}s`
}

function bothEnds(range: Range): string {
  return range.min === range.max ? `${range.max}` : `${range.min}${EN_DASH}${range.max}`
}

/**
 * What one Day of a pasted Week asks for, in the line above its Exercises. A Week
 * read back on a full screen is scanned before it is read, and seven headings that
 * differ only in their ordinal cannot be scanned.
 *
 * A Day with no Exercises is read by its kind, so a rest Day is never mistaken for
 * one the coach left empty; a Day with Exercises is read by them, so a Day marked
 * rest that still carries work says the work rather than hiding it.
 */
export function asAsked({ kind, exercises }: { kind: 'training' | 'rest'; exercises: unknown[] }): string {
  if (exercises.length > 0) {
    return counted({ of: exercises.length, one: 'Exercise' })
  }

  return kind === 'rest' ? 'Rest' : 'Nothing asked for'
}
