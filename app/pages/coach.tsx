import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CopyButton } from '../components/Training/CopyButton.tsx'
import { Faults } from '../components/Training/Faults.tsx'
import { Preview } from '../components/Training/Preview.tsx'
import { Button } from '../components/UI/Button.tsx'
import { Card } from '../components/UI/Card.tsx'
import { Caution } from '../components/UI/Caution.tsx'
import { TextArea } from '../components/UI/Field.tsx'
import { today } from '../libs/Training/clock.ts'
import { copyRegistry, copySchema, copyWeek } from '../libs/Training/export.ts'
import { answerOf } from '../libs/Training/importing.ts'
import { openShelf, shelfKey } from '../libs/Training/shelf.ts'
import type { ImportFault, Revision, WeekPreview } from '../../shared/training.ts'

export const Route = createFileRoute('/coach')({
  component: CoachPage,
})

/**
 * The read-back is deliberately plain: ordinals, names and the coach's own line
 * are enough to prove the Week landed. The training view is its own ticket.
 */
type ImportedWeek = {
  number: number
  startDate: string
  days: {
    ordinal: number
    date: string
    weekday: string
    focus: string | null
    exercises: { key: string; name: string; raw: string }[]
  }[]
}

/** What the server answers with when it did read the paste. The refusals are `answerOf`'s. */
type Read = { preview: WeekPreview; startDate: string; revising: Revision | null }
type Imported = { week: ImportedWeek }

/**
 * Where the athlete is in the import. Confirming is a second step on purpose: the
 * paste is read back as a Week first, and nothing is written until that Week is the
 * one the athlete expected.
 *
 * `stalled` is the step that was missing: a paste the server never answered wrote
 * nothing, and is neither a Week nor a Week refused.
 */
type Stage =
  | { at: 'pasting' }
  | { at: 'previewing'; preview: WeekPreview; startDate: string; revising: Revision | null }
  | { at: 'rejected'; faults: ImportFault[] }
  | { at: 'imported'; week: ImportedWeek }
  | { at: 'stalled'; said: string }

/**
 * The status and the body, both, because what the body means depends on the status
 * — and neither throws: a fetch that never completes is an answer the screen has to
 * show, not an exception that leaves the button reading "Reading…" for good.
 */
async function post(url: string, body: unknown): Promise<{ status: number | null; body: unknown }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    return { status: response.status, body: await parsed(response) }
  } catch {
    return { status: null, body: null }
  }
}

/** A body that is not JSON is a body that says nothing; the status still does. */
async function parsed(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/** The session having ended, said where the athlete is standing — with their paste still in the box. */
const ENDED =
  'Your session has ended, so nothing was imported. Your paste is still here. Sign in again, then read it back.'

/**
 * The weekly ritual, in one place and organised by direction: what arrives from the
 * coach, and what goes back to them. It is a destination rather than a branch of the
 * home screen because the moment it is most needed — a Revision of the Week being
 * trained — is exactly the moment the old link was hidden.
 */
function CoachPage() {
  return (
    <div className='space-y-8'>
      <h1 className='text-display'>Coach</h1>
      <FromYourCoach />
      <ToYourCoach />
    </div>
  )
}

/** One direction: a Week arriving as JSON, read back before anything is written. */
function FromYourCoach() {
  const [json, setJson] = useState('')
  const [working, setWorking] = useState(false)
  const [stage, setStage] = useState<Stage>({ at: 'pasting' })

  async function preview(event: FormEvent) {
    event.preventDefault()
    setWorking(true)

    const answer = answerOf<Read>(await post('/api/actions/previewWeek', { json, today: today() }))

    setStage(
      answer.at === 'read'
        ? { at: 'previewing', preview: answer.it.preview, startDate: answer.it.startDate, revising: answer.it.revising }
        : answer.at === 'rejected'
          ? { at: 'rejected', faults: answer.faults }
          : {
              at: 'stalled',
              said:
                answer.at === 'signedOut'
                  ? ENDED
                  : 'The Week could not be read back. You are still signed in — this one is the connection. Nothing was imported, so try again when you have one.',
            },
    )
    setWorking(false)
  }

  async function confirm({ startDate, number }: { startDate: string; number: number }) {
    setWorking(true)

    const answer = answerOf<Imported>(await post('/api/actions/importWeek', { json, startDate, today: today() }))

    setStage(
      answer.at === 'read'
        ? { at: 'imported', week: answer.it.week }
        : answer.at === 'rejected'
          ? { at: 'rejected', faults: answer.faults }
          : {
              at: 'stalled',
              // The one answer that is not "nothing happened": the paste may have been
              // written before the answer was lost, so the athlete is sent to look
              // rather than told either way. Importing it again is a Revision of a Week
              // with nothing logged against it yet, which costs nothing.
              said:
                answer.at === 'signedOut'
                  ? ENDED
                  : `Week ${number} may not have been saved — the server never answered. Check your Weeks, and import it again if it is not there.`,
            },
    )
    setWorking(false)
  }

  return (
    <Direction
      heading='From your coach'
      blurb='Paste the Week your coach wrote. You will see what it says before anything is saved.'
    >
      {/*
       * The paste box is never unmounted. The Preview and the fault list are layers
       * over this screen rather than routes, so leaving either one hands the athlete
       * back the text they pasted, unchanged and without a re-paste.
       */}
      <Card>
        <form
          onSubmit={preview}
          className='space-y-4'
        >
          <TextArea
            label='The Week, as JSON'
            required
            rows={10}
            placeholder='{ "number": 21, "days": [ … ] }'
            value={json}
            onChange={(event) => setJson(event.target.value)}
            className='font-mono text-label'
          />
          <Button
            type='submit'
            tone='primary'
            disabled={working}
            className='w-full'
          >
            {working ? 'Reading…' : 'Read it back'}
          </Button>
        </form>
      </Card>

      {stage.at === 'previewing' && (
        <Preview
          preview={stage.preview}
          startDate={stage.startDate}
          revising={stage.revising}
          onConfirm={(startDate) => void confirm({ startDate, number: stage.preview.number })}
          onBack={() => setStage({ at: 'pasting' })}
        />
      )}
      {stage.at === 'rejected' && (
        <Faults
          faults={stage.faults}
          onBack={() => setStage({ at: 'pasting' })}
        />
      )}
      {/* Beside the paste box rather than over it: there is nothing to read back and
          nothing to send the coach, and the text to try again with is right here. */}
      {stage.at === 'stalled' && <Caution live>{stage.said}</Caution>}
      {stage.at === 'imported' && <WeekReadBack week={stage.week} />}
    </Direction>
  )
}

/**
 * The other direction, and every part of it in plain view. The schema and the
 * Movement list were behind a disclosure, which is the wrong place for the two
 * things a fresh chat cannot start without — the athlete would have to remember
 * they exist before they could go looking for them.
 */
function ToYourCoach() {
  const shelf = useQuery({ queryKey: shelfKey(), queryFn: openShelf })
  const current = shelf.data?.find((week) => week.current) ?? null

  return (
    <Direction
      heading='To your coach'
      blurb='Each of these is a paste into the chat. Nothing leaves your phone until you paste it.'
    >
      <Card className='space-y-3'>
        <h3 className='text-heading'>This Week, with your Logs</h3>
        <p className='text-label text-ink-muted'>What the coach reads before writing the next Week.</p>
        {current === null ? (
          <p className='text-label text-ink-muted'>
            No Week covers today, so there is nothing to send yet. You can still copy any Week from the Week itself.
          </p>
        ) : (
          <CopyButton
            label={`Copy Week ${current.number}`}
            copied='Copied — paste it to your coach.'
            failed='The Week could not be copied. Try again.'
            onCopy={() => copyWeek({ number: current.number })}
          />
        )}
      </Card>

      <Card className='space-y-3'>
        <h3 className='text-heading'>Starting a new chat?</h3>
        <p className='text-label text-ink-muted'>
          Paste these in first: the schema is what keeps the Week importable, and the Movement list is what keeps one
          Exercise the same Exercise from Week to Week.
        </p>
        <CopyButton
          label='Copy the schema'
          copied='Copied — paste it to your coach.'
          failed='The schema could not be copied. Try again.'
          onCopy={copySchema}
        />
        <CopyButton
          label='Copy the Movement list'
          copied='Copied — paste it to your coach.'
          failed='The Movement list could not be copied. Try again.'
          onCopy={copyRegistry}
        />
      </Card>
    </Direction>
  )
}

function Direction({ heading, blurb, children }: Readonly<{ heading: string; blurb: string; children: ReactNode }>) {
  return (
    <section className='space-y-3'>
      <h2 className='text-title'>{heading}</h2>
      <p className='text-label text-ink-muted'>{blurb}</p>
      {children}
    </section>
  )
}

function WeekReadBack({ week }: { week: ImportedWeek }) {
  return (
    <section className='space-y-4'>
      <h3 className='text-heading'>
        Week {week.number}, from {week.startDate}
      </h3>
      {week.days.map((day) => (
        <article
          key={day.ordinal}
          className='space-y-1'
        >
          <h4 className='font-semibold'>
            Day {day.ordinal} · {day.weekday} {day.date}
            {day.focus === null ? '' : ` · ${day.focus}`}
          </h4>
          {day.exercises.length === 0 ? (
            <p className='text-label text-ink-muted'>Rest.</p>
          ) : (
            <ul className='space-y-1 text-label'>
              {day.exercises.map((exercise) => (
                <li key={exercise.key}>
                  <span className='font-semibold'>{exercise.name}</span> — {exercise.raw}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </section>
  )
}
