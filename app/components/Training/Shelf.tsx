import { Link } from '@tanstack/react-router'
import { MARKS, marksOf } from '../../libs/Training/marks.ts'
import { asSpan } from '../../libs/Training/notation.ts'
import { buttonClasses } from '../UI/Button.tsx'
import { cardClasses } from '../UI/Card.tsx'
import type { DayMark } from '../../libs/Training/marks.ts'
import type { MouseEvent } from 'react'
import type { WeekOnShelf } from '../../../shared/training.ts'

/** Done is washed rather than filled: the brand is for where the athlete is, not for a record. */
const STRIP: Record<DayMark['mark'], string> = {
  done: 'border-transparent bg-brand-soft text-ink',
  part: 'border-hairline bg-sunken text-ink',
  untouched: 'border-hairline text-ink-faint',
}

/**
 * Twenty Weeks of training, as something to look back through rather than a folder
 * of files. Each Week is a card carrying how consistent it was — a strip of Day
 * marks read at a glance — and the Week being trained says so in words, because a
 * shelf that can only be oriented by reading dates is one to do arithmetic on.
 */
export function Shelf({ weeks, onOpen }: { weeks: WeekOnShelf[]; onOpen: (number: number) => void }) {
  function open(event: MouseEvent<HTMLButtonElement>) {
    onOpen(Number(event.currentTarget.value))
  }

  if (weeks.length === 0) {
    return (
      <div className='space-y-4'>
        <p className='text-ink-muted'>There are no Weeks here yet. Import the Week your coach wrote.</p>
        <Import tone='primary' />
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <Import tone='secondary' />
      <ul className='space-y-3'>
        {weeks.map((week) => (
          <li key={week.number}>
            <button
              type='button'
              value={week.number}
              onClick={open}
              aria-current={week.current}
              className={cardClasses(
                'w-full space-y-3 text-left transition duration-100 ease-out hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.99] motion-reduce:active:scale-100 aria-[current=true]:border-brand',
              )}
            >
              <span className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
                <span className='text-heading'>Week {week.number}</span>
                {/* "Now" is a word, not a colour: the fill alone would not survive a
                    glance in daylight, and the dates are what it exists to replace. */}
                {week.current ? (
                  <span className='rounded-full bg-brand px-2 py-0.5 text-caption font-semibold uppercase text-on-brand'>
                    Now
                  </span>
                ) : null}
                <span className='numerals ml-auto text-label text-ink-muted'>{asSpan(week)}</span>
              </span>

              <Strip marks={marksOf(week.days)} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * How the Week went, one shape per Day. Every state is a glyph as well as a wash,
 * so twenty Weeks of consistency read at a glance and read in daylight; each Day
 * says itself in words inside the card's own label, which is what a screen reader
 * gets instead of a row of circles.
 */
function Strip({ marks }: { marks: DayMark[] }) {
  if (marks.length === 0) {
    return <span className='block text-label text-ink-faint'>No Days in this Week.</span>
  }

  return (
    <span className='flex flex-wrap gap-1.5'>
      {marks.map((one) => (
        <span
          key={one.ordinal}
          className={`inline-flex size-7 items-center justify-center rounded-md border text-caption leading-none ${STRIP[one.mark]}`}
        >
          <span aria-hidden='true'>{MARKS[one.mark].glyph}</span>
          <span className='sr-only'>{`Day ${one.ordinal} ${MARKS[one.mark].said}. `}</span>
        </span>
      ))}
    </span>
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
