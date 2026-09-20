import { useState } from 'react'
import { asImport, asMoved, asRevision } from '../../libs/Training/notation.ts'
import type { Revision, WeekPreview } from '../../../shared/training.ts'

/**
 * The Week as it parsed, with the date it would start on — the step between pasting
 * and saving. What is shown is the parse and never the paste: a Week that read
 * differently from what the athlete expected is only visible from this side, and
 * catching it here costs a second tap instead of a re-import.
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
    <section className='space-y-4'>
      <h2 className='text-xl font-semibold'>Week {preview.number}, as it read</h2>
      <p>Check this is the Week your coach wrote, then pick the day it starts.</p>
      {revising === null ? null : (
        <p className='rounded-md bg-legacy-surface px-3 py-2 font-semibold text-legacy'>
          {asRevision({ number: preview.number, revising })}
        </p>
      )}
      {preview.notes === null ? null : <p className='text-sm'>{preview.notes}</p>}

      {preview.days.map((day) => (
        <article
          key={day.ordinal}
          className='space-y-1'
        >
          <h3 className='font-semibold'>{[`Day ${day.ordinal}`, day.focus].filter(Boolean).join(' · ')}</h3>
          {day.exercises.length === 0 ? (
            <p className='text-sm'>A Day that asks for nothing.</p>
          ) : (
            <ul className='space-y-1 text-sm'>
              {day.exercises.map((exercise) => (
                <li key={exercise.key}>
                  <span className='font-semibold'>{exercise.name}</span> — <span>{exercise.raw}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}

      <label className='flex items-center gap-3 font-semibold'>
        Starts on
        <input
          type='date'
          required
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className='rounded-md bg-legacy-surface px-3 py-2 font-normal text-legacy'
        />
      </label>
      {moving === null ? null : (
        <p
          aria-live='polite'
          className='rounded-md border border-legacy px-3 py-2 font-semibold text-legacy'
        >
          {moving}
        </p>
      )}
      <button
        type='button'
        onClick={() => onConfirm(startsOn)}
        className='w-full rounded-md bg-legacy px-3 py-2 font-semibold text-white'
      >
        {asImport({ number: preview.number, revising })}
      </button>
      <button
        type='button'
        onClick={onBack}
        className='w-full rounded-md border border-legacy px-3 py-2 font-semibold text-legacy'
      >
        Paste a different Week
      </button>
    </section>
  )
}
