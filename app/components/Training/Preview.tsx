import { useState } from 'react'
import { asAsked, asImport, asMoved, asRevision } from '../../libs/Training/notation.ts'
import { Button } from '../UI/Button.tsx'
import { Card } from '../UI/Card.tsx'
import { TextInput } from '../UI/Field.tsx'
import { Layer } from '../UI/Layer.tsx'
import type { Revision, WeekPreview } from '../../../shared/training.ts'

/**
 * The Week as it parsed, with the date it would start on — the step between pasting
 * and saving. What is shown is the parse and never the paste: a Week that read
 * differently from what the athlete expected is only visible from this side, and
 * catching it here costs a second tap instead of a re-import.
 *
 * It takes the whole viewport because of what is being confirmed: a paste can
 * replace the plan of a Week the athlete is halfway through, and reading back seven
 * Days should not mean scrolling past the box they pasted into.
 */
export function Preview({
  preview,
  startDate,
  revising,
  onConfirm,
  onBack,
}: {
  preview: WeekPreview
  /** Where the Week would start unless the athlete says otherwise. */
  startDate: string
  /** The Week this paste would replace, when the athlete already has that number. */
  revising: Revision | null
  onConfirm: (startDate: string) => void
  onBack: () => void
}) {
  const [startsOn, setStartsOn] = useState(startDate)
  // The date field is the escape hatch for a Week imported on the wrong day, so it
  // stays editable on a Revision too — but a Day's date is derived from the Week's
  // start, so moving one already being trained moves its Logs. That is said, not blocked.
  const moving = asMoved({ number: preview.number, revising, startsOn })

  return (
    <Layer
      heading={`Week ${preview.number}, as it read`}
      dismiss='Paste a different Week'
      onDismiss={onBack}
      footer={
        <Button
          tone='primary'
          onClick={() => onConfirm(startsOn)}
          className='w-full'
        >
          {asImport({ number: preview.number, revising })}
        </Button>
      }
    >
      <p className='text-ink-muted'>Check this is the Week your coach wrote, then pick the day it starts.</p>

      {revising === null ? null : <Caution>{asRevision({ number: preview.number, revising })}</Caution>}

      {preview.notes === null ? null : (
        <Card>
          <p className='whitespace-pre-wrap text-label'>{preview.notes}</p>
        </Card>
      )}

      <ul className='space-y-3'>
        {preview.days.map((day) => (
          <li key={day.ordinal}>
            <Card className='space-y-2'>
              <p className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                <span className='text-heading'>{[`Day ${day.ordinal}`, day.focus].filter(Boolean).join(' · ')}</span>
                {/* What the Day asks for, before any of it is read: seven headings
                    differing only in their ordinal cannot be scanned. */}
                <span className='ml-auto text-label text-ink-muted'>{asAsked(day)}</span>
              </p>
              {day.exercises.length === 0 ? null : (
                <ul className='space-y-1'>
                  {day.exercises.map((exercise) => (
                    <li key={exercise.key}>
                      <p className='font-semibold'>{exercise.name}</p>
                      {/* The coach's own line, which is what proves the Week read right. */}
                      <p className='text-label text-ink-muted'>{exercise.raw}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Card className='space-y-3'>
        <TextInput
          label='Starts on'
          type='date'
          required
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className='numerals'
        />
        {/* Announced, because it appears while the athlete is inside the date field. */}
        {moving === null ? null : <Caution live>{moving}</Caution>}
      </Card>
    </Layer>
  )
}

/**
 * What confirming costs, in the warning tokens rather than the brand: this is
 * something to read, never something to press.
 */
function Caution({ children, live = false }: { children: string; live?: boolean }) {
  return (
    <p
      aria-live={live ? 'polite' : undefined}
      className='rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-label font-semibold text-warning-ink'
    >
      {children}
    </p>
  )
}
