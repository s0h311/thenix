import type { Weekday } from './training.ts'

const WEEKDAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * A Day carries an ordinal, never a date. Its place in the calendar is always
 * derived from the Week's start date, so moving the Week moves every Day with it.
 * Shared because the Preview re-dates a Revision's Days as the start date is typed.
 */
export function dateOfDay({ startDate, ordinal }: { startDate: string; ordinal: number }): {
  date: string
  weekday: Weekday
} {
  const date = new Date(`${startDate}T00:00:00Z`)

  date.setUTCDate(date.getUTCDate() + ordinal - 1)

  const weekday = WEEKDAYS[date.getUTCDay()]

  if (weekday === undefined) {
    throw new Error(`Day ${ordinal} of a Week starting ${startDate} has no weekday`)
  }

  return { date: date.toISOString().slice(0, 10), weekday }
}
