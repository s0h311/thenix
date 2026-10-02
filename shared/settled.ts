/**
 * Whether a Day is done, and whether a Revision can still reach it. Shared because
 * both writers of the plan ask it — the server on the write, and the athlete's screen
 * on the Preview — and two copies of one rule drift apart.
 */

import type { Day } from './training.ts'

/**
 * What the Day asks for, as done measures it. An Exercise a Revision dropped is never
 * here: it is not asked for any more, and its Log is an Orphan — something recorded on
 * the Day rather than something outstanding on it.
 */
export type Asked = { optional: boolean; logged: boolean }

/**
 * Whether a Day has finished. Nothing stores this and nothing sets it: a training Day
 * is done when every Exercise it asks for has been logged, and an Exercise the coach
 * marked `(Optional)` is never one it asks for.
 */
export function isDone({
  kind,
  date,
  asked,
  today,
}: {
  kind: Day['kind']
  date: string
  /** Only what the Day asks for, reduced to the two things that decide it. */
  asked: Asked[]
  today: string
}): boolean {
  // A rest Day asks for nothing, so the only thing that can finish it is the clock —
  // and it is the athlete's clock, because that is where the resting happened.
  if (kind === 'rest') {
    return date < today
  }

  return asked.every((one) => one.optional || one.logged)
}

/**
 * Whether a Revision can still reach a Day: not once its date is behind the athlete's
 * today, nor once it is today and done. Today takes the new plan until then, because
 * the likeliest reason to paste a Week mid-week is the session about to be trained.
 * A Day skipped entirely is Settled too — the plan it was skipped against is part of
 * what happened (ADR 0004).
 */
export function isSettled({ date, today, done }: { date: string; today: string; done: boolean }): boolean {
  return date < today || (date === today && done)
}
