import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Mark } from '../components/Brand/Mark.tsx'
import { TrainingWeek } from '../components/Training/TrainingWeek.tsx'
import { today } from '../libs/Training/clock.ts'
import type { CurrentDay } from '../../shared/training.ts'

export const Route = createFileRoute('/')({
  component: HomePage,
})

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

/** The app opens on today's training. Everything else is a fallback for not having any. */
function HomePage() {
  const { data, isPending } = useQuery({ queryKey: ['currentDay', today()], queryFn: openTraining })

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

  return (
    <TrainingWeek
      week={data.current.week}
      day={data.current.day}
      refresh='currentDay'
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
