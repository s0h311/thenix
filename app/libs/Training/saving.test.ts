import { describe, expect, test } from 'vitest'
import {
  answeredSave,
  chooseAlert,
  dismissed,
  held,
  landed,
  landingOf,
  movedOn,
  nothingUnsaved,
  unsaved,
  unsavedAlert,
} from './saving.ts'
import type { Save } from './saving.ts'
import type { Difficulty } from '../../../shared/training.ts'

function tap({ weekNumber = 12, dayOrdinal = 1, exerciseKey = 'dips', difficulty = 'good' as Difficulty } = {}): Save {
  return {
    weekNumber,
    kind: 'log',
    entry: { dayOrdinal, exerciseKey, log: { kind: 'difficulty', difficulty, note: null } },
  }
}

function dayNote({ weekNumber = 12, dayOrdinal = 1, note = 'walked' } = {}): Save {
  return { weekNumber, kind: 'note', entry: { dayOrdinal, note } }
}

describe('a Log that did not reach the server', () => {
  test('is held, so the screen can say so instead of claiming it saved', () => {
    expect(unsaved(held(nothingUnsaved, { save: tap(), why: 'held' }))).toEqual([tap()])
  })

  test('stops being held once it lands, so trying again ends', () => {
    expect(unsaved(landed(held(nothingUnsaved, { save: tap(), why: 'held' }), tap()))).toEqual([])
  })
})

describe('what is held, and what is a separate thing to hold', () => {
  test('a mistap corrected is one Log to save, carrying the correction', () => {
    const corrected = held(held(nothingUnsaved, { save: tap(), why: 'held' }), {
      save: tap({ difficulty: 'challenging' }),
      why: 'held',
    })

    expect(unsaved(corrected)).toEqual([tap({ difficulty: 'challenging' })])
  })

  test('the Day it was tapped on is part of what it records, so one Movement twice is twice', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), { save: tap({ dayOrdinal: 4 }), why: 'held' })

    expect(unsaved(both)).toEqual([tap(), tap({ dayOrdinal: 4 })])
  })

  test('the Week it was recorded against is part of what it records, so Day 1 of two Weeks is twice', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), {
      save: tap({ weekNumber: 13 }),
      why: 'held',
    })

    expect(unsaved(both)).toEqual([tap(), tap({ weekNumber: 13 })])
  })

  test('a Log landing on this Week settles nothing held against another', () => {
    const settled = landed(held(nothingUnsaved, { save: tap(), why: 'held' }), tap({ weekNumber: 13 }))

    expect(unsaved(settled)).toEqual([tap()])
  })

  test("the Day's own note is not the Log of any Exercise on it", () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), { save: dayNote(), why: 'held' })

    expect(unsaved(both)).toEqual([tap(), dayNote()])
  })
})

describe('what the athlete is told', () => {
  test('nothing, while everything the phone took has landed', () => {
    expect(unsavedAlert(nothingUnsaved)).toBeNull()
  })

  test('that the Log is on the phone and not on the server, so a retap is not the fix', () => {
    expect(unsavedAlert(held(nothingUnsaved, { save: tap(), why: 'held' }))).toEqual({
      said: '1 Log is still on this phone. Check your connection.',
      action: 'Save it now',
      does: 'retry',
    })
  })

  test('how many, because a dead connection loses a set at a time', () => {
    const three = held(
      held(held(nothingUnsaved, { save: tap(), why: 'held' }), { save: tap({ exerciseKey: 'rows' }), why: 'held' }),
      { save: dayNote(), why: 'held' },
    )

    expect(unsavedAlert(three)).toEqual({
      said: '3 Logs are still on this phone. Check your connection.',
      action: 'Save them now',
      does: 'retry',
    })
  })
})

describe('what became of a Save the phone sent', () => {
  test('a Save the server took is landed, so it stops being held', () => {
    expect(landingOf({ status: 200 })).toBe('landed')
  })

  test('a request that never completed is held — the gym, and the one a retry fixes', () => {
    expect(landingOf({ status: null })).toBe('held')
  })

  test('a server that fell over is held too: it may take the same Save a minute later', () => {
    expect(landingOf({ status: 503 })).toBe('held')
  })

  test('being signed out is said apart from the connection, because signing in is the fix', () => {
    expect(landingOf({ status: 401 })).toBe('signedOut')
  })

  test('a Save the server will not take is refused, however many times it is sent', () => {
    expect(landingOf({ status: 404 })).toBe('refused')
  })
})

describe('a Save stopped by being signed out', () => {
  test('is said as being signed out and not as the signal, because signing in is the fix', () => {
    expect(unsavedAlert(held(nothingUnsaved, { save: tap(), why: 'signedOut' }))).toEqual({
      said: '1 Log is still on this phone. You were signed out — sign in again, then save it.',
      action: 'Save it now',
      does: 'retry',
    })
  })

  test('wins over the connection when both are held: nothing lands until the athlete is back in', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), {
      save: tap({ exerciseKey: 'rows' }),
      why: 'signedOut',
    })

    expect(unsavedAlert(both)?.said).toBe(
      '2 Logs are still on this phone. You were signed out — sign in again, then save them.',
    )
  })

  test('is still worth sending again, once the athlete has signed back in', () => {
    expect(unsaved(held(nothingUnsaved, { save: tap(), why: 'signedOut' }))).toEqual([tap()])
  })
})

describe('a Save the server will not take', () => {
  test('is never sent again, so the one tap is not spent on what cannot land', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), {
      save: tap({ exerciseKey: 'rows' }),
      why: 'refused',
    })

    expect(unsaved(both)).toEqual([tap()])
  })

  test('says what happened and offers the only thing left to do about it', () => {
    expect(unsavedAlert(held(nothingUnsaved, { save: tap(), why: 'refused' }))).toEqual({
      said: '1 Log could not be saved — the Week no longer has what it was written against.',
      action: 'Dismiss it',
      does: 'dismiss',
    })
  })

  test('waits its turn: what can still land is the more useful thing to say', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'refused' }), {
      save: tap({ exerciseKey: 'rows' }),
      why: 'held',
    })

    expect(unsavedAlert(both)).toEqual({
      said: '2 Logs are still on this phone. Check your connection.',
      action: 'Save them now',
      does: 'retry',
    })
  })

  test('is what dismissing clears, and it clears nothing else', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'refused' }), {
      save: tap({ exerciseKey: 'rows' }),
      why: 'held',
    })

    expect(unsaved(dismissed(both))).toEqual([tap({ exerciseKey: 'rows' })])
    expect(unsavedAlert(dismissed(both))?.said).toBe('1 Log is still on this phone. Check your connection.')
  })

  test('leaves nothing said at all once it is the last thing held', () => {
    expect(unsavedAlert(dismissed(held(nothingUnsaved, { save: tap(), why: 'refused' })))).toBeNull()
  })

  test('is settled by a later tap on the same Exercise that does land', () => {
    const settled = landed(held(nothingUnsaved, { save: tap(), why: 'refused' }), tap({ difficulty: 'easy' }))

    expect(unsavedAlert(settled)).toBeNull()
  })
})

describe('what a Save means for reading the Week back', () => {
  test('a Save the server took moved what it holds, so the Week and the Shelf are read again', () => {
    expect(movedOn('landed')).toBe(true)
  })

  test('a Save refused is the Week having moved past what is on screen, so it is read again too', () => {
    expect(movedOn('refused')).toBe(true)
  })

  test('a Save held in a basement gym moved nothing — and a read that cannot reach the server either is what takes the Day off the screen mid-set', () => {
    expect(movedOn('held')).toBe(false)
  })

  test('being signed out moved nothing, and asking again only asks who is asking', () => {
    expect(movedOn('signedOut')).toBe(false)
  })
})

describe('what the bar at the foot of the screen shows', () => {
  test('with nothing Unsaved and an update waiting, it offers the new version with Reload', () => {
    expect(chooseAlert({ outbox: nothingUnsaved, updateWaiting: true, sending: false })).toEqual({
      said: 'A new version of thenix is ready.',
      action: 'Reload',
      does: 'reload',
    })
  })

  test('with Unsaved Logs and an update waiting, it stays the Unsaved alert, so a reload cannot lose one', () => {
    expect(
      chooseAlert({ outbox: held(nothingUnsaved, { save: tap(), why: 'held' }), updateWaiting: true, sending: false }),
    ).toEqual({
      said: '1 Log is still on this phone. Check your connection.',
      action: 'Save it now',
      does: 'retry',
    })
  })

  test('a refused Log not yet let go of still holds the update back, so the athlete reads it first', () => {
    expect(
      chooseAlert({
        outbox: held(nothingUnsaved, { save: tap(), why: 'refused' }),
        updateWaiting: true,
        sending: false,
      })?.does,
    ).toBe('dismiss')
  })

  test('with nothing Unsaved and no update, there is no bar', () => {
    expect(chooseAlert({ outbox: nothingUnsaved, updateWaiting: false, sending: false })).toBeNull()
  })

  test('once the last Unsaved Log lands, the waiting update surfaces', () => {
    const outbox = landed(held(nothingUnsaved, { save: tap(), why: 'held' }), tap())

    expect(chooseAlert({ outbox, updateWaiting: true, sending: false })?.does).toBe('reload')
  })

  test('with a Log still on its way, the update waits too: it is on no server yet and a reload would drop it', () => {
    expect(chooseAlert({ outbox: nothingUnsaved, updateWaiting: true, sending: true })).toBeNull()
  })

  test('a Log on its way does not hide the Unsaved alert, which is about the ones that already stopped', () => {
    const outbox = held(nothingUnsaved, { save: tap(), why: 'held' })

    expect(chooseAlert({ outbox, updateWaiting: true, sending: true })?.does).toBe('retry')
  })
})

describe('the answer to a Save', () => {
  test('a 401 keeps the Log for signing back in, because nobody chose to leave', () => {
    const outbox = answeredSave(nothingUnsaved, { save: tap(), landing: 'signedOut', athleteLeft: false })

    expect(unsaved(outbox)).toEqual([tap()])
  })

  test('landing clears what was held for the same target', () => {
    const outbox = held(nothingUnsaved, { save: tap(), why: 'held' })

    expect(answeredSave(outbox, { save: tap(), landing: 'landed', athleteLeft: false })).toEqual(nothingUnsaved)
  })

  test('arriving after the athlete signed out or deleted the account holds nothing, so no other account can save it', () => {
    const outbox = answeredSave(nothingUnsaved, { save: tap(), landing: 'signedOut', athleteLeft: true })

    expect(outbox).toEqual(nothingUnsaved)
  })

  test('arriving after the athlete left does not touch what the next athlete has held', () => {
    const next = held(nothingUnsaved, { save: tap(), why: 'held' })

    expect(answeredSave(next, { save: tap(), landing: 'landed', athleteLeft: true })).toEqual(next)
  })
})

describe('being signed out mid-training, and signing back in', () => {
  const signedOut = held(held(nothingUnsaved, { save: tap(), why: 'signedOut' }), { save: dayNote(), why: 'signedOut' })

  test('a Save sent again before signing in is still held, and still says to sign in', () => {
    const again = held(signedOut, { save: tap(), why: 'signedOut' })

    expect(unsaved(again)).toEqual([tap(), dayNote()])
    expect(unsavedAlert(again)?.said).toBe(
      '2 Logs are still on this phone. You were signed out — sign in again, then save them.',
    )
  })

  test('once signed in, the one button sends every Log, and when they land a waiting update surfaces', () => {
    expect(chooseAlert({ outbox: signedOut, updateWaiting: true, sending: false })?.does).toBe('retry')

    const settled = unsaved(signedOut).reduce(landed, signedOut)

    expect(chooseAlert({ outbox: settled, updateWaiting: true, sending: false })?.does).toBe('reload')
  })
})
