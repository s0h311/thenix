import { Link } from '@tanstack/react-router'
import { asSpan } from '../../libs/Training/notation.ts'
import { buttonClasses } from '../UI/Button.tsx'
import type { MouseEvent } from 'react'
import type { WeekOnShelf } from '../../../shared/training.ts'

/**
 * Twenty Weeks of training, as something to look back through rather than a folder
 * of files. The Week being trained says so in words, because a shelf that can only
 * be oriented by reading dates is one the athlete has to do arithmetic on.
 */
export function Shelf({ weeks, onOpen }: { weeks: WeekOnShelf[]; onOpen: (number: number) => void }) {
  function open(event: MouseEvent<HTMLButtonElement>) {
    onOpen(Number(event.currentTarget.value))
  }

  if (weeks.length === 0) {
    return (
      <div className='space-y-4'>
        <p>There are no Weeks here yet. Import the Week your coach wrote.</p>
        <Import tone='primary' />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <Import tone='secondary' />
      <ul className='space-y-2'>
        {weeks.map((week) => (
          <li key={week.number}>
            <button
              type='button'
              value={week.number}
              onClick={open}
              aria-current={week.current}
              className='flex w-full flex-wrap items-baseline justify-between gap-2 rounded-md bg-legacy-surface px-3 py-3 text-left aria-[current=true]:bg-legacy aria-[current=true]:text-white'
            >
              <span className='font-semibold'>Week {week.number}</span>
              {/* The mark is a word, not a colour: the fill alone would not survive a
                glance in daylight, and the dates are what the mark exists to replace. */}
              <span className='text-sm'>{week.current ? 'Now' : asSpan(week)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Adding a Week, offered where the Weeks live. The same action as the Coach
 * screen's paste box — one destination, reached from two places — so that an
 * empty shelf has something to press rather than only naming the fix.
 */
function Import({ tone }: { tone: 'primary' | 'secondary' }) {
  return (
    <Link
      to='/coach'
      className={buttonClasses(tone)}
    >
      Import a Week
    </Link>
  )
}
