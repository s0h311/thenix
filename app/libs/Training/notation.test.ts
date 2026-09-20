import { describe, expect, test } from 'vitest'
import { asLoad, asPrescribed, asRest } from './notation.ts'
import type { Prescription, Side } from '../../../shared/training.ts'

/** The coach's own notation, as the Week prose writes it. */
function written({ prescription, side = 'both' }: { prescription: Prescription; side?: Side }): string {
  return asPrescribed({ prescription, side })
}

describe('a prescription in the coach’s notation', () => {
  test('sets of reps worked per side read as the coach wrote them', () => {
    expect(written({ prescription: { kind: 'reps', sets: 4, reps: { min: 3, max: 3 } }, side: 'each' })).toBe(
      '4×3/side',
    )
  })

  test('a rep range keeps both ends', () => {
    expect(written({ prescription: { kind: 'reps', sets: 5, reps: { min: 2, max: 3 } } })).toBe('5×2–3')
  })

  test('a set taken to failure asks for max, not for a number', () => {
    expect(written({ prescription: { kind: 'reps', sets: 3, reps: null } })).toBe('3× max')
  })

  test('held time stays in seconds while it reads as seconds', () => {
    expect(written({ prescription: { kind: 'time', sets: 3, seconds: { min: 35, max: 35 } } })).toBe('3×35s')
  })

  test('a single long effort is minutes, without a set count', () => {
    expect(written({ prescription: { kind: 'time', sets: 1, seconds: { min: 600, max: 720 } } })).toBe('10–12 min')
  })

  test('a run carries its distance and its pace', () => {
    expect(written({ prescription: { kind: 'distance', km: { min: 10, max: 11 }, pace: '6:00–6:10/km' } })).toBe(
      '10–11 km @ 6:00–6:10/km',
    )
  })

  test('a run with no pace asked for is just the distance', () => {
    expect(written({ prescription: { kind: 'distance', km: { min: 5, max: 5 } } })).toBe('5 km')
  })

  test('an interval protocol shows the work and the recovery it alternates with', () => {
    expect(
      written({
        prescription: {
          kind: 'rounds',
          rounds: 4,
          work: { kind: 'time', sets: 1, seconds: { min: 240, max: 240 } },
          recovery: { kind: 'time', sets: 1, seconds: { min: 180, max: 180 } },
        },
      }),
    ).toBe('4 rounds: 4 min / 3 min')
  })
})

describe('the load in the coach’s notation', () => {
  test('a symmetric weight names what carries it', () => {
    expect(asLoad({ kind: 'symmetric', value: 11, unit: 'kg', approx: false, implement: 'backpack' })).toBe(
      '11kg (backpack)',
    )
  })

  test('a weight carried one per hand says so', () => {
    expect(asLoad({ kind: 'perHand', value: 1, unit: 'kg', approx: false })).toBe('1kg/hand')
  })

  test('deliberately different weights per arm are shown per arm', () => {
    expect(
      asLoad({
        kind: 'asymmetric',
        left: { value: 7, unit: 'kg', approx: false },
        right: { value: 4, unit: 'kg', approx: true },
        implement: 'backpack',
      }),
    ).toBe('L 7kg / R ~4kg (backpack)')
  })

  test('bodyweight is stated, not left blank', () => {
    expect(asLoad({ kind: 'bodyweight' })).toBe('bodyweight')
  })

  test('an improvised load reads as the coach described it', () => {
    expect(asLoad({ kind: 'improvised', description: 'water canisters' })).toBe('water canisters')
  })
})

describe('the rest in the coach’s notation', () => {
  test('short rests stay in seconds', () => {
    expect(asRest({ min: 60, max: 60 })).toBe('rest 60s')
  })

  test('long rests read as minutes', () => {
    expect(asRest({ min: 180, max: 180 })).toBe('rest 3 min')
  })

  test('a rest range keeps both ends', () => {
    expect(asRest({ min: 120, max: 180 })).toBe('rest 2–3 min')
  })
})
