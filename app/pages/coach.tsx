import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CopyButton } from '../components/Training/CopyButton.tsx'
import { Faults } from '../components/Training/Faults.tsx'
import { Preview } from '../components/Training/Preview.tsx'
import { Button } from '../components/UI/Button.tsx'
import { Card } from '../components/UI/Card.tsx'
import { TextArea } from '../components/UI/Field.tsx'
import { today } from '../libs/Training/clock.ts'
import { copyRegistry, copySchema, copyWeek } from '../libs/Training/export.ts'
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

type PreviewResult =
  | { ok: true; preview: WeekPreview; startDate: string; revising: Revision | null }
  | { ok: false; errors: ImportFault[] }
type ImportResult = { ok: true; week: ImportedWeek } | { ok: false; errors: ImportFault[] }

/**
 * Where the athlete is in the import. Confirming is a second step on purpose: the
 * paste is read back as a Week first, and nothing is written until that Week is the
 * one the athlete expected.
 */
type Stage =
  | { at: 'pasting' }
  | { at: 'previewing'; preview: WeekPreview; startDate: string; revising: Revision | null }
  | { at: 'rejected'; faults: ImportFault[] }
  | { at: 'imported'; week: ImportedWeek }

async function post(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  return await response.json()
}

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

    const result = (await post('/api/actions/previewWeek', { json, today: today() })) as PreviewResult

    setStage(
      result.ok
        ? { at: 'previewing', preview: result.preview, startDate: result.startDate, revising: result.revising }
        : { at: 'rejected', faults: result.errors },
    )
    setWorking(false)
  }

  async function confirm(startDate: string) {
    setWorking(true)

    const result = (await post('/api/actions/importWeek', { json, startDate, today: today() })) as ImportResult

    setStage(result.ok ? { at: 'imported', week: result.week } : { at: 'rejected', faults: result.errors })
    setWorking(false)
  }

  return (
    <Direction
      heading='From your coach'
      blurb='Paste the Week your coach wrote. You will see what it says before anything is saved.'
    >
      {stage.at === 'pasting' || stage.at === 'imported' ? (
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
      ) : null}

      {stage.at === 'previewing' && (
        <Preview
          preview={stage.preview}
          startDate={stage.startDate}
          revising={stage.revising}
          onConfirm={confirm}
          onBack={() => setStage({ at: 'pasting' })}
        />
      )}
      {stage.at === 'rejected' && (
        <Faults
          faults={stage.faults}
          onBack={() => setStage({ at: 'pasting' })}
        />
      )}
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
