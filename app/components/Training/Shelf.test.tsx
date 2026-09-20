import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { Shelf } from './Shelf.tsx'
import type { WeekOnShelf } from '../../../shared/training.ts'

/** Twenty Weeks of training, as the shelf gets them: newest first, one of them now. */
const WEEKS: WeekOnShelf[] = [
  { number: 21, startDate: '2025-09-01', endDate: '2025-09-07', current: true },
  { number: 20, startDate: '2025-08-25', endDate: '2025-08-31', current: false },
  { number: 9, startDate: '2025-06-05', endDate: '2025-06-11', current: false },
]

function openShelf({ weeks = WEEKS, onOpen = () => {} }: { weeks?: WeekOnShelf[]; onOpen?: (number: number) => void }) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <Shelf
      weeks={weeks}
      onOpen={onOpen}
    />,
  )

  return page.elementLocator(container)
}

describe('the shelf', () => {
  test('every Week is on it, under the number the coach gave it', async () => {
    const screen = openShelf({})

    await expect.element(screen.getByRole('button', { name: /Week 21/ })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: /Week 20/ })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: /Week 9/ })).toBeVisible()
  })

  test('the Week being trained says so, so the shelf orients without reading dates', async () => {
    const screen = openShelf({})

    await expect.element(screen.getByRole('button', { name: /Week 21/ })).toHaveTextContent('Now')
    await expect.element(screen.getByRole('button', { name: /Week 20/ })).not.toHaveTextContent('Now')
  })

  test('a Week carries the dates it ran between, for the Week that is not now', async () => {
    const screen = openShelf({})

    await expect.element(screen.getByRole('button', { name: /Week 20/ })).toHaveTextContent('25 Aug – 31 Aug')
  })

  test('tapping a Week opens it', async () => {
    const opened: number[] = []
    const screen = openShelf({ onOpen: (number) => opened.push(number) })

    await screen.getByRole('button', { name: /Week 9/ }).click()

    expect(opened).toEqual([9])
  })

  test('an empty shelf says what would fill it rather than showing nothing', async () => {
    const screen = openShelf({ weeks: [] })

    await expect.element(screen.getByText(/no Weeks/)).toBeVisible()
  })
})
