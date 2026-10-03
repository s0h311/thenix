import { useState } from 'react'
import { today } from '../../libs/Training/clock.ts'
import { setAsideOf } from '../../libs/Training/importing.ts'
import { asAsked, asImport, asMoved, asRevision, asSetAside } from '../../libs/Training/notation.ts'
import { Button } from '../UI/Button.tsx'
import { Card } from '../UI/Card.tsx'
import { Caution } from '../UI/Caution.tsx'
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
  // Worked out here rather than asked for, because it re-marks on every keystroke in
  // the date field — by the same rule the write goes through. The write reads its own
  // today, so a Preview confirmed after midnight sets aside one Day more than it shows.
  const { settled, setAside, withdrawing } = setAsideOf({
    ordinals: preview.days.map((day) => day.ordinal),
    revising,
    startsOn,
    today: today(),
  })
  const setAsideNote = asSetAside({ number: preview.number, setAside, of: preview.days.length, withdrawing })

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
              {/* Shown as it read rather than hidden, so a coach who rewrote a Day
                  already behind the athlete is seen doing it and can be asked why. */}
              {settled(day.ordinal) ? (
                <p className='text-label font-semibold text-ink-muted'>Already behind you — keeps the plan it had</p>
              ) : null}
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
        {/* Beside the date because the date moves it: the athlete watches Days come
            back into the Revision as the Week is moved forward. */}
        <p
          aria-live='polite'
          className='text-label font-semibold empty:hidden'
        >
          {setAsideNote}
        </p>
      </Card>
    </Layer>
  )
}
