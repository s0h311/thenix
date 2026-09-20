import { describe, expect, test } from 'vitest'
import { copyWeek } from './export.ts'

/** The server, holding one Week, and a clipboard to watch. */
function coachsDesk({ json = '{ "number": 20 }', ok = true }: { json?: string; ok?: boolean } = {}) {
  const asked: string[] = []
  const clipboard = { written: [] as string[] }

  return {
    asked,
    clipboard,
    copy: (number: number) =>
      copyWeek({
        number,
        from: async (url) => {
          asked.push(url)

          return { ok, text: async () => json }
        },
        to: {
          writeText: async (text) => {
            clipboard.written.push(text)
          },
        },
      }),
  }
}

describe('handing a Week to the coach', () => {
  test('one action puts the Week, Logs and all, on the clipboard', async () => {
    const desk = coachsDesk({ json: '{ "number": 20, "days": [] }' })

    await desk.copy(20)

    expect(desk.clipboard.written).toEqual(['{ "number": 20, "days": [] }'])
  })

  test('the Week asked for is the one named, not whichever is being trained', async () => {
    const desk = coachsDesk()

    await desk.copy(9)

    expect(desk.asked[0]).toContain('number=9')
  })

  test('a Week the server will not give up leaves the clipboard as it was', async () => {
    const desk = coachsDesk({ ok: false })

    await expect(desk.copy(20)).rejects.toThrow('the Week could not be exported')
    expect(desk.clipboard.written).toEqual([])
  })
})
