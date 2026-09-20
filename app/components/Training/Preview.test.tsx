import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { Preview } from './Preview.tsx'
import type { Revision, WeekPreview } from '../../../shared/training.ts'

/** A Week as it came back from the parser: two training Days and a rest Day. */
const WEEK: WeekPreview = {
  number: 21,
  notes: 'Levers advance: archer push-ups to 4×3.',
  days: [
    {
      ordinal: 1,
      kind: 'training',
      focus: 'Upper Push + Core',
      exercises: [
        { key: 'archer-push-ups', name: 'Archer push-ups', raw: '4×3/side @ 3-1-1' },
        { key: 'dips', name: 'Chair dips', raw: '3×8, ROM ~120°' },
      ],
    },
    { ordinal: 2, kind: 'rest', focus: 'Full Rest', exercises: [] },
  ],
}

function openPreview({
  startDate = '2025-09-01',
  revising = null,
  onConfirm = () => {},
  onBack = () => {},
}: {
  startDate?: string
  revising?: Revision | null
  onConfirm?: (startDate: string) => void
  onBack?: () => void
}) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <Preview
      preview={WEEK}
      startDate={startDate}
      revising={revising}
      onConfirm={onConfirm}
      onBack={onBack}
    />,
  )

  return page.elementLocator(container)
}

describe('the Week before it is imported', () => {
  test('what is shown is the Week that parsed, under the number the coach gave it', async () => {
    const screen = openPreview({})

    await expect.element(screen.getByRole('heading', { name: /Week 21/ })).toBeVisible()
    await expect.element(screen.getByText('Day 1 · Upper Push + Core', { exact: true })).toBeVisible()
  })

  test('every Exercise that parsed is named, with the coach’s own line beside it', async () => {
    const screen = openPreview({})

    await expect.element(screen.getByText('Archer push-ups', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('4×3/side @ 3-1-1', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('Chair dips', { exact: true })).toBeVisible()
  })

  test('a rest Day shows as a Day that asks for nothing', async () => {
    const screen = openPreview({})

    await expect.element(screen.getByText(/asks for nothing/)).toBeVisible()
  })

  test('the date the Week would start on is already filled in', async () => {
    const screen = openPreview({ startDate: '2025-09-01' })

    await expect.element(screen.getByLabelText(/Starts on/)).toHaveValue('2025-09-01')
  })

  test('a Week number already on the shelf says so before it is replaced', async () => {
    const screen = openPreview({ revising: { startDate: '2025-08-25', logged: 4 }, startDate: '2025-08-25' })

    await expect.element(screen.getByText(/already on your shelf, from 25 Aug, with 4 Logs/)).toBeVisible()
  })

  test('a Week the athlete has never imported says nothing about replacing one', async () => {
    const screen = openPreview({})

    expect(screen.getByText(/already on your shelf/).elements()).toEqual([])
  })

  test('confirming imports it on the date shown', async () => {
    const confirmed: string[] = []
    const screen = openPreview({ onConfirm: (startDate) => confirmed.push(startDate) })

    await screen.getByRole('button', { name: /Import this Week/ }).click()

    expect(confirmed).toEqual(['2025-09-01'])
  })

  test('the date can be overridden, and that is the date imported', async () => {
    const confirmed: string[] = []
    const screen = openPreview({ onConfirm: (startDate) => confirmed.push(startDate) })

    await screen.getByLabelText(/Starts on/).fill('2025-09-08')
    await screen.getByRole('button', { name: /Import this Week/ }).click()

    expect(confirmed).toEqual(['2025-09-08'])
  })

  test('going back to the paste imports nothing', async () => {
    const confirmed: string[] = []
    let back = 0
    const screen = openPreview({ onConfirm: (startDate) => confirmed.push(startDate), onBack: () => (back += 1) })

    await screen.getByRole('button', { name: /Paste a different Week/ }).click()

    expect([back, confirmed]).toEqual([1, []])
  })
})
