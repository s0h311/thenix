import { useState } from 'react'
import { CopyButton } from './CopyButton.tsx'
import { logFor, noTaps, noteOf, tally, tapOf, withTap } from '../../libs/Training/logging.ts'
import { asDate, asLoad, asPrescribed, asRest } from '../../libs/Training/notation.ts'
import { openOn } from '../../libs/Training/opening.ts'
import { pillsOf } from '../../libs/Training/pills.ts'
import type { Logged, Noted, Taps } from '../../libs/Training/logging.ts'
import type { Picked } from '../../libs/Training/opening.ts'
import type { Mark, Pill } from '../../libs/Training/pills.ts'
import type { ChangeEvent, MouseEvent } from 'react'
import type { Day, Difficulty, Exercise, Log, Orphan, Week } from '../../../shared/training.ts'

/** The three chips of ADR 0003, in the order the athlete reads them. */
const RATINGS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'good', label: 'Good' },
  { difficulty: 'challenging', label: 'Challenging' },
]

/**
 * A Day's state on the strip, as a shape and as a word. Both, always: the fill
 * alone does not survive a glance in daylight, and the word is what is read out.
 */
const MARKS: Record<Mark, { glyph: string; said: string }> = {
  done: { glyph: '✓', said: 'done' },
  part: { glyph: '•', said: 'part trained' },
  untouched: { glyph: '○', said: 'untouched' },
}

const PILL =
  'flex shrink-0 flex-col items-center gap-0.5 rounded-xl border border-hairline bg-raised px-3 py-2 text-ink-muted transition duration-100 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[current=true]:border-transparent aria-[current=true]:bg-brand aria-[current=true]:font-semibold aria-[current=true]:text-on-brand'

export type { Logged, Noted } from '../../libs/Training/logging.ts'

/**
 * The screen the athlete trains from. It opens on today's Day — or, for a Week off
 * the shelf that holds no today, on its first — and never navigates away from the
 * Week: the other Days, and the Week's notes, are reachable from here because a PAIN
 * RULE is no use at the top of a document that has scrolled past.
 */
export function WeekView({
  week,
  day,
  onLog,
  onNote,
  unsaved,
  onRetry,
  onExport,
}: {
  week: Week
  day: Day | null
  onLog: (entry: Logged) => void
  onNote: (entry: Noted) => void
  /** What is still on the phone, in words, or null while the server has it all. */
  unsaved: string | null
  onRetry: () => void
  /** Puts this Week, Logs and all, where the coach can be handed it. */
  onExport: () => Promise<void>
}) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [taps, setTaps] = useState<Taps>(noTaps)
  const [noted, setNoted] = useState<Record<number, string>>({})

  // Derived, never remembered: today's Day changes under the screen at local midnight
  // and when the Week being trained moves on, and a Day held from before would take
  // every tap with it — the Log would be written against the Day that has passed.
  const open = openOn({ week, today: day, picked })

  function pick(ordinal: number) {
    setPicked({ ordinal, ofWeek: week.number })
  }

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
      <Unsaved
        unsaved={unsaved}
        onRetry={onRetry}
      />

      <h1 className='text-display'>Week {week.number}</h1>

      <DayStrip
        pills={pillsOf({ week, taps, notes: noted })}
        open={open?.ordinal ?? null}
        today={day?.ordinal ?? null}
        onOpen={pick}
      />

      {open === null ? (
        <p>This Week holds no Days.</p>
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
    </div>
  )
}

/**
 * The one thing the screen must say out loud. A tap stays on screen the moment it
 * happens, which is right — and is also why a Log the server never got would sit
 * there looking recorded. The gym has no signal, the session ends, the Week goes to
 * the coach short. So it is said plainly, above the Day, and sending it again is a
 * tap: nothing is asked of the athlete mid-set beyond one they can ignore till later.
 */
function Unsaved({ unsaved, onRetry }: { unsaved: string | null; onRetry: () => void }) {
  if (unsaved === null) {
    return null
  }

  return (
    <section
      role='alert'
      className='flex flex-wrap items-center gap-3 rounded-md border-2 border-legacy bg-legacy-surface px-3 py-2'
    >
      <p className='text-sm font-semibold'>{unsaved}</p>
      <button
        type='button'
        onClick={onRetry}
        className='rounded-md bg-legacy px-3 py-2 text-sm font-semibold text-white'
      >
        Save them now
      </button>
    </section>
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
        {/* The screen's heading is the Week; the Day under it is a level down. */}
        <h2 className='text-title'>{day.focus ?? (day.kind === 'rest' ? 'Full Rest' : 'Training')}</h2>
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
        className='w-full rounded-md border border-legacy bg-white px-3 py-2 text-sm'
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
            className='space-y-1 rounded-md border border-legacy px-3 py-2'
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
    <li className='space-y-1 rounded-md bg-legacy-surface px-3 py-2'>
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
      <p className='text-sm text-legacy/70'>{exercise.raw}</p>

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

  function send(entry: Log | null) {
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

  /**
   * The note is saved the moment it is left alone — it keeps whatever was tapped, and
   * emptying a note that was the whole Log takes that Log back.
   */
  function keep() {
    const recorded = noteOf({ log, note })

    if (recorded !== null) {
      send(recorded.log)
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
        className='w-full rounded-md border border-legacy bg-white px-3 py-2 text-sm'
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
      className='rounded-md border border-legacy bg-white px-4 py-3 text-sm text-legacy aria-pressed:bg-legacy aria-pressed:font-semibold aria-pressed:text-white'
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
        className='w-full rounded-md bg-legacy px-3 py-2 font-semibold text-white'
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

/**
 * Where the athlete is in the Week, and every other Day of it, at the top of the
 * screen: the foot of a phone is the tab bar now, and a Day can be long enough that
 * a strip under it is a scroll away mid-set. Pinned, so moving Day never costs one.
 *
 * Each state is a shape as well as a fill — a tick, a dot, a ring — because the
 * whole point of the strip is being read at a glance, in daylight, one-handed.
 */
function DayStrip({
  pills,
  open,
  today,
  onOpen,
}: {
  pills: Pill[]
  open: number | null
  today: number | null
  onOpen: (ordinal: number) => void
}) {
  function openDay(event: MouseEvent<HTMLButtonElement>) {
    onOpen(Number(event.currentTarget.value))
  }

  if (pills.length === 0) {
    return null
  }

  return (
    // Deliberately not a list: the only listitems on this screen are the Exercises
    // the Day asks for, which is what a rest Day having none has to mean.
    <nav
      aria-label='The Days of this Week'
      className='sticky top-0 z-30 -mx-4 overflow-x-auto border-b border-hairline bg-page px-4 py-2'
    >
      <div className='flex gap-2'>
        {pills.map((pill) => (
          <button
            key={pill.ordinal}
            type='button'
            value={pill.ordinal}
            onClick={openDay}
            aria-current={pill.ordinal === open}
            aria-label={nameOf(pill, pill.ordinal === today)}
            className={`${PILL} ${pill.ordinal === today ? 'ring-2 ring-ink' : ''}`}
          >
            <span
              aria-hidden='true'
              className='text-caption uppercase'
            >
              {pill.weekday.slice(0, 3)}
            </span>
            <span
              aria-hidden='true'
              className='numerals text-label'
            >
              Day {pill.ordinal}
            </span>
            <span
              aria-hidden='true'
              className='text-caption leading-none'
            >
              {MARKS[pill.mark].glyph}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

/**
 * What one pill says out loud. The state is a word here and a shape on screen, and
 * today is named rather than left to the ring around it: a strip whose "you are
 * here" and "today" are both marks needs the difference said.
 */
function nameOf(pill: Pill, isToday: boolean): string {
  const weekday = `${pill.weekday[0]?.toUpperCase()}${pill.weekday.slice(1)}`

  return [`Day ${pill.ordinal}`, weekday, isToday ? 'today' : null, MARKS[pill.mark].said]
    .filter((part) => part !== null)
    .join(', ')
}

/** "Monday 25 Aug" — the weekday is derived, so it is shown, never stored. */
function dated(day: Day): string {
  return `${day.weekday[0]?.toUpperCase()}${day.weekday.slice(1)} ${asDate(day.date)}`
}
