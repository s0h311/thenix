import type { Logged, Noted } from './logging.ts'

/**
 * One thing the athlete recorded, on its way to the server, carrying the Week it was
 * recorded against. The Week travels with the Save rather than being read off the
 * screen when it is sent: a Save held in a basement gym outlives the Week on screen,
 * and the athlete who opens another one before the signal comes back would otherwise
 * have it written against whichever Week they happened to be looking at.
 */
export type Save = { weekNumber: number } & ({ kind: 'log'; entry: Logged } | { kind: 'note'; entry: Noted })

/** What the phone has taken and the server has not: keyed by what each Save records. */
export type Outbox = Readonly<Record<string, Save>>

export const nothingUnsaved: Outbox = {}

/** A Save that did not land. */
export function held(outbox: Outbox, save: Save): Outbox {
  return { ...outbox, [targetOf(save)]: save }
}

/**
 * A Save that reached the server. It clears whatever is held for the same target,
 * not only itself: a later tap on the same Exercise is what an earlier one would
 * have been overwritten by anyway, so landing it settles both.
 */
export function landed(outbox: Outbox, save: Save): Outbox {
  const { [targetOf(save)]: _, ...rest } = outbox

  return rest
}

/** Everything still to be tried again, oldest first. */
export function unsaved(outbox: Outbox): Save[] {
  return Object.values(outbox)
}

/** The warning bar, in words: what is held, and what the one button does about it. */
export type Alert = Readonly<{ said: string; action: string }>

/**
 * What the screen says while a Log is held, and nothing at all while none is. It
 * names the phone on purpose: the tap is still on screen and tapping it again
 * changes nothing, so the athlete is told where the Log is rather than that it failed.
 *
 * The button is worded here beside the sentence, because it is the same fact counted
 * twice and the two would drift apart if the screen wrote one of them.
 */
export function unsavedAlert(outbox: Outbox): Alert | null {
  const count = unsaved(outbox).length

  if (count === 0) {
    return null
  }

  return {
    said: `${count} ${count === 1 ? 'Log is' : 'Logs are'} still on this phone. Check your connection.`,
    action: count === 1 ? 'Save it now' : 'Save them now',
  }
}

function targetOf(save: Save): string {
  return save.kind === 'log'
    ? `log:${save.weekNumber}:${save.entry.dayOrdinal}:${save.entry.exerciseKey}`
    : `note:${save.weekNumber}:${save.entry.dayOrdinal}`
}
