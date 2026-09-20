import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Mark } from '../components/Brand/Mark.tsx'
import { WeekView } from '../components/Training/WeekView.tsx'
import type { Logged } from '../components/Training/WeekView.tsx'
import type { CurrentDay } from '../../shared/training.ts'

export const Route = createFileRoute('/')({
  component: HomePage,
})

/** The athlete's local date — the Day being trained is the one where they are. */
function today(): string {
  const now = new Date()

  return [now.getFullYear(), `${now.getMonth() + 1}`.padStart(2, '0'), `${now.getDate()}`.padStart(2, '0')].join('-')
}

type Opened = { signedIn: false } | { signedIn: true; current: CurrentDay | null }

async function openTraining(): Promise<Opened> {
  const response = await fetch(`/api/actions/getCurrentDay?today=${today()}`)

  if (response.status === 401) {
    return { signedIn: false }
  }

  if (!response.ok) {
    throw new Error('today’s Day could not be read')
  }

  return { signedIn: true, current: (await response.json()) as CurrentDay | null }
}

/** Sends one tap on its way. The screen has already moved on — this only persists it. */
async function sendLog({ weekNumber, entry }: { weekNumber: number; entry: Logged }): Promise<void> {
  const response = await fetch('/api/actions/logExercise', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ weekNumber, ...entry }),
  })

  if (!response.ok) {
    throw new Error('the Log could not be saved')
  }
}

/** The app opens on today's training. Everything else is a fallback for not having any. */
function HomePage() {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ['currentDay', today()], queryFn: openTraining })
  const { mutate } = useMutation({
    mutationFn: sendLog,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['currentDay'] }),
  })

  if (isPending) {
    return <p>Opening today’s training…</p>
  }

  if (data === undefined || !data.signedIn) {
    return (
      <Nothing message='Sign in to see today’s training.'>
        <Link
          to='/sign-in'
          className='inline-block rounded-md bg-brand px-3 py-2 font-semibold text-white'
        >
          Sign in
        </Link>
      </Nothing>
    )
  }

  if (data.current === null) {
    return (
      <Nothing message='No Week covers today. Import the Week your coach wrote.'>
        <Link
          to='/import'
          className='inline-block rounded-md bg-brand px-3 py-2 font-semibold text-white'
        >
          Import a Week
        </Link>
      </Nothing>
    )
  }

  const weekNumber = data.current.week.number

  return (
    <WeekView
      week={data.current.week}
      day={data.current.day}
      onLog={(entry) => mutate({ weekNumber, entry })}
    />
  )
}

function Nothing({ message, children }: { message: string; children: ReactNode }) {
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Mark />
        <h1 className='text-2xl font-semibold'>Training log</h1>
      </div>
      <p>{message}</p>
      {children}
    </div>
  )
}
