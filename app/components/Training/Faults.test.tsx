import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { Faults } from './Faults.tsx'
import type { ImportFault } from '../../../shared/training.ts'

/** A rejected paste: one fault on the Week, two inside Days. */
const FAULTS: ImportFault[] = [
  { day: null, exercise: null, field: 'number', message: 'Invalid input: expected number, received string' },
  { day: 3, exercise: 'kickstand-rdl', field: 'load.value', message: 'Invalid input: expected number' },
  { day: 1, exercise: 'dips', field: 'key', message: 'Two Exercises on this Day share the key "dips".' },
]

function openFaults({
  to = { writeText: async () => {} },
  onBack = () => {},
}: {
  to?: { writeText: (text: string) => Promise<void> }
  onBack?: () => void
}) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <Faults
      faults={FAULTS}
      to={to}
      onBack={onBack}
    />,
  )

  return page.elementLocator(container)
}

describe('a paste the coach got wrong', () => {
  test('it says plainly that nothing was imported', async () => {
    const screen = openFaults({})

    await expect.element(screen.getByText(/Nothing was imported/)).toBeVisible()
  })

  test('every fault names the Day, the Exercise and the field', async () => {
    const screen = openFaults({})

    await expect
      .element(screen.getByText('day 3 · kickstand-rdl · load.value: Invalid input: expected number', { exact: true }))
      .toBeVisible()
    await expect
      .element(screen.getByText('week · number: Invalid input: expected number, received string', { exact: true }))
      .toBeVisible()
  })

  test('one action puts the whole list on the clipboard, to hand straight back', async () => {
    const written: string[] = []
    const screen = openFaults({ to: { writeText: async (text) => void written.push(text) } })

    await screen.getByRole('button', { name: /Copy/ }).click()

    expect(written).toHaveLength(1)
    expect(written[0]).toContain('day 1 · dips · key')
    expect(written[0]).toContain('day 3 · kickstand-rdl · load.value')
    expect(written[0]).toContain('week · number')
  })

  test('the corrected Week is pasted back here', async () => {
    let back = 0
    const screen = openFaults({ onBack: () => (back += 1) })

    await screen.getByRole('button', { name: /Paste the corrected Week/ }).click()

    expect(back).toBe(1)
  })
})
