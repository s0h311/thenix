import { describe, expect, test } from 'vitest'
import { sendSave } from './log.ts'
import type { Save } from './saving.ts'

/** Just enough of a server to see what was sent to it, and to refuse. */
function server({ ok = true } = {}) {
  const sent: { url: string; body: unknown }[] = []

  return {
    sent,
    using: async (url: string, init: { body: string }) => {
      sent.push({ url, body: JSON.parse(init.body) })

      return { ok }
    },
  }
}

const tap: Save = {
  kind: 'log',
  entry: { dayOrdinal: 3, exerciseKey: 'dips', log: { kind: 'difficulty', difficulty: 'good', note: null } },
}

describe('a Log on its way to the server', () => {
  test('names the Week, the Day, the Exercise and the day the athlete is on', async () => {
    const to = server()

    await sendSave({ weekNumber: 12, save: tap, on: '2025-08-25', using: to.using })

    expect(to.sent).toEqual([
      {
        url: '/api/actions/logExercise',
        body: {
          weekNumber: 12,
          today: '2025-08-25',
          dayOrdinal: 3,
          exerciseKey: 'dips',
          log: { kind: 'difficulty', difficulty: 'good', note: null },
        },
      },
    ])
  })

  test("the Day's own note goes to the Day, belonging to no Exercise on it", async () => {
    const to = server()

    await sendSave({
      weekNumber: 12,
      save: { kind: 'note', entry: { dayOrdinal: 3, note: 'walked' } },
      on: '2025-08-25',
      using: to.using,
    })

    expect(to.sent).toEqual([
      { url: '/api/actions/logDay', body: { weekNumber: 12, today: '2025-08-25', dayOrdinal: 3, note: 'walked' } },
    ])
  })

  test('a server that refuses it is not a Log saved — the screen has to hear about it', async () => {
    const to = server({ ok: false })

    await expect(sendSave({ weekNumber: 12, save: tap, on: '2025-08-25', using: to.using })).rejects.toThrow(
      'the Log could not be saved',
    )
  })
})
