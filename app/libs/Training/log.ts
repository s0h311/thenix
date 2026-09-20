import { today } from './clock.ts'
import type { Save } from './saving.ts'

/**
 * Sends one tap on its way. The screen has already moved on — this only persists it,
 * and throws when it did not, because a Log the server never got is one the athlete
 * has to be told about rather than one the screen keeps showing as recorded.
 */
export async function sendSave(save: Save): Promise<void> {
  const action = save.kind === 'log' ? 'logExercise' : 'logDay'

  const response = await fetch(`/api/actions/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // The athlete's own date, read at the moment of the tap: the training happened
    // where the athlete is standing, and a session can cross local midnight.
    // The Week is the Save's own, not the one on screen: trying again later must
    // write the Log where it was made, whatever the athlete has opened since.
    body: JSON.stringify({ weekNumber: save.weekNumber, today: today(), ...save.entry }),
  })

  if (!response.ok) {
    throw new Error('the Log could not be saved')
  }
}
