import { WeekView } from './WeekView.tsx'
import { useSaving } from './useSaving.ts'
import { copyWeek } from '../../libs/Training/export.ts'
import type { Day, Week } from '../../../shared/training.ts'

/**
 * A Week the athlete can train from: the screen, wired to the server. Today's Week
 * and one taken off the shelf are the same thing here — last week's makeup session
 * is logged exactly as today's is, so only where the Day came from differs.
 */
export function TrainingWeek({ week, day, refresh }: { week: Week; day: Day | null; refresh: string }) {
  const { record, note, unsaved, retry } = useSaving({ weekNumber: week.number, refresh })

  return (
    <WeekView
      week={week}
      day={day}
      onLog={record}
      onNote={note}
      unsaved={unsaved}
      onRetry={retry}
      onExport={() => copyWeek({ number: week.number })}
    />
  )
}
