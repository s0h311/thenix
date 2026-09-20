import { throwError } from '../../infrastructure/Utils/logging.ts'
import type { Weekday } from '../../../shared/training.ts'

const FEATURE = 'features/Training dayDate'

const WEEKDAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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

/**
 * Where a freshly pasted Week would start: training carries on from where it left
 * off, so the day after the last Week ended. With nothing to follow, the next Monday
 * — the coach writes no weekday at all, and a Week that starts the week is the guess
 * least likely to need changing. The athlete picks the real date either way.
 */
export function startAfter({ previousEnd, today }: { previousEnd: string | null; today: string }): string {
  if (previousEnd !== null) {
    return shifted({ date: previousEnd, by: 1 })
  }

  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()

  // Today, when today is already a Monday: the next occurrence, not the one after.
  return shifted({ date: today, by: (8 - weekday) % 7 })
}

function shifted({ date, by }: { date: string; by: number }): string {
  const shifting = new Date(`${date}T00:00:00Z`)

  shifting.setUTCDate(shifting.getUTCDate() + by)

  return shifting.toISOString().slice(0, 10)
}
