import { useState } from 'react'
import { asLoad, asPrescribed, asRest } from '../../libs/Training/notation.ts'
import type { ChangeEvent, MouseEvent } from 'react'
import type { Day, Difficulty, Exercise, Log, Week } from '../../../shared/training.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The three chips of ADR 0003, in the order the athlete reads them. */
const RATINGS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'good', label: 'Good' },
  { difficulty: 'challenging', label: 'Challenging' },
]

/** One Log, named by where it belongs — logging acts on whichever Day is open. */
export type Logged = { dayOrdinal: number; exerciseKey: string; log: Log }

/**
 * The screen the athlete trains from. It opens on today's Day and never navigates
 * away from the Week: the other Days, and the Week's notes, are reachable from here
 * because a PAIN RULE is no use at the top of a document that has scrolled past.
 */
export function WeekView({ week, day, onLog }: { week: Week; day: Day | null; onLog: (entry: Logged) => void }) {
  const [openOrdinal, setOpenOrdinal] = useState<number | null>(day?.ordinal ?? null)
  // What has been tapped since the screen opened. The tap is the save, so the screen
  // answers from here rather than waiting for the Week to come back around.
  const [logged, setLogged] = useState<Record<string, Log>>({})

  const open = week.days.find((one) => one.ordinal === openOrdinal) ?? null

  function record(entry: Logged) {
    setLogged((current) => ({ ...current, [`${entry.dayOrdinal}:${entry.exerciseKey}`]: entry.log }))
    onLog(entry)
  }

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
          logged={logged}
          onLog={record}
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

function DayDetail({
  day,
  today,
  logged,
  onLog,
}: {
  day: Day
  today: Day | null
  logged: Record<string, Log>
  onLog: (entry: Logged) => void
}) {
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
              // Keyed by Day too: one Movement recurs across Days under one key, and
              // the note being written must not follow it there.
              key={`${day.ordinal}:${exercise.key}`}
              exercise={exercise}
              dayOrdinal={day.ordinal}
              log={logged[`${day.ordinal}:${exercise.key}`] ?? exercise.log}
              onLog={onLog}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ExerciseItem({
  exercise,
  dayOrdinal,
  log,
  onLog,
}: {
  exercise: Exercise
  dayOrdinal: number
  log: Log | null
  onLog: (entry: Logged) => void
}) {
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

      <LogControls
        exercise={exercise}
        dayOrdinal={dayOrdinal}
        log={log}
        onLog={onLog}
      />
    </li>
  )
}

/**
 * The whole of logging: three ratings, a skip, and somewhere to write. There is no
 * save button — the tap is the save, because the phone is on the floor mid-set and
 * nothing may be lost by walking away. Numbers are deliberately absent (ADR 0003).
 */
function LogControls({
  exercise,
  dayOrdinal,
  log,
  onLog,
}: {
  exercise: Exercise
  dayOrdinal: number
  log: Log | null
  onLog: (entry: Logged) => void
}) {
  const [note, setNote] = useState(log?.note ?? '')

  const chosen = log?.kind === 'difficulty' ? log.difficulty : null
  const written = note.trim() === '' ? null : note

  function send(entry: Log) {
    onLog({ dayOrdinal, exerciseKey: exercise.key, log: entry })
  }

  function rate(event: MouseEvent<HTMLButtonElement>) {
    send({ kind: 'difficulty', difficulty: event.currentTarget.value as Difficulty, note: written })
  }

  function skip() {
    send({ kind: 'skipped', note: written })
  }

  function write(event: ChangeEvent<HTMLTextAreaElement>) {
    setNote(event.currentTarget.value)
  }

  /** The note is saved the moment it is left alone — it keeps whatever was tapped. */
  function keep() {
    if (written === (log?.note ?? null)) {
      return
    }

    if (log === null || log.kind === 'note') {
      // A note with no rating is a Log in its own right — "walked", "back hurt".
      if (written !== null) {
        send({ kind: 'note', note: written })
      }

      return
    }

    send(log.kind === 'skipped' ? { kind: 'skipped', note: written } : { ...log, note: written })
  }

  return (
    <div className='space-y-2 pt-1'>
      <fieldset
        aria-label={`How ${named(exercise)} went`}
        className='flex flex-wrap gap-2'
      >
        {RATINGS.map((rating) => (
          <Chip
            key={rating.difficulty}
            label={rating.label}
            name={`${rating.label} — ${named(exercise)}`}
            value={rating.difficulty}
            chosen={chosen === rating.difficulty}
            onChoose={rate}
          />
        ))}
        <Chip
          label='Skipped'
          name={`Skipped — ${named(exercise)}`}
          value='skipped'
          chosen={log?.kind === 'skipped'}
          onChoose={skip}
        />
      </fieldset>

      <textarea
        aria-label={`Note on ${named(exercise)}`}
        value={note}
        onChange={write}
        onBlur={keep}
        rows={2}
        placeholder='Anything worth telling the coach'
        className='w-full rounded-md border border-brand bg-white px-3 py-2 text-sm'
      />
    </div>
  )
}

/**
 * A tap target, not a toggle: the chosen one carries a tick as well as the fill, so
 * it reads without colour. Both pairs are the brand pairs already proven WCAG AA.
 */
function Chip({
  label,
  name,
  value,
  chosen,
  onChoose,
}: {
  label: string
  name: string
  value: string
  chosen: boolean
  onChoose: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type='button'
      value={value}
      aria-label={name}
      aria-pressed={chosen}
      onClick={onChoose}
      className='rounded-md border border-brand bg-white px-4 py-3 text-sm text-brand aria-pressed:bg-brand aria-pressed:font-semibold aria-pressed:text-white'
    >
      {chosen ? <span aria-hidden='true'>✓ </span> : null}
      {label}
    </button>
  )
}

/** "Dips" alone is ambiguous when the left and right arm are separate Exercises. */
function named(exercise: Exercise): string {
  return exercise.side === 'left' || exercise.side === 'right' ? `${exercise.name} (${exercise.side})` : exercise.name
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
