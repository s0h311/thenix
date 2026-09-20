import { useState } from 'react'
import { CopyButton } from './CopyButton.tsx'
import { Button } from '../UI/Button.tsx'
import { Card } from '../UI/Card.tsx'
import { Chip } from '../UI/Chip.tsx'
import { TextArea } from '../UI/Field.tsx'
import { RATINGS, asLogged, headingOf, progressOf } from '../../libs/Training/day.ts'
import { logFor, noTaps, noteOf, tapOf, withTap } from '../../libs/Training/logging.ts'
import { MARKS } from '../../libs/Training/marks.ts'
import { asDate, asLoad, asPrescribed, asRest } from '../../libs/Training/notation.ts'
import { openOn } from '../../libs/Training/opening.ts'
import { pillsOf } from '../../libs/Training/pills.ts'
import type { Logged, Noted, Taps } from '../../libs/Training/logging.ts'
import type { Picked } from '../../libs/Training/opening.ts'
import type { Pill } from '../../libs/Training/pills.ts'
import type { Alert } from '../../libs/Training/saving.ts'
import type { ChangeEvent, MouseEvent, ReactNode } from 'react'
import type { Day, Difficulty, Exercise, Log, Orphan, Week } from '../../../shared/training.ts'

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
  onDismiss,
  onExport,
}: {
  week: Week
  day: Day | null
  onLog: (entry: Logged) => void
  onNote: (entry: Noted) => void
  /** What is still on the phone, in words, or null while the server has it all. */
  unsaved: Alert | null
  onRetry: () => void
  /** Lets go of the Saves the server will not take, which nothing else can clear. */
  onDismiss: () => void
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
      <h1 className='text-display'>Week {week.number}</h1>

      <DayStrip
        pills={pillsOf({ week, taps, notes: noted })}
        open={open?.ordinal ?? null}
        today={day?.ordinal ?? null}
        onOpen={pick}
      />

      {open === null ? (
        <p className='text-ink-muted'>This Week holds no Days.</p>
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

      <Unsaved
        unsaved={unsaved}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </div>
  )
}

/**
 * The one thing the screen must say out loud. A tap stays on screen the moment it
 * happens, which is right — and is also why a Log the server never got would sit
 * there looking recorded. The gym has no signal, the session ends, the Week goes to
 * the coach short. So it is said plainly and sending it again is a tap: nothing is
 * asked of the athlete mid-set beyond one they can ignore till later.
 *
 * It pins directly above the tab bar rather than sitting above the Day, because a
 * Day is a long scroll and a warning at the top of it is a warning that is missed —
 * and because the foot of the screen is where the thumb already is.
 *
 * In the warning tokens, never the brand: the fault this replaces was an amber
 * block that read as the one thing on the screen to press.
 *
 * The one button is whatever the alert says it is. A Save the server will not take
 * is not an errand — sending it again only spends the tap — so there the button lets
 * it go, and the bar can be cleared rather than pinned here for the session.
 */
function Unsaved({
  unsaved,
  onRetry,
  onDismiss,
}: {
  unsaved: Alert | null
  onRetry: () => void
  onDismiss: () => void
}) {
  if (unsaved === null) {
    return null
  }

  return (
    <>
      {/* The bar is out of the flow, so the foot of the screen is held clear of it:
          the Export button beneath it is still reachable while it is up. */}
      <div
        aria-hidden='true'
        className='h-20'
      />

      <div className='fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-40 px-4 pb-2 md:bottom-0 md:pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]'>
        <section
          role='alert'
          className='mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-line bg-warning-soft px-4 py-3 shadow-lg'
        >
          <p className='text-label font-semibold text-warning-ink'>{unsaved.said}</p>
          <Button
            tone='destructive'
            onClick={unsaved.does === 'retry' ? onRetry : onDismiss}
          >
            {unsaved.action}
          </Button>
        </section>
      </div>
    </>
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
        <p className='text-label text-ink-muted'>
          <span className='numerals'>
            Day {day.ordinal} · {dated(day)}
          </span>
          {day.ordinal === today?.ordinal ? ' · Today' : ''}
        </p>
        {/* The screen's heading is the Week; the Day under it is a level down. */}
        <h2 className='text-title'>{headingOf(day)}</h2>
        <Progress
          day={day}
          taps={taps}
        />
      </header>

      {day.kind === 'rest' ? (
        <Card>
          <p className='text-ink-muted'>Rest Day — nothing is asked of you.</p>
        </Card>
      ) : (
        <ul className='space-y-3'>
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
 * How much of the Day is left, and whether it is over. Nothing here is a button, and
 * the tick is a shape beside the words rather than instead of them — a finished Day
 * reads as finished without colour.
 */
function Progress({ day, taps }: { day: Day; taps: Taps }) {
  const progress = progressOf({ taps, day })

  if (progress === null) {
    return null
  }

  return (
    <p
      aria-live='polite'
      className='numerals text-label font-semibold text-ink-muted'
    >
      {progress.complete ? <span aria-hidden='true'>✓ </span> : null}
      {progress.said}
    </p>
  )
}

/**
 * Somewhere to put what belongs to the Day and not to any Exercise on it — "swapped
 * with day 4", "walked". It is on a rest Day too, which is the whole point: recording
 * a walk must never require inventing an Exercise to hang it off. Unlike an
 * Exercise's, it is one box on the screen rather than seven, so it is never hidden.
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
    <Card>
      <TextArea
        label={`Note on Day ${dayOrdinal}`}
        value={text}
        onChange={write}
        onBlur={keep}
        rows={2}
        placeholder='A walk, a swap, anything about the Day itself'
      />
    </Card>
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
      <h3 className='text-heading'>No longer in the plan</h3>
      <ul className='space-y-2'>
        {orphans.map((orphan) => (
          <li key={orphan.key}>
            <Card className='space-y-1'>
              <p className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                <span className='font-semibold'>{named(orphan)}</span>
                {orphan.variant === null ? null : <span className='text-label text-ink-muted'>{orphan.variant}</span>}
              </p>
              <p className='text-label text-ink-muted'>{asLogged(orphan.log)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * One Exercise, on a raised card, with everything the coach asked for in plain
 * sight. Nothing here is behind a tap: this is what is read between sets, with the
 * phone on the floor, and a disclosure would cost a tap every time.
 */
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
    <li>
      <Card className='space-y-3'>
        <div className='space-y-1.5'>
          <p className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <span className='text-heading'>{exercise.name}</span>
            {exercise.variant === null ? null : <span className='text-label text-ink-muted'>{exercise.variant}</span>}
            {exercise.side === 'left' || exercise.side === 'right' ? <Marker>{exercise.side}</Marker> : null}
            {exercise.optional ? <Marker>Optional</Marker> : null}
          </p>

          {/* Tabular numerals: the Prescriptions line up down a Day, so it scans. */}
          <p className='numerals flex flex-wrap items-baseline gap-x-3 gap-y-1'>
            <span className='font-semibold'>
              {asPrescribed({ prescription: exercise.prescription, side: exercise.side })}
            </span>
            {exercise.load === null ? null : <span className='text-label text-ink-muted'>{asLoad(exercise.load)}</span>}
            {exercise.tempo === null ? null : <span className='text-label text-ink-muted'>{exercise.tempo}</span>}
            {exercise.restSeconds === null ? null : (
              <span className='text-label text-ink-muted'>{asRest(exercise.restSeconds)}</span>
            )}
          </p>

          {exercise.cue === null ? null : <p className='text-label text-ink-muted'>{exercise.cue}</p>}

          {/* Raw is always shown: where the parse was partial, this line is the prescription. */}
          <p className='text-caption text-ink-faint'>{exercise.raw}</p>
        </div>

        <LogControls
          exercise={exercise}
          dayOrdinal={dayOrdinal}
          log={log}
          onLog={onLog}
        />
      </Card>
    </li>
  )
}

/** A word the Exercise carries — which limb, or that it is only offered. */
function Marker({ children }: { children: ReactNode }) {
  return (
    <span className='rounded-full border border-hairline px-2 py-0.5 text-caption font-semibold uppercase text-ink-muted'>
      {children}
    </span>
  )
}

/**
 * The whole of logging: three ratings, a skip, and somewhere to write. There is no
 * save button — the tap is the save, because the phone is on the floor mid-set and
 * nothing may be lost by walking away. Numbers are deliberately absent (ADR 0003).
 *
 * The chips stay in plain sight; only the note folds away, because seven Exercises
 * of empty text boxes is a wall, and one tap to log must not become two.
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
    <div className='space-y-2'>
      <fieldset
        aria-label={`How ${named(exercise)} went`}
        className='flex flex-wrap gap-2'
      >
        {RATINGS.map((rating) => (
          <Rating
            key={rating.difficulty}
            label={rating.label}
            name={`${rating.label} — ${named(exercise)}`}
            value={rating.difficulty}
            chosen={chosen === rating.difficulty}
            onChoose={rate}
          />
        ))}
        <Rating
          label='Skipped'
          name={`Skipped — ${named(exercise)}`}
          value='skipped'
          chosen={log?.kind === 'skipped'}
          onChoose={skip}
        />
      </fieldset>

      <NoteBox
        on={named(exercise)}
        note={note}
        onWrite={write}
        onKeep={keep}
      />
    </div>
  )
}

/**
 * A tap target, not a toggle: the chosen one carries a tick as well as the fill, so
 * it reads without colour.
 */
function Rating({
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
    <Chip
      value={value}
      aria-label={name}
      selected={chosen}
      onClick={onChoose}
    >
      {chosen ? <span aria-hidden='true'>✓</span> : null}
      {label}
    </Chip>
  )
}

/**
 * What the athlete wants to tell the coach about one Exercise, folded away until it
 * is wanted — and never folded away once there is something in it, because what was
 * recorded is never hidden from the athlete who recorded it.
 */
function NoteBox({
  on,
  note,
  onWrite,
  onKeep,
}: {
  on: string
  note: string
  onWrite: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onKeep: () => void
}) {
  const [shown, setShown] = useState(note !== '')

  function toggle() {
    setShown(!shown)
  }

  return (
    <div className='space-y-2'>
      <Button
        tone='ghost'
        onClick={toggle}
        aria-expanded={shown}
        aria-label={`${shown ? 'Hide the' : 'Add a'} note on ${on}`}
        className='px-0'
      >
        <span aria-hidden='true'>{shown ? 'Hide note' : 'Add a note'}</span>
      </Button>
      {shown ? (
        <textarea
          aria-label={`Note on ${on}`}
          value={note}
          onChange={onWrite}
          onBlur={onKeep}
          rows={2}
          placeholder='Anything worth telling the coach'
          className='w-full rounded-lg border border-hairline bg-sunken px-3 py-2.5 text-label text-ink placeholder:text-ink-faint focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-brand'
        />
      ) : null}
    </div>
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
      <Button
        onClick={toggle}
        aria-expanded={shown}
        className='w-full'
      >
        {shown ? 'Hide Week notes' : 'Week notes'}
      </Button>
      {shown ? (
        <Card>
          <p className='whitespace-pre-wrap text-label'>{notes}</p>
        </Card>
      ) : null}
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
