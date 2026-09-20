import type { Logged, Noted } from './logging.ts'

/**
 * One thing the athlete recorded, on its way to the server, carrying the Week it was
 * recorded against. The Week travels with the Save rather than being read off the
 * screen when it is sent: a Save held in a basement gym outlives the Week on screen,
 * and the athlete who opens another one before the signal comes back would otherwise
 * have it written against whichever Week they happened to be looking at.
 */
export type Save = { weekNumber: number } & ({ kind: 'log'; entry: Logged } | { kind: 'note'; entry: Noted })

/**
 * What became of a Save, in the four answers it can actually be.
 *
 * `landed` is the server having taken it. The other three are all "the server does
 * not have this", and they are told apart because the athlete can do something
 * different about each: `held` is the connection and a retry is the whole fix;
 * `signedOut` needs signing in first, and a retry before that changes nothing;
 * `refused` is the server declining the Save itself, which no number of retries
 * moves.
 */
export type Landing = 'landed' | 'held' | 'signedOut' | 'refused'

/** Why the server does not have a Save — everything a Landing is but landing. */
export type Blocked = Exclude<Landing, 'landed'>

/**
 * Which of those the server answered with.
 *
 * This is a module because the screen had one: anything but a 2xx was held and said
 * as "still on this phone. Check your connection.", and the one button on the bar
 * sent it again. An ended session was therefore reported as no signal, and the tap
 * that was supposed to fix it could not. Worse, a Save the server will never take —
 * a Log tapped in a basement gym against an Exercise a Revision has since dropped,
 * which the server will not write to — was held for good: the count never fell and
 * the bar never cleared, pinned over every training screen for the rest of the day.
 *
 * A server that fell over is held with the gym rather than refused: the same Save a
 * minute later is one it may well take. `status: null` is the request never
 * completing at all, which is the gym itself.
 */
export function landingOf({ status }: { status: number | null }): Landing {
  if (status === null) {
    return 'held'
  }

  if (status >= 200 && status < 300) {
    return 'landed'
  }

  if (status === 401) {
    return 'signedOut'
  }

  return status >= 400 && status < 500 ? 'refused' : 'held'
}

/**
 * What the phone has taken and the server has not: keyed by what each Save records,
 * and carrying why the server has not got it. The reason rides along because it is
 * the whole of what the athlete can do next — a connection is waited out, a session
 * is signed back into, and a refusal is only ever read and let go of.
 */
export type Outbox = Readonly<Record<string, { save: Save; why: Blocked }>>

export const nothingUnsaved: Outbox = {}

/** A Save that did not land, held with what stopped it. */
export function held(outbox: Outbox, unsent: { save: Save; why: Blocked }): Outbox {
  return { ...outbox, [targetOf(unsent.save)]: unsent }
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

/**
 * Everything still to be tried again, oldest first — which is everything but the
 * refused. Sending one of those again spends the athlete's one tap on a Save that
 * cannot land, and leaves the count where it was.
 */
export function unsaved(outbox: Outbox): Save[] {
  return Object.values(outbox)
    .filter((one) => one.why !== 'refused')
    .map((one) => one.save)
}

/**
 * The refused let go of. It is the only way the bar clears once the server will not
 * take what is left: without it the warning is pinned over every training screen for
 * the rest of the session, counting Logs that nothing can do anything about.
 */
export function dismissed(outbox: Outbox): Outbox {
  return Object.fromEntries(Object.entries(outbox).filter(([, one]) => one.why !== 'refused'))
}

/** The warning bar, in words: what is held, and what the one button does about it. */
export type Alert = Readonly<{ said: string; action: string; does: 'retry' | 'dismiss' }>

/**
 * What the screen says while a Log is held, and nothing at all while none is. It
 * names the phone on purpose: the tap is still on screen and tapping it again
 * changes nothing, so the athlete is told where the Log is rather than that it failed.
 *
 * The button is worded here beside the sentence, because it is the same fact counted
 * twice and the two would drift apart if the screen wrote one of them — and so is
 * what the button does, because that follows from the reason and not from the screen.
 *
 * What can still land is said first, and the whole count is said with it: the athlete
 * is owed the number of Logs the coach will not see, and only then the one thing to
 * do about it. A refusal is last because it is the only one that is not an errand.
 */
export function unsavedAlert(outbox: Outbox): Alert | null {
  const all = Object.values(outbox)
  const count = all.length

  if (count === 0) {
    return null
  }

  const one = count === 1

  if (all.some((unsent) => unsent.why === 'signedOut')) {
    return {
      said: `${count} ${one ? 'Log is' : 'Logs are'} still on this phone. Your session ended — sign in again, then save ${one ? 'it' : 'them'}.`,
      action: one ? 'Save it now' : 'Save them now',
      does: 'retry',
    }
  }

  if (all.some((unsent) => unsent.why === 'held')) {
    return {
      said: `${count} ${one ? 'Log is' : 'Logs are'} still on this phone. Check your connection.`,
      action: one ? 'Save it now' : 'Save them now',
      does: 'retry',
    }
  }

  return {
    said: `${count} ${one ? 'Log' : 'Logs'} could not be saved — the Week no longer has what ${one ? 'it was' : 'they were'} written against.`,
    action: one ? 'Dismiss it' : 'Dismiss them',
    does: 'dismiss',
  }
}

function targetOf(save: Save): string {
  return save.kind === 'log'
    ? `log:${save.weekNumber}:${save.entry.dayOrdinal}:${save.entry.exerciseKey}`
    : `note:${save.weekNumber}:${save.entry.dayOrdinal}`
}
