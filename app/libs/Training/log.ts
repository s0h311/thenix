import { today } from './clock.ts'
import type { Save } from './saving.ts'

/** Just enough of `fetch` to post one Save and hear whether it landed. */
type Sender = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{
  ok: boolean
}>

/**
 * Sends one tap on its way. The screen has already moved on — this only persists it,
 * and throws when it did not, because a Log the server never got is one the athlete
 * has to be told about rather than one the screen keeps showing as recorded.
 */
export async function sendSave({
  weekNumber,
  save,
  on = today(),
  using = fetch,
}: {
  weekNumber: number
  save: Save
  on?: string
  using?: Sender
}): Promise<void> {
  const action = save.kind === 'log' ? 'logExercise' : 'logDay'

  const response = await using(`/api/actions/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ weekNumber, today: on, ...save.entry }),
  })

  if (!response.ok) {
    throw new Error('the Log could not be saved')
  }
}
