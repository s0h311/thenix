import { WeekView } from './WeekView.tsx'
import { useSave } from './useSaving.ts'
import { copyWeek } from '../../libs/Training/export.ts'
import type { Day, Week } from '../../../shared/training.ts'

/**
 * A Week the athlete can train from: the screen, wired to the server. Today's Week
 * and one taken off the shelf are the same thing here — last week's makeup session
 * is logged exactly as today's is, so only where the Day came from differs.
 */
export function TrainingWeek({ week, day }: { week: Week; day: Day | null }) {
  const save = useSave()

  return (
    <WeekView
      // Keyed by the Week, so nothing the screen is showing about one Week survives
      // opening another: a tap, a Day picked, a note half-written. What must survive
      // is held above the routes — the outbox is the phone's, not the Week's, and a
      // Log the server never got has to still be said out loud on whatever is opened
      // next. Its Saves carry their own Week, so trying again writes them home.
      key={week.number}
      week={week}
      day={day}
      onLog={(entry) => save({ weekNumber: week.number, kind: 'log', entry })}
      onNote={(entry) => save({ weekNumber: week.number, kind: 'note', entry })}
      onExport={() => copyWeek({ number: week.number })}
    />
  )
}
