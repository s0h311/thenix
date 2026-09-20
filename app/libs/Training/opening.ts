import type { Day, Week } from '../../../shared/training.ts'

/**
 * The Day the screen is on, and the Week it was picked off. A pick belongs to the
 * Week it was made on: Day 3 of Week 12 is not Day 3 of Week 13.
 */
export type Picked = { ordinal: number; ofWeek: number }

/**
 * Which Day of a Week the screen shows: the one the athlete picked off the strip,
 * else the one the Week opens on — today's Day when the Week covers today, and its
 * first Day when it does not. A Week off the shelf is trained from, not read, so
 * opening one on nothing costs a tap before its plan and its Logs are even visible.
 * Null is for a Week with no Days at all.
 */
export function openOn({ week, today, picked }: { week: Week; today: Day | null; picked: Picked | null }): Day | null {
  const days = week.days.toSorted((one, other) => one.ordinal - other.ordinal)
  const chosen = picked?.ofWeek === week.number ? days.find((one) => one.ordinal === picked.ordinal) : undefined

  return chosen ?? days.find((one) => one.ordinal === today?.ordinal) ?? days[0] ?? null
}
