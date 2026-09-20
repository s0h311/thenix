import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Nothing, SignedOut, Unreachable } from '../components/Shell/Nothing.tsx'
import { TrainingWeek } from '../components/Training/TrainingWeek.tsx'
import { buttonClasses } from '../components/UI/Button.tsx'
import { today } from '../libs/Training/clock.ts'
import { standingOf } from '../libs/Training/standing.ts'
import type { CurrentDay } from '../../shared/training.ts'

export const Route = createFileRoute('/')({
  component: HomePage,
})

/**
 * What the server had for the athlete. Null is "not signed in" and nothing else is,
 * so that "no Week covers today" — an answer, and a Shelf away from being fixed —
 * cannot be mistaken for having no session.
 */
type Opened = { current: CurrentDay | null }

async function openTraining(): Promise<Opened | null> {
  const response = await fetch(`/api/actions/getCurrentDay?today=${today()}`)

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('today’s Day could not be read')
  }

  return { current: (await response.json()) as CurrentDay | null }
}

/** The app opens on today's training. Everything else is a fallback for not having any. */
function HomePage() {
  const opened = useQuery({ queryKey: ['currentDay', today()], queryFn: openTraining })
  const standing = standingOf({ pending: opened.isPending, got: opened.data })

  if (standing.at === 'opening') {
    return <p className='text-ink-muted'>Opening today’s training…</p>
  }

  if (standing.at === 'signedOut') {
    return (
      <SignedOut
        heading='Training log'
        said='Sign in to see today’s training.'
      />
    )
  }

  // Not a sign-out, and said as much: the session is intact and the signal is not.
  if (standing.at === 'unreachable') {
    return (
      <Unreachable
        heading='Training log'
        said='Today’s training could not be read. You are still signed in — this one is the connection.'
        onRetry={() => void opened.refetch()}
      />
    )
  }

  if (standing.it.current === null) {
    return (
      <Nothing
        heading='Training log'
        said='No Week covers today. Import the Week your coach wrote.'
      >
        <Link
          to='/coach'
          className={buttonClasses('primary', 'w-full')}
        >
          Import a Week
        </Link>
      </Nothing>
    )
  }

  return (
    <TrainingWeek
      week={standing.it.current.week}
      day={standing.it.current.day}
      refresh='currentDay'
    />
  )
}
