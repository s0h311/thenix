/**
 * Whether a Day is done, and whether a Revision can still reach it. Shared because
 * both writers of the plan ask it — the server on the write, and the athlete's screen
 * on the Preview — and two copies of one rule drift apart.
 */

import { dateOfDay } from './dayDate.ts'
import type { Asked, Day, ShelvedDay } from './training.ts'

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
function isSettled({ date, today, done }: { date: string; today: string; done: boolean }): boolean {
  return date < today || (date === today && done)
}

/**
 * Which ordinals a Revision written today, starting on `startDate`, cannot reach. The
 * one rule both the write and the Preview's marks go through. Settled belongs to the
 * ordinal and its date, not to a row: a Day the shelf no longer holds is Settled all
 * the same. `shelved` is null for a Week number not on the shelf, which has no training
 * yet for the boundary to protect.
 */
export function settledBy({
  startDate,
  today,
  shelved,
}: {
  startDate: string
  today: string
  shelved: ShelvedDay[] | null
}): (ordinal: number) => boolean {
  if (shelved === null) {
    return () => false
  }

  return (ordinal) => {
    const { date } = dateOfDay({ startDate, ordinal })
    const day = shelved.find((one) => one.ordinal === ordinal)
    const done = day !== undefined && isDone({ kind: day.kind, date, asked: day.asked, today })

    return isSettled({ date, today, done })
  }
}
