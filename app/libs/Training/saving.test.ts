import { describe, expect, test } from 'vitest'
import { dismissed, held, landed, landingOf, movedOn, nothingUnsaved, unsaved, unsavedAlert } from './saving.ts'
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

  test('an ended session is said apart from the connection, because signing in is the fix', () => {
    expect(landingOf({ status: 401 })).toBe('signedOut')
  })

  test('a Save the server will not take is refused, however many times it is sent', () => {
    expect(landingOf({ status: 404 })).toBe('refused')
  })
})

describe('a Save the session ended under', () => {
  test('is said as the session and not as the signal, because signing in is the fix', () => {
    expect(unsavedAlert(held(nothingUnsaved, { save: tap(), why: 'signedOut' }))).toEqual({
      said: '1 Log is still on this phone. Your session ended — sign in again, then save it.',
      action: 'Save it now',
      does: 'retry',
    })
  })

  test('wins over the connection when both are held: nothing lands until the session is back', () => {
    const both = held(held(nothingUnsaved, { save: tap(), why: 'held' }), {
      save: tap({ exerciseKey: 'rows' }),
      why: 'signedOut',
    })

    expect(unsavedAlert(both)?.said).toBe(
      '2 Logs are still on this phone. Your session ended — sign in again, then save them.',
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

  test('a session that ended moved nothing, and asking again only asks who is asking', () => {
    expect(movedOn('signedOut')).toBe(false)
  })
})
