import { tally } from './logging.ts'
import type { Taps } from './logging.ts'
import type { Day, Difficulty, Log } from '../../../shared/training.ts'

/** The three chips of ADR 0003, in the order the athlete reads them. */
export const RATINGS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'good', label: 'Good' },
  { difficulty: 'challenging', label: 'Challenging' },
]

/**
 * How far the Day has got, in the words the screen says it in — and nothing at all
 * when there is nothing to say. `complete` is carried beside the words because the
 * screen marks a finished Day with a shape as well, and a tick is not a sentence.
 */
export type Progress = { complete: boolean; said: string }

/**
 * Where the athlete is in the Day, without counting it themselves. Nothing here is
 * a button: a Day finishes when the last Exercise it asks for is logged, and a rest
 * Day — which asks for none — finishes on the clock the server already read.
 *
 * A rest Day still to come says nothing rather than "0 of 0": an empty Day is not a
 * Day left undone, and the screen already says plainly that nothing is asked.
 */
export function progressOf({ taps, day }: { taps: Taps; day: Day }): Progress | null {
  const { done, asked, complete } = tally({ taps, day })

  if (complete) {
    return { complete: true, said: 'Day done' }
  }

  return asked === 0 ? null : { complete: false, said: `${done} of ${asked} logged` }
}

/**
 * What the Day is called. The coach's Focus when there is one — a Week is read in
 * the coach's words — and otherwise what kind of Day it is, because "Full Rest" is
 * a Day with nothing asked of the athlete and an untitled Day is not a broken one.
 */
export function headingOf(day: Pick<Day, 'focus' | 'kind'>): string {
  return day.focus ?? (day.kind === 'rest' ? 'Full Rest' : 'Training')
}

/**
 * A Log in one line, for the work of an Exercise the plan has since dropped: there
 * is nothing left to tap on it, so what was recorded is read back instead. The
 * rating is the athlete's own word for it, never the `difficulty` it is stored as.
 */
export function asLogged(log: Log): string {
  return [rated(log), log.note].filter((part) => part !== null && part !== '').join(' · ')
}

function rated(log: Log): string | null {
  switch (log.kind) {
    case 'skipped': {
      return 'Skipped'
    }
    case 'difficulty': {
      return RATINGS.find((rating) => rating.difficulty === log.difficulty)?.label ?? null
    }
    case 'note': {
      return null
    }
  }
}
