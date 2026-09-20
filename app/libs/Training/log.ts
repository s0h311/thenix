import type { Logged, Noted } from '../../components/Training/WeekView.tsx'

/** The athlete's local date — the Day being trained is the one where they are. */
export function today(): string {
  const now = new Date()

  return [now.getFullYear(), `${now.getMonth() + 1}`.padStart(2, '0'), `${now.getDate()}`.padStart(2, '0')].join('-')
}

/** Sends one tap on its way. The screen has already moved on — this only persists it. */
export async function sendLog({ weekNumber, entry }: { weekNumber: number; entry: Logged }): Promise<void> {
  await send('/api/actions/logExercise', { weekNumber, today: today(), ...entry })
}

/** The same, for what belongs to the Day rather than to any Exercise on it. */
export async function sendNote({ weekNumber, entry }: { weekNumber: number; entry: Noted }): Promise<void> {
  await send('/api/actions/logDay', { weekNumber, today: today(), ...entry })
}

async function send(action: string, body: object): Promise<void> {
  const response = await fetch(action, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error('the Log could not be saved')
  }
}
