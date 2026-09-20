import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'

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

type ImportFault = {
  day: number | null
  exercise: string | null
  field: string
  message: string
}

type ImportResult = { ok: true; week: ImportedWeek } | { ok: false; errors: ImportFault[] }

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function ImportPage() {
  const [json, setJson] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function importWeek(event: FormEvent) {
    event.preventDefault()
    setImporting(true)

    const response = await fetch('/api/actions/importWeek', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json, startDate }),
    })

    setResult((await response.json()) as ImportResult)
    setImporting(false)
  }

  return (
    <div className='space-y-6'>
      <form
        onSubmit={importWeek}
        className='space-y-4'
      >
        <h1 className='text-2xl font-semibold'>Import a Week</h1>
        <p>Paste the Week your coach wrote, then pick the day it starts.</p>
        <textarea
          required
          rows={12}
          placeholder='{ "number": 21, "days": [ … ] }'
          aria-label='The coach’s Week, as JSON'
          value={json}
          onChange={(event) => setJson(event.target.value)}
          className='w-full rounded-md bg-brand-surface px-3 py-2 font-mono text-sm text-brand placeholder:text-brand/60'
        />
        <label className='flex items-center gap-3 font-semibold'>
          Starts on
          <input
            type='date'
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className='rounded-md bg-brand-surface px-3 py-2 font-normal text-brand'
          />
        </label>
        <button
          type='submit'
          disabled={importing}
          className='w-full rounded-md bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60'
        >
          {importing ? 'Importing…' : 'Import'}
        </button>
      </form>

      {result?.ok === false && <Faults errors={result.errors} />}
      {result?.ok === true && <WeekReadBack week={result.week} />}
    </div>
  )
}

function Faults({ errors }: { errors: ImportFault[] }) {
  return (
    <section className='space-y-2'>
      <h2 className='text-xl font-semibold'>Nothing was imported</h2>
      <p>Hand these back to your coach and ask for a corrected Week.</p>
      <ul className='space-y-1 font-mono text-sm'>
        {errors.map((fault) => (
          <li key={`${fault.day}-${fault.exercise}-${fault.field}`}>
            {[fault.day === null ? 'week' : `day ${fault.day}`, fault.exercise, fault.field]
              .filter(Boolean)
              .join(' · ')}
            {`: ${fault.message}`}
          </li>
        ))}
      </ul>
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
