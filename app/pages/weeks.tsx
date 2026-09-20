import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { SignedOut, Unreachable } from '../components/Shell/Nothing.tsx'
import { Shelf } from '../components/Training/Shelf.tsx'
import { TrainingWeek } from '../components/Training/TrainingWeek.tsx'
import { buttonClasses } from '../components/UI/Button.tsx'
import { today } from '../libs/Training/clock.ts'
import { openShelf, shelfKey } from '../libs/Training/shelf.ts'
import { standingOf } from '../libs/Training/standing.ts'
import type { Week } from '../../shared/training.ts'

/** Which Week is open lives in the URL, so a Week looked up is a Week that can be gone back to. */
type Shelved = { number?: number }

export const Route = createFileRoute('/weeks')({
  validateSearch: (search: Record<string, unknown>): Shelved => {
    const number = Number(search['number'])

    return Number.isInteger(number) ? { number } : {}
  },
  component: ShelfPage,
})

/**
 * The Week wrapped, because the three answers have to stay three. `found: null` is
 * the athlete having no Week 12 — an answer. `null` is the session having ended.
 * The absence of either is the read not having come back, and it is not a verdict
 * on anything: what is already on screen stands.
 */
type Opened = { found: Week | null }

async function openWeek(number: number): Promise<Opened | null> {
  const response = await fetch(`/api/actions/getWeek?number=${number}&today=${today()}`)

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Week ${number} could not be read`)
  }

  return { found: (await response.json()) as Week | null }
}

/**
 * Every Week, and any one of them opened. A past Week is not a record to be read:
 * the makeup session trained a week late is logged here, exactly as today's is.
 */
function ShelfPage() {
  const { number } = Route.useSearch()
  const navigate = Route.useNavigate()

  const shelf = useQuery({ queryKey: shelfKey(), queryFn: openShelf })

  // Whether the athlete is signed in is answered once, by the shelf, so an opened
  // Week never reports "there is no Week 12" when what is missing is the session.
  const standing = standingOf({ pending: shelf.isPending, got: shelf.data })

  if (standing.at === 'opening') {
    return <p className='text-ink-muted'>Opening your Weeks…</p>
  }

  if (standing.at === 'signedOut') {
    return (
      <SignedOut
        heading='Weeks'
        said='Sign in to see your Weeks.'
      />
    )
  }

  if (standing.at === 'unreachable') {
    return (
      <Unreachable
        heading='Weeks'
        said='Your Weeks could not be read. You are still signed in — this one is the connection.'
        onRetry={() => void shelf.refetch()}
      />
    )
  }

  if (number !== undefined) {
    return <OpenedWeek number={number} />
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-display'>Weeks</h1>
      <Shelf
        weeks={standing.it}
        onOpen={(opened) => navigate({ search: { number: opened } })}
      />
    </div>
  )
}

/**
 * One Week off the shelf, trained from exactly as today's is.
 *
 * It stands where it is until something *comes back*. A Log lands and the Week is
 * read again; in a gym the read after it may not, and the screen asked `isError`,
 * which a refetch sets even with the Week still in hand. So a tap with one bar took
 * the Day the athlete was training off the screen — and the Unsaved bar, and the
 * outbox behind it, went with the screen that held them. That is the whole of what
 * `standingOf` is for, and this was the last read not asking it.
 */
function OpenedWeek({ number }: { number: number }) {
  const week = useQuery({ queryKey: ['week', number, today()], queryFn: () => openWeek(number) })
  const standing = standingOf({ pending: week.isPending, got: week.data })

  if (standing.at === 'opening') {
    return <p className='text-ink-muted'>Opening Week {number}…</p>
  }

  // The shelf usually answers this first, but its answer can be an hour old: a
  // session that ended while the athlete read it is a sign-out here, not a signal.
  if (standing.at === 'signedOut') {
    return (
      <SignedOut
        heading={`Week ${number}`}
        said='Sign in to see this Week.'
      />
    )
  }

  if (standing.at === 'unreachable') {
    return (
      <Unreachable
        heading={`Week ${number}`}
        said={`Week ${number} could not be read. You are still signed in — this one is the connection.`}
        onRetry={() => void week.refetch()}
      />
    )
  }

  return (
    <div className='space-y-6'>
      <Link
        to='/weeks'
        className={buttonClasses('ghost', '-ml-4 self-start')}
      >
        ← All Weeks
      </Link>
      {standing.it.found === null ? (
        <p className='text-ink-muted'>There is no Week {number}.</p>
      ) : (
        <TrainingWeek
          week={standing.it.found}
          // The Week being trained opens on today; a Week off the shelf holds no
          // today, and opens on its first Day — its plan and its Logs, no tap first.
          day={standing.it.found.days.find((day) => day.date === today()) ?? null}
          refresh='week'
        />
      )}
    </div>
  )
}
