import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Shelf } from '../components/Training/Shelf.tsx'
import { TrainingWeek } from '../components/Training/TrainingWeek.tsx'
import { buttonClasses } from '../components/UI/Button.tsx'
import { today } from '../libs/Training/clock.ts'
import { openShelf, shelfKey } from '../libs/Training/shelf.ts'
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

async function openWeek(number: number): Promise<Week | null> {
  const response = await fetch(`/api/actions/getWeek?number=${number}&today=${today()}`)

  if (!response.ok) {
    throw new Error(`Week ${number} could not be read`)
  }

  return (await response.json()) as Week | null
}

/**
 * Every Week, and any one of them opened. A past Week is not a record to be read:
 * the makeup session trained a week late is logged here, exactly as today's is.
 */
function ShelfPage() {
  const { number } = Route.useSearch()
  const navigate = Route.useNavigate()

  const shelf = useQuery({ queryKey: shelfKey(), queryFn: openShelf })
  const week = useQuery({
    queryKey: ['week', number, today()],
    queryFn: () => openWeek(number ?? 0),
    enabled: number !== undefined,
  })

  // Whether the athlete is signed in is answered once, by the shelf, so an opened
  // Week never reports "there is no Week 12" when what is missing is the session.
  if (shelf.isPending) {
    return <p>Opening your Weeks…</p>
  }

  if (shelf.data === null || shelf.data === undefined) {
    return (
      <div className='space-y-6'>
        <h1 className='text-2xl font-semibold'>Weeks</h1>
        <p>Sign in to see your Weeks.</p>
        <Link
          to='/sign-in'
          className={buttonClasses('primary')}
        >
          Sign in
        </Link>
      </div>
    )
  }

  if (number !== undefined) {
    if (week.isPending) {
      return <p>Opening Week {number}…</p>
    }

    const opened = week.data ?? null

    return (
      <div className='space-y-6'>
        <Link
          to='/weeks'
          className={buttonClasses('ghost', '-ml-4 self-start')}
        >
          ← All Weeks
        </Link>
        {opened === null ? (
          <p>There is no Week {number}.</p>
        ) : (
          <TrainingWeek
            week={opened}
            // The Week being trained opens on today; a Week off the shelf holds no
            // today, and opens on its first Day — its plan and its Logs, no tap first.
            day={opened.days.find((day) => day.date === today()) ?? null}
            refresh='week'
          />
        )}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Weeks</h1>
      <Shelf
        weeks={shelf.data}
        onOpen={(opened) => navigate({ search: { number: opened } })}
      />
    </div>
  )
}
