import { throwError } from '../../infrastructure/Utils/logging.ts'

const FEATURE = 'features/Training dayDate'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export type Weekday = (typeof WEEKDAYS)[number]

/**
 * A Day carries an ordinal, never a date. Its place in the calendar is always
 * derived from the Week's start date, so moving the Week moves every Day with it.
 */
export function dateOfDay({ startDate, ordinal }: { startDate: string; ordinal: number }): {
  date: string
  weekday: Weekday
} {
  const date = new Date(`${startDate}T00:00:00Z`)

  date.setUTCDate(date.getUTCDate() + ordinal - 1)

  const weekday = WEEKDAYS[date.getUTCDay()]

  if (weekday === undefined) {
    throwError({ feature: FEATURE, message: 'Day has no weekday', additional: { startDate, ordinal } })
  }

  return { date: date.toISOString().slice(0, 10), weekday }
}
