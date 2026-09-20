import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CopyButton } from '../components/Training/CopyButton.tsx'
import { Faults } from '../components/Training/Faults.tsx'
import { Preview } from '../components/Training/Preview.tsx'
import { today } from '../libs/Training/clock.ts'
import { copyRegistry, copySchema } from '../libs/Training/export.ts'
import type { ImportFault, Revision, WeekPreview } from '../../shared/training.ts'

export const Route = createFileRoute('/import')({
  component: ImportPage,
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

function ImportPage() {
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
    <div className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Import a Week</h1>

      {stage.at === 'pasting' || stage.at === 'imported' ? (
        <form
          onSubmit={preview}
          className='space-y-4'
        >
          <p>Paste the Week your coach wrote. You will see what it says before anything is saved.</p>
          <textarea
            required
            rows={12}
            placeholder='{ "number": 21, "days": [ … ] }'
            aria-label='The coach’s Week, as JSON'
            value={json}
            onChange={(event) => setJson(event.target.value)}
            className='w-full rounded-md bg-legacy-surface px-3 py-2 font-mono text-sm text-legacy placeholder:text-legacy/60'
          />
          <button
            type='submit'
            disabled={working}
            className='w-full rounded-md bg-legacy px-3 py-2 font-semibold text-white disabled:opacity-60'
          >
            {working ? 'Reading…' : 'Read it back'}
          </button>
        </form>
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

      <ForTheCoach />
    </div>
  )
}

/**
 * What a fresh chat needs before the coach can write anything: the contract, and the
 * ids already in use. Both live here because this is the screen the athlete is on
 * when the Week they pasted turned out to be wrong, and the fix is a new chat.
 */
function ForTheCoach() {
  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-semibold'>Starting a new chat with your coach?</h2>
      <p className='text-sm'>
        Paste these in first: the schema is what keeps the Week importable, and the Movement list is what keeps one
        Exercise the same Exercise from Week to Week.
      </p>
      <CopyButton
        label='Copy the schema'
        copied='Copied — paste it to your coach.'
        failed='The schema could not be copied. Try again.'
        onCopy={() => copySchema()}
      />
      <CopyButton
        label='Copy the Movement list'
        copied='Copied — paste it to your coach.'
        failed='The Movement list could not be copied. Try again.'
        onCopy={() => copyRegistry()}
      />
    </section>
  )
}

function WeekReadBack({ week }: { week: ImportedWeek }) {
  return (
    <section className='space-y-4'>
      <h2 className='text-xl font-semibold'>
        Week {week.number}, from {week.startDate}
      </h2>
      {week.days.map((day) => (
        <article
          key={day.ordinal}
          className='space-y-1'
        >
          <h3 className='font-semibold'>
            Day {day.ordinal} · {day.weekday} {day.date}
            {day.focus === null ? '' : ` · ${day.focus}`}
          </h3>
          {day.exercises.length === 0 ? (
            <p className='text-sm'>Rest.</p>
          ) : (
            <ul className='space-y-1 text-sm'>
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
