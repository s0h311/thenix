import { describe, expect, test } from 'vitest'
import { copyFaults, faultsForCoach } from './faults.ts'
import type { ImportFault } from '../../../shared/training.ts'

/** A rejected paste, as the server hands it back. */
const FAULTS: ImportFault[] = [
  { day: null, exercise: null, field: 'number', message: 'Invalid input: expected number, received string' },
  { day: 3, exercise: 'kickstand-rdl', field: 'load.value', message: 'Invalid input: expected number' },
  { day: 1, exercise: 'dips', field: 'key', message: 'Two Exercises on this Day share the key "dips".' },
]

describe('the fault list the coach fixes from', () => {
  test('a fault inside a Day names the Day, the Exercise and the field', () => {
    expect(faultsForCoach(FAULTS)).toContain('day 3 · kickstand-rdl · load.value: Invalid input: expected number')
  })

  test('a fault outside any Day is named for the Week itself', () => {
    expect(faultsForCoach(FAULTS)).toContain('week · number: Invalid input: expected number, received string')
  })

  test('every fault is in the list, because the coach fixes them in one pass', () => {
    expect(
      faultsForCoach(FAULTS)
        .split('\n')
        .filter((line) => line.startsWith('- ')),
    ).toHaveLength(3)
  })

  test('one action puts the whole list on the clipboard', async () => {
    const written: string[] = []

    await copyFaults({ faults: FAULTS, to: { writeText: async (text) => void written.push(text) } })

    expect(written).toEqual([faultsForCoach(FAULTS)])
  })
})
