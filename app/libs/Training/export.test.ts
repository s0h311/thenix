import { describe, expect, test } from 'vitest'
import { copyRegistry, copySchema, copyWeek } from './export.ts'

/** The server, holding one Week, and a clipboard to watch. */
function coachsDesk({ json = '{ "number": 20 }', ok = true }: { json?: string; ok?: boolean } = {}) {
  const asked: string[] = []
  const clipboard = { written: [] as string[] }

  const server = async (url: string) => {
    asked.push(url)

    return { ok, text: async () => json }
  }

  const to = {
    writeText: async (text: string) => {
      clipboard.written.push(text)
    },
  }

  return {
    asked,
    clipboard,
    copy: (number: number) => copyWeek({ number, from: server, to }),
    copySchema: () => copySchema({ from: server, to }),
    copyRegistry: () => copyRegistry({ from: server, to }),
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

describe('handing the coach what it writes with', () => {
  test('one action puts the schema on the clipboard', async () => {
    const desk = coachsDesk({ json: '{ "type": "object" }' })

    await desk.copySchema()

    expect(desk.asked[0]).toContain('exportSchema')
    expect(desk.clipboard.written).toEqual(['{ "type": "object" }'])
  })

  test('one action puts the Movement list on the clipboard', async () => {
    const desk = coachsDesk({ json: '{ "movementIds": ["dip"] }' })

    await desk.copyRegistry()

    expect(desk.asked[0]).toContain('exportRegistry')
    expect(desk.clipboard.written).toEqual(['{ "movementIds": ["dip"] }'])
  })

  test('a schema the server will not give up leaves the clipboard as it was', async () => {
    const desk = coachsDesk({ ok: false })

    await expect(desk.copySchema()).rejects.toThrow('the schema could not be exported')
    expect(desk.clipboard.written).toEqual([])
  })

  test('a Movement list the server will not give up leaves the clipboard as it was', async () => {
    const desk = coachsDesk({ ok: false })

    await expect(desk.copyRegistry()).rejects.toThrow('the Movement list could not be exported')
    expect(desk.clipboard.written).toEqual([])
  })
})
