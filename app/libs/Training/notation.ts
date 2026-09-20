import type { Load, Prescription, Range, Side, Weight } from '../../../shared/training.ts'

const EN_DASH = '–'

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
