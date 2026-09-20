import { useState } from 'react'
import { CopyButton } from './CopyButton.tsx'
import { logFor, noTaps, noteOf, tally, tapOf, withTap } from '../../libs/Training/logging.ts'
import { asDate, asLoad, asPrescribed, asRest } from '../../libs/Training/notation.ts'
import type { Logged, Noted, Taps } from '../../libs/Training/logging.ts'
import type { ChangeEvent, MouseEvent } from 'react'
import type { Day, Difficulty, Exercise, Log, Orphan, Week } from '../../../shared/training.ts'

/** The three chips of ADR 0003, in the order the athlete reads them. */
const RATINGS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'good', label: 'Good' },
  { difficulty: 'challenging', label: 'Challenging' },
]

export type { Logged, Noted } from '../../libs/Training/logging.ts'

/**
 * The screen the athlete trains from. It opens on today's Day and never navigates
 * away from the Week: the other Days, and the Week's notes, are reachable from here
 * because a PAIN RULE is no use at the top of a document that has scrolled past.
 */
export function WeekView({
  week,
  day,
  onLog,
  onNote,
  onExport,
}: {
  week: Week
  day: Day | null
  onLog: (entry: Logged) => void
  onNote: (entry: Noted) => void
  /** Puts this Week, Logs and all, where the coach can be handed it. */
  onExport: () => Promise<void>
}) {
  const [openOrdinal, setOpenOrdinal] = useState<number | null>(day?.ordinal ?? null)
  const [taps, setTaps] = useState<Taps>(noTaps)
  const [noted, setNoted] = useState<Record<number, string>>({})

  const open = week.days.find((one) => one.ordinal === openOrdinal) ?? null

  function record(entry: Logged) {
    setTaps((current) => withTap(current, entry))
    onLog(entry)
  }

  function note(entry: Noted) {
    setNoted((current) => ({ ...current, [entry.dayOrdinal]: entry.note }))
    onNote(entry)
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
          taps={taps}
          note={noted[open.ordinal] ?? open.log}
          onLog={record}
          onNote={note}
        />
      )}

      <WeekNotes notes={week.notes} />

      <Export onExport={onExport} />

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
  taps,
  note,
  onLog,
  onNote,
}: {
  day: Day
  today: Day | null
  taps: Taps
  note: string | null
  onLog: (entry: Logged) => void
  onNote: (entry: Noted) => void
}) {
  return (
    <section className='space-y-4'>
      <header className='space-y-1'>
        <p className='text-sm font-semibold'>
          Day {day.ordinal} · {dated(day)}
          {day.ordinal === today?.ordinal ? ' · Today' : ''}
        </p>
        <h1 className='text-2xl font-semibold'>{day.focus ?? (day.kind === 'rest' ? 'Full Rest' : 'Training')}</h1>
        <Progress
          day={day}
          taps={taps}
        />
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
              log={logFor({ taps, dayOrdinal: day.ordinal, exercise })}
              onLog={onLog}
            />
          ))}
        </ul>
      )}

      <Orphans orphans={day.orphans} />

      <DayNote
        key={day.ordinal}
        dayOrdinal={day.ordinal}
        note={note}
        onNote={onNote}
      />
    </section>
  )
}

/**
 * How much of the Day is left, and whether it is over. Nothing here is a button: a
 * Day finishes when the last Exercise it asks for is logged, or — for a rest Day,
 * which asks for none — when its date has passed, which the server already derived.
 */
function Progress({ day, taps }: { day: Day; taps: Taps }) {
  const { done, asked, complete } = tally({ taps, day })

  if (!complete && asked === 0) {
    return null
  }

  return (
    <p
      aria-live='polite'
      className='text-sm font-semibold'
    >
      {complete ? <span>✓ Day done</span> : <span>{`${done} of ${asked} logged`}</span>}
    </p>
  )
}

/**
 * Somewhere to put what belongs to the Day and not to any Exercise on it — "swapped
 * with day 4", "walked". It is on a rest Day too, which is the whole point: recording
 * a walk must never require inventing an Exercise to hang it off.
 */
function DayNote({
  dayOrdinal,
  note,
  onNote,
}: {
  dayOrdinal: number
  note: string | null
  onNote: (entry: Noted) => void
}) {
  const [text, setText] = useState(note ?? '')

  function write(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.currentTarget.value)
  }

  /** Saved the moment it is left alone, like every other Log on this screen. */
  function keep() {
    if (text.trim() === (note ?? '')) {
      return
    }

    onNote({ dayOrdinal, note: text.trim() })
  }

  return (
    <div className='space-y-1'>
      <textarea
        aria-label={`Note on Day ${dayOrdinal}`}
        value={text}
        onChange={write}
        onBlur={keep}
        rows={2}
        placeholder='Anything about the Day itself'
        className='w-full rounded-md border border-brand bg-white px-3 py-2 text-sm'
      />
    </div>
  )
}

/**
 * What was done against Exercises the coach has since dropped. Shown under the Day
 * it happened on, and shown read-only: the plan moved on, the work did not, and
 * there is nothing left to tap on an Exercise that is no longer asked for.
 */
function Orphans({ orphans }: { orphans: Orphan[] }) {
  if (orphans.length === 0) {
    return null
  }

  return (
    <section className='space-y-2'>
      <h2 className='text-sm font-semibold'>No longer in the plan</h2>
      <ul className='space-y-2'>
        {orphans.map((orphan) => (
          <li
            key={orphan.key}
            className='space-y-1 rounded-md border border-brand px-3 py-2'
          >
            <p className='flex flex-wrap items-baseline gap-2'>
              <span className='font-semibold'>{named(orphan)}</span>
              {orphan.variant === null ? null : <span className='text-sm'>{orphan.variant}</span>}
            </p>
            <p className='text-sm'>{asLogged(orphan.log)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A Log in one line, for reading back rather than tapping. */
function asLogged(entry: Log): string {
  return [rated(entry), entry.note].filter((part) => part !== null && part !== '').join(' · ')
}

function rated(entry: Log): string | null {
  if (entry.kind === 'skipped') {
    return 'Skipped'
  }

  if (entry.kind === 'difficulty') {
    return RATINGS.find((one) => one.difficulty === entry.difficulty)?.label ?? null
  }

  return null
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

  function send(entry: Log) {
    onLog({ dayOrdinal, exerciseKey: exercise.key, log: entry })
  }

  function rate(event: MouseEvent<HTMLButtonElement>) {
    send(tapOf({ chip: event.currentTarget.value as Difficulty, note }))
  }

  function skip() {
    send(tapOf({ chip: 'skipped', note }))
  }

  function write(event: ChangeEvent<HTMLTextAreaElement>) {
    setNote(event.currentTarget.value)
  }

  /** The note is saved the moment it is left alone — it keeps whatever was tapped. */
  function keep() {
    const entry = noteOf({ log, note })

    if (entry !== null) {
      send(entry)
    }
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
function named(exercise: Pick<Exercise, 'name' | 'side'>): string {
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

/**
 * The other end of the loop: the Week, its Logs and the work the plan dropped, on
 * the clipboard in one tap. Nothing is shown of what was copied — the athlete never
 * reads the JSON, and the coach is handed it with a paste.
 */
function Export({ onExport }: { onExport: () => Promise<void> }) {
  return (
    <CopyButton
      label='Export for coach'
      copied='Copied — paste it to your coach.'
      failed='The Week could not be copied. Try again.'
      onCopy={onExport}
    />
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
  return `${day.weekday[0]?.toUpperCase()}${day.weekday.slice(1)} ${asDate(day.date)}`
}
