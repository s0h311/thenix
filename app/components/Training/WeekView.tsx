import { useState } from 'react'
import { asLoad, asPrescribed, asRest } from '../../libs/Training/notation.ts'
import type { MouseEvent } from 'react'
import type { Day, Exercise, Week } from '../../../shared/training.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The screen the athlete trains from. It opens on today's Day and never navigates
 * away from the Week: the other Days, and the Week's notes, are reachable from here
 * because a PAIN RULE is no use at the top of a document that has scrolled past.
 */
export function WeekView({ week, day }: { week: Week; day: Day | null }) {
  const [openOrdinal, setOpenOrdinal] = useState<number | null>(day?.ordinal ?? null)

  const open = week.days.find((one) => one.ordinal === openOrdinal) ?? null

  return (
    <div className='space-y-6'>
      {open === null ? (
        <section className='space-y-1'>
          <h1 className='text-2xl font-semibold'>Week {week.number}</h1>
          <p>Nothing is scheduled for today. Pick a Day to look at.</p>
        </section>
      ) : (
        <DayDetail
          day={open}
          today={day}
        />
      )}

      <WeekNotes notes={week.notes} />

      <DayStrip
        week={week}
        open={openOrdinal}
        onOpen={setOpenOrdinal}
      />
    </div>
  )
}

function DayDetail({ day, today }: { day: Day; today: Day | null }) {
  return (
    <section className='space-y-4'>
      <header className='space-y-1'>
        <p className='text-sm font-semibold'>
          Day {day.ordinal} · {dated(day)}
          {day.ordinal === today?.ordinal ? ' · Today' : ''}
        </p>
        <h1 className='text-2xl font-semibold'>{day.focus ?? (day.kind === 'rest' ? 'Full Rest' : 'Training')}</h1>
      </header>

      {day.kind === 'rest' ? (
        <p>Rest Day — nothing is asked of you.</p>
      ) : (
        <ul className='space-y-4'>
          {day.exercises.map((exercise) => (
            <ExerciseItem
              key={exercise.key}
              exercise={exercise}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ExerciseItem({ exercise }: { exercise: Exercise }) {
  return (
    <li className='space-y-1 rounded-md bg-brand-surface px-3 py-2'>
      <p className='flex flex-wrap items-baseline gap-2'>
        <span className='font-semibold'>{exercise.name}</span>
        {exercise.variant === null ? null : <span className='text-sm'>{exercise.variant}</span>}
        {exercise.side === 'left' || exercise.side === 'right' ? (
          <span className='text-sm font-semibold uppercase'>{exercise.side}</span>
        ) : null}
        {exercise.optional ? <span className='text-sm font-semibold'>Optional</span> : null}
      </p>

      <p className='flex flex-wrap items-baseline gap-2 font-mono text-sm'>
        <span className='text-base font-semibold'>
          {asPrescribed({ prescription: exercise.prescription, side: exercise.side })}
        </span>
        {exercise.load === null ? null : <span>{asLoad(exercise.load)}</span>}
        {exercise.tempo === null ? null : <span>{exercise.tempo}</span>}
        {exercise.restSeconds === null ? null : <span>{asRest(exercise.restSeconds)}</span>}
      </p>

      {exercise.cue === null ? null : <p className='text-sm'>{exercise.cue}</p>}

      {/* Raw is always shown: where the parse was partial, this line is the prescription. */}
      <p className='text-sm text-brand/70'>{exercise.raw}</p>
    </li>
  )
}

function WeekNotes({ notes }: { notes: string | null }) {
  const [shown, setShown] = useState(false)

  function toggle() {
    setShown(!shown)
  }

  if (notes === null) {
    return null
  }

  return (
    <section className='space-y-2'>
      <button
        type='button'
        onClick={toggle}
        aria-expanded={shown}
        className='w-full rounded-md bg-brand px-3 py-2 font-semibold text-white'
      >
        {shown ? 'Hide Week notes' : 'Week notes'}
      </button>
      {shown ? <p className='whitespace-pre-wrap text-sm'>{notes}</p> : null}
    </section>
  )
}

function DayStrip({ week, open, onOpen }: { week: Week; open: number | null; onOpen: (ordinal: number) => void }) {
  function openDay(event: MouseEvent<HTMLButtonElement>) {
    onOpen(Number(event.currentTarget.value))
  }

  return (
    // Deliberately not a list: the only listitems on this screen are the Exercises
    // the Day asks for, which is what a rest Day having none has to mean.
    <nav
      aria-label='The Days of this Week'
      className='flex flex-wrap gap-2'
    >
      {week.days.map((day) => (
        <button
          key={day.ordinal}
          type='button'
          value={day.ordinal}
          onClick={openDay}
          aria-current={day.ordinal === open}
          className='rounded-md bg-brand-surface px-3 py-2 text-sm aria-[current=true]:bg-brand aria-[current=true]:text-white'
        >
          Day {day.ordinal}
          {day.focus === null ? '' : ` · ${day.focus}`}
        </button>
      ))}
    </nav>
  )
}

/** "Monday 25 Aug" — the weekday is derived, so it is shown, never stored. */
function dated(day: Day): string {
  const [, month, dayOfMonth] = day.date.split('-')

  return `${day.weekday[0]?.toUpperCase()}${day.weekday.slice(1)} ${Number(dayOfMonth)} ${MONTHS[Number(month) - 1]}`
}
