import type { Logged, Noted } from './logging.ts'

/** One thing the athlete recorded, on its way to the server. */
export type Save = { kind: 'log'; entry: Logged } | { kind: 'note'; entry: Noted }

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

/**
 * What the screen says while a Log is held, and nothing at all while none is. It
 * names the phone on purpose: the tap is still on screen and tapping it again
 * changes nothing, so the athlete is told where the Log is rather than that it failed.
 */
export function unsavedMessage(outbox: Outbox): string | null {
  const count = unsaved(outbox).length

  if (count === 0) {
    return null
  }

  return `${count} ${count === 1 ? 'Log is' : 'Logs are'} still on this phone. Check your connection.`
}

function targetOf(save: Save): string {
  return save.kind === 'log'
    ? `log:${save.entry.dayOrdinal}:${save.entry.exerciseKey}`
    : `note:${save.entry.dayOrdinal}`
}
