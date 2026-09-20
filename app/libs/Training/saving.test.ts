import { describe, expect, test } from 'vitest'
import { held, landed, nothingUnsaved, unsaved, unsavedAlert } from './saving.ts'
import type { Save } from './saving.ts'
import type { Difficulty } from '../../../shared/training.ts'

function tap({ dayOrdinal = 1, exerciseKey = 'dips', difficulty = 'good' as Difficulty } = {}): Save {
  return {
    kind: 'log',
    entry: { dayOrdinal, exerciseKey, log: { kind: 'difficulty', difficulty, note: null } },
  }
}

function dayNote({ dayOrdinal = 1, note = 'walked' } = {}): Save {
  return { kind: 'note', entry: { dayOrdinal, note } }
}

describe('a Log that did not reach the server', () => {
  test('is held, so the screen can say so instead of claiming it saved', () => {
    expect(unsaved(held(nothingUnsaved, tap()))).toEqual([tap()])
  })

  test('stops being held once it lands, so trying again ends', () => {
    expect(unsaved(landed(held(nothingUnsaved, tap()), tap()))).toEqual([])
  })
})

describe('what is held, and what is a separate thing to hold', () => {
  test('a mistap corrected is one Log to save, carrying the correction', () => {
    const corrected = held(held(nothingUnsaved, tap()), tap({ difficulty: 'challenging' }))

    expect(unsaved(corrected)).toEqual([tap({ difficulty: 'challenging' })])
  })

  test('the Day it was tapped on is part of what it records, so one Movement twice is twice', () => {
    const both = held(held(nothingUnsaved, tap()), tap({ dayOrdinal: 4 }))

    expect(unsaved(both)).toEqual([tap(), tap({ dayOrdinal: 4 })])
  })

  test("the Day's own note is not the Log of any Exercise on it", () => {
    const both = held(held(nothingUnsaved, tap()), dayNote())

    expect(unsaved(both)).toEqual([tap(), dayNote()])
  })
})

describe('what the athlete is told', () => {
  test('nothing, while everything the phone took has landed', () => {
    expect(unsavedAlert(nothingUnsaved)).toBeNull()
  })

  test('that the Log is on the phone and not on the server, so a retap is not the fix', () => {
    expect(unsavedAlert(held(nothingUnsaved, tap()))).toEqual({
      said: '1 Log is still on this phone. Check your connection.',
      action: 'Save it now',
    })
  })

  test('how many, because a dead connection loses a set at a time', () => {
    const three = held(held(held(nothingUnsaved, tap()), tap({ exerciseKey: 'rows' })), dayNote())

    expect(unsavedAlert(three)).toEqual({
      said: '3 Logs are still on this phone. Check your connection.',
      action: 'Save them now',
    })
  })
})
