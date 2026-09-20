import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { CopyButton } from './CopyButton.tsx'

function openButton({ onCopy }: { onCopy: () => Promise<void> }) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <CopyButton
      label='Copy the schema'
      copied='Copied — paste it to your coach.'
      failed='The schema could not be copied. Try again.'
      onCopy={onCopy}
    />,
  )

  return page.elementLocator(container)
}

describe('handing something to the coach', () => {
  test('one tap copies', async () => {
    let copied = 0
    const screen = openButton({
      onCopy: async () => {
        copied += 1
      },
    })

    await screen.getByRole('button', { name: /Copy the schema/ }).click()

    expect(copied).toBe(1)
  })

  test('a copy that worked says so, because nothing else on screen changes', async () => {
    const screen = openButton({ onCopy: async () => {} })

    await screen.getByRole('button', { name: /Copy the schema/ }).click()

    await expect.element(screen.getByText(/Copied/)).toBeVisible()
  })

  test('a copy that failed says so rather than looking like success', async () => {
    const screen = openButton({
      onCopy: async () => {
        throw new Error('no clipboard')
      },
    })

    await screen.getByRole('button', { name: /Copy the schema/ }).click()

    await expect.element(screen.getByText(/could not be copied/)).toBeVisible()
  })
})
