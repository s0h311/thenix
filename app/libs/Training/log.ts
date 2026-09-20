import { today } from './clock.ts'
import { landingOf } from './saving.ts'
import type { Landing, Save } from './saving.ts'

/**
 * Sends one tap on its way. The screen has already moved on — this only persists it,
 * and answers with what became of it, because a Log the server never got is one the
 * athlete has to be told about rather than one the screen keeps showing as recorded.
 *
 * It never throws: what stopped a Save is the difference between waiting for signal,
 * signing in again, and letting the Save go, and an exception carries none of that.
 */
export async function sendSave(save: Save): Promise<Landing> {
  const action = save.kind === 'log' ? 'logExercise' : 'logDay'

  try {
    const response = await fetch(`/api/actions/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The athlete's own date, read at the moment of the tap: the training happened
      // where the athlete is standing, and a session can cross local midnight.
      // The Week is the Save's own, not the one on screen: trying again later must
      // write the Log where it was made, whatever the athlete has opened since.
      body: JSON.stringify({ weekNumber: save.weekNumber, today: today(), ...save.entry }),
    })

    return landingOf({ status: response.status })
  } catch {
    // The request never completed at all, which is the gym.
    return landingOf({ status: null })
  }
}
