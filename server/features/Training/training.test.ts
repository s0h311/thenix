import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { createTestDatabase } from '../../infrastructure/Database/testDatabase.ts'
import { user } from '../../infrastructure/Database/schemas/auth.ts'
import { createTraining } from './createTraining.ts'
import type { Database } from '../../infrastructure/Database/types.ts'
import type { Day, Exercise, Week } from './types.ts'

/* oxlint-disable typescript/no-explicit-any -- the coach is an LLM: a broken Week can hold anything anywhere. */

/**
 * Long after every Week in these fixtures. Reads are relative to a date because a
 * rest Day finishes by the clock; tests that are not about that say so with this.
 */
const AFTERWARDS = '2025-09-30'

/** The coach's JSON, as it arrives on the clipboard. */
function coachJson(week: number): string {
  return readFileSync(new URL(`./fixtures/week-${week}.json`, import.meta.url), 'utf8')
}

/** The same Week, with the coach having got one thing wrong. */
function coachJsonWith(week: number, breakIt: (week: any) => void): string {
  const parsed = JSON.parse(coachJson(week))

  breakIt(parsed)

  return JSON.stringify(parsed)
}

async function signUp({ database, email }: { database: Database; email: string }): Promise<string> {
  const id = crypto.randomUUID()

  await database.insert(user).values({ id, name: email, email, updatedAt: new Date() })

  return id
}

/** A fresh Postgres, a fresh athlete, and the Training feature over both. */
async function openApp() {
  const database = await createTestDatabase()

  return {
    training: createTraining({ database }),
    athlete: await signUp({ database, email: 'athlete@example.com' }),
    database,
  }
}

type App = Awaited<ReturnType<typeof openApp>>

/** Pastes a Week in and hands back what the app then shows. */
async function importedWeek({
  training,
  athlete,
  number,
  startDate,
}: Pick<App, 'training' | 'athlete'> & { number: number; startDate: string }): Promise<Week> {
  const result = await training.importWeek({ userId: athlete, json: coachJson(number), startDate, today: AFTERWARDS })

  if (!result.ok) {
    throw new Error(`week ${number} did not import: ${JSON.stringify(result.errors)}`)
  }

  return result.week
}

/** The Week as it leaves for the coach — JSON text, read back to look inside. */
async function exportedWeek({
  training,
  athlete,
  number,
}: Pick<App, 'training' | 'athlete'> & { number: number }): Promise<any> {
  const json = await training.exportWeek({ userId: athlete, number })

  if (json === null) {
    throw new Error(`week ${number} did not export`)
  }

  return JSON.parse(json)
}

function dayIn(week: Week | null, ordinal: number): Day {
  const found = week?.days.find((day) => day.ordinal === ordinal)

  if (found === undefined) {
    throw new Error(`no day ${ordinal}`)
  }

  return found
}

function exerciseIn(week: Week | null, { ordinal, key }: { ordinal: number; key: string }): Exercise {
  const found = week?.days.find((day) => day.ordinal === ordinal)?.exercises.find((exercise) => exercise.key === key)

  if (found === undefined) {
    throw new Error(`no exercise ${key} on day ${ordinal}`)
  }

  return found
}

/** Taps a rating on every Exercise of a Day but the ones named. */
async function logEvery({
  training,
  athlete,
  number,
  ordinal,
  except,
}: Pick<App, 'training' | 'athlete'> & { number: number; ordinal: number; except: string[] }): Promise<void> {
  const day = dayIn(await training.getWeek({ userId: athlete, number, today: AFTERWARDS }), ordinal)

  for (const one of day.exercises) {
    if (except.includes(one.key)) {
      continue
    }

    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: number,
      dayOrdinal: ordinal,
      exerciseKey: one.key,
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })
  }
}

describe('importing a Week', () => {
  test('a pasted Week is readable back, Day by Day', async () => {
    const { training, athlete } = await openApp()

    await training.importWeek({ userId: athlete, json: coachJson(9), startDate: '2025-06-05', today: AFTERWARDS })

    const week = await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS })

    expect(week?.days.map((day) => day.ordinal)).toEqual([5, 6, 7])
    expect(week?.days[0]?.exercises.map((exercise) => exercise.name)).toEqual([
      'Scapular pulls',
      'Pull-up negatives',
      'Full pull-up attempts',
      'Dead hang',
      'Inverted/table rows',
      'Reverse snow angels',
      'Leg raises',
    ])
    expect(week?.days[0]?.exercises[3]?.raw).toBe('Dead hang 3× max.')
  })
})

describe('what the coach can prescribe', () => {
  test('a nested interval protocol comes back with its work and recovery intact', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(exerciseIn(week, { ordinal: 2, key: 'norwegian-4x4' }).prescription).toEqual({
      kind: 'rounds',
      rounds: 4,
      work: { kind: 'time', sets: 1, seconds: { min: 240, max: 240 } },
      recovery: { kind: 'time', sets: 1, seconds: { min: 180, max: 180 } },
    })
  })

  test('a run keeps its distance range and its pace', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(exerciseIn(week, { ordinal: 6, key: 'zone-2-run' }).prescription).toEqual({
      kind: 'distance',
      km: { min: 10, max: 11 },
      pace: '6:00–6:10/km',
    })
  })

  test('an Exercise taken to failure comes back with no rep count', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    const curls = exerciseIn(week, { ordinal: 1, key: 'biceps-curls' })

    expect(curls.toFailure).toBe(true)
    expect(curls.prescription).toEqual({ kind: 'reps', sets: 3, reps: null })
  })

  test('a load carried one per hand comes back per hand', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(exerciseIn(week, { ordinal: 1, key: 'hollow-body' }).load).toEqual({
      kind: 'perHand',
      value: 1,
      unit: 'kg',
      approx: false,
    })
  })

  test('deliberately different loads per arm survive the round trip', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 12, startDate: '2025-06-26' })

    expect(exerciseIn(week, { ordinal: 1, key: 'tricep-extension' }).load).toEqual({
      kind: 'asymmetric',
      left: { value: 7, unit: 'kg', approx: false },
      right: { value: 4, unit: 'kg', approx: true },
      implement: 'backpack',
    })
  })

  test('bodyweight and improvised loads come back as written', async () => {
    const { training, athlete } = await openApp()

    const fifteen = await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    const nine = await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })

    expect(exerciseIn(fifteen, { ordinal: 3, key: 'box-pistols' }).load).toEqual({ kind: 'bodyweight' })
    expect(exerciseIn(nine, { ordinal: 7, key: 'single-leg-rdl' }).load).toEqual({
      kind: 'improvised',
      description: 'backpack',
    })
  })

  test('the right and left arm are separate Exercises of one Movement, each with its own load', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    const right = exerciseIn(week, { ordinal: 1, key: 'right-arm-curl' })
    const left = exerciseIn(week, { ordinal: 1, key: 'left-arm-curl' })

    expect([right.movementId, left.movementId]).toEqual(['biceps-curl', 'biceps-curl'])
    expect([right.side, left.side]).toEqual(['right', 'left'])
    expect([right.load, left.load]).toEqual([
      { kind: 'symmetric', value: 7, unit: 'kg', approx: false },
      { kind: 'symmetric', value: 9, unit: 'kg', approx: false },
    ])
  })

  test('an Exercise the coach said nothing about is two-sided, required and not to failure', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    const dips = exerciseIn(week, { ordinal: 1, key: 'dips' })

    expect([dips.side, dips.optional, dips.toFailure]).toEqual(['both', false, false])
  })

  test('an all-optional Day keeps every Exercise optional', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(week.days[6]?.exercises.map((one) => one.optional)).toEqual([true, true])
  })

  test('a rest Day has no Exercises at all', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(week.days[3]?.kind).toBe('rest')
    expect(week.days[3]?.exercises).toEqual([])
  })
})

describe('the Movement registry', () => {
  test('a Movement trained in an earlier Week is reused, not registered twice', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    const twenty = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(exerciseIn(twenty, { ordinal: 1, key: 'biceps-curls' }).movementId).toBe('biceps-curl')
    expect(exerciseIn(twenty, { ordinal: 5, key: 'scapular-pulls' }).movementId).toBe('scapular-pull')
  })

  test('one Movement trained on three Days of a Week imports once and reads back on each', async () => {
    const { training, athlete } = await openApp()

    const week = await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect([1, 3, 5].map((ordinal) => exerciseIn(week, { ordinal, key: 'biceps-curls' }).movementId)).toEqual([
      'biceps-curl',
      'biceps-curl',
      'biceps-curl',
    ])
  })

  test('a Movement another athlete registered first is shared, not rejected', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    const theirs = await importedWeek({ training, athlete: other, number: 20, startDate: '2025-08-25' })

    expect(exerciseIn(theirs, { ordinal: 1, key: 'dips' }).movementId).toBe('dip')
  })
})

describe('whose Week it is', () => {
  test('an athlete never sees another athlete’s Week', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(await training.getWeek({ userId: other, number: 20, today: AFTERWARDS })).toBeNull()
  })

  test('two athletes can each hold their own Week 20', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await importedWeek({ training, athlete: other, number: 20, startDate: '2025-09-01' })

    expect((await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }))?.startDate).toBe('2025-08-25')
    expect((await training.getWeek({ userId: other, number: 20, today: AFTERWARDS }))?.startDate).toBe('2025-09-01')
  })
})

describe('importing the same Week number twice', () => {
  test('the Week is revised, not duplicated', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const revised = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[0].prescription.sets = 5
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(revised.ok).toBe(true)
    expect(week?.days).toHaveLength(7)
    expect(exerciseIn(week, { ordinal: 1, key: 'archer-push-ups' }).prescription).toEqual({
      kind: 'reps',
      sets: 5,
      reps: { min: 3, max: 3 },
    })
  })

  test('a Log on an Exercise the revision keeps survives it untouched', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: 'ROM held' },
    })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[0].prescription.sets = 5
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: 'ROM held',
    })
  })

  test('an Exercise the coach dropped is gone from the revised Week', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(week?.days[0]?.exercises.map((one) => one.key)).not.toContain('dips')
  })

  test('a Log whose Exercise the coach dropped is kept, as an orphan under its Day', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: 'did them anyway' },
    })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
      }),
      startDate: '2025-08-25',
    })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 1)

    expect(day.exercises.map((one) => one.key)).not.toContain('dips')
    expect(day.orphans.map((one) => [one.name, one.log])).toEqual([
      ['Dips', { kind: 'difficulty', difficulty: 'good', note: 'did them anyway' }],
    ])
  })

  test('an Exercise the coach dropped and never logged leaves no orphan behind', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
      }),
      startDate: '2025-08-25',
    })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 1).orphans).toEqual([])
  })

  test('an orphan rejoins the plan, Log and all, when the coach puts the Exercise back', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'skipped', note: 'shoulder' },
    })

    const without = coachJsonWith(20, (week) => {
      week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
    })

    await training.importWeek({ userId: athlete, today: AFTERWARDS, json: without, startDate: '2025-08-25' })
    await training.importWeek({ userId: athlete, today: AFTERWARDS, json: coachJson(20), startDate: '2025-08-25' })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 1)

    expect(day.orphans).toEqual([])
    expect(day.exercises.find((one) => one.key === 'dips')?.log).toEqual({ kind: 'skipped', note: 'shoulder' })
  })

  test('a Log on a Day the coach dropped whole is kept, as an orphan under that Day', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 7,
      exerciseKey: 'dead-hang',
      log: { kind: 'difficulty', difficulty: 'challenging', note: '40s' },
    })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days = week.days.filter((one: any) => one.ordinal !== 7)
      }),
      startDate: '2025-08-25',
    })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 7)

    expect(day.exercises).toEqual([])
    expect(day.orphans.map((one) => [one.name, one.log])).toEqual([
      ['Dead hang', { kind: 'difficulty', difficulty: 'challenging', note: '40s' }],
    ])
  })

  test('a Day the coach dropped whole, with nothing logged on it, goes', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days = week.days.filter((one: any) => one.ordinal !== 7)
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(week?.days.map((one) => one.ordinal)).toEqual([1, 2, 3, 4, 5, 6])
  })

  test('the athlete’s note on a Day the coach dropped whole outlives it', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked 5km' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days = week.days.filter((one: any) => one.ordinal !== 4)
      }),
      startDate: '2025-08-25',
    })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4).log).toBe('walked 5km')
  })

  test('work on a Day the coach dropped whole still goes to the coach on export', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 7,
      exerciseKey: 'scapular-pulls',
      log: { kind: 'note', note: 'shoulder felt fine' },
    })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days = week.days.filter((one: any) => one.ordinal !== 7)
      }),
      startDate: '2025-08-25',
    })

    const exported = await exportedWeek({ training, athlete, number: 20 })

    expect(exported.days.at(-1).ordinal).toBe(7)
    expect(exported.days.at(-1).orphans).toEqual([
      expect.objectContaining({ key: 'scapular-pulls', log: { kind: 'note', note: 'shoulder felt fine' } }),
    ])
  })

  test('the athlete’s own note on a Day outlives the coach’s revision of it', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked 5km' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[3].notes = 'Full rest. Sleep.'
      }),
      startDate: '2025-08-25',
    })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4)

    expect(day.log).toBe('walked 5km')
    expect(day.notes).toBe('Full rest. Sleep.')
  })

  test('a Day finishes against the revised plan, not the one that was logged', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await logEvery({ training, athlete, number: 9, ordinal: 7, except: [] })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(9, (week) => {
        week.days[2].exercises.push({
          key: 'calf-raises',
          movementId: 'calf-raise',
          name: 'Calf raises',
          prescription: { kind: 'reps', sets: 3, reps: { min: 15, max: 15 } },
          raw: 'Calf raises: 3×15.',
        })
      }),
      startDate: '2025-06-05',
    })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS }), 7).complete).toBe(false)
  })

  test('a revision the coach got wrong leaves the Logs standing along with the plan', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'skipped', note: 'shoulder' },
    })

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
        week.days[2].exercises[3].load.value = 'ten kilos'
      }),
      startDate: '2025-08-25',
    })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 1)

    expect(result.ok).toBe(false)
    expect(day.orphans).toEqual([])
    expect(day.exercises.find((one) => one.key === 'dips')?.log).toEqual({ kind: 'skipped', note: 'shoulder' })
  })

  test('a correction taken mid-week at the date it offers leaves today’s training where it was', async () => {
    const { training, athlete } = await openApp()
    const wednesday = '2025-06-25'

    await importedWeek({ training, athlete, number: 12, startDate: '2025-06-23' })
    await training.logExercise({
      userId: athlete,
      today: wednesday,
      weekNumber: 12,
      dayOrdinal: 1,
      exerciseKey: 'incline-push-ups',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    const offered = await training.previewWeek({ userId: athlete, json: coachJson(12), today: wednesday })

    await training.importWeek({
      userId: athlete,
      json: coachJson(12),
      startDate: offered.ok ? offered.startDate : 'never offered',
      today: wednesday,
    })

    const current = await training.getCurrentDay({ userId: athlete, today: wednesday })

    expect(current?.week.number).toBe(12)
    expect(current?.day?.ordinal).toBe(3)
    expect(dayIn(current?.week ?? null, 1).date).toBe('2025-06-23')
  })
})

describe('a Week the coach got wrong', () => {
  test('one bad Exercise rejects the whole Week, and nothing at all is written', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[2].exercises[3].load.value = 'ten kilos'
      }),
      startDate: '2025-08-25',
    })

    expect(result.ok).toBe(false)
    expect(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })).toBeNull()
  })

  test('the error names the Day, the Exercise and the field, so the coach can fix it', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[2].exercises[3].load.value = 'ten kilos'
      }),
      startDate: '2025-08-25',
    })

    expect(result.ok ? [] : result.errors).toEqual([
      { day: 3, exercise: 'kickstand-rdl', field: 'load.value', message: expect.any(String) },
    ])
  })

  test('two Exercises sharing a key on one Day is an error, not a silent overwrite', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[1].key = 'dips'
      }),
      startDate: '2025-08-25',
    })

    expect(result.ok ? [] : result.errors).toEqual([
      { day: 1, exercise: 'dips', field: 'key', message: expect.any(String) },
    ])
  })

  test('a fault outside any Day names the Week itself', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.number = 'twenty'
      }),
      startDate: '2025-08-25',
    })

    expect(result.ok ? [] : result.errors).toEqual([
      { day: null, exercise: null, field: 'number', message: expect.any(String) },
    ])
  })

  test('text that is not JSON at all is an error, not a crash', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: 'Day 1 (Mon) — Upper Push + Core',
      startDate: '2025-08-25',
    })

    expect(result.ok ? [] : result.errors).toEqual([
      { day: null, exercise: null, field: 'json', message: expect.any(String) },
    ])
  })

  test('a rejected import leaves an earlier Week of the same number standing', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[0].prescription.sets = 'four'
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'archer-push-ups' }).prescription).toEqual({
      kind: 'reps',
      sets: 4,
      reps: { min: 3, max: 3 },
    })
  })
})

describe('previewing the Week before it is saved', () => {
  test('a Week that has only been previewed is not on the shelf', async () => {
    const { training, athlete } = await openApp()

    await training.previewWeek({ userId: athlete, json: coachJson(20), today: AFTERWARDS })

    expect(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })).toBeNull()
  })

  test('the preview shows what parsed — the Days, their kind and their Focus', async () => {
    const { training, athlete } = await openApp()

    const result = await training.previewWeek({ userId: athlete, json: coachJson(9), today: AFTERWARDS })

    expect(result.ok ? result.preview.number : null).toBe(9)
    expect(result.ok ? result.preview.days.map((day) => [day.ordinal, day.kind, day.focus]) : []).toEqual([
      [5, 'training', 'Upper Pull + Core'],
      [6, 'rest', null],
      [7, 'training', 'Lower (strength)'],
    ])
  })

  test('the preview names the Exercises that parsed, with the coach’s own line', async () => {
    const { training, athlete } = await openApp()

    const result = await training.previewWeek({ userId: athlete, json: coachJson(9), today: AFTERWARDS })
    const firstDay = result.ok ? result.preview.days[0] : null

    expect(firstDay?.exercises[0]).toEqual({
      key: 'scapular-pulls',
      name: expect.any(String),
      raw: expect.any(String),
    })
  })

  test('a Week the coach got wrong previews as the errors, not as a Week', async () => {
    const { training, athlete } = await openApp()

    const result = await training.previewWeek({
      userId: athlete,
      today: AFTERWARDS,
      json: coachJsonWith(20, (week) => {
        week.days[2].exercises[3].load.value = 'ten kilos'
      }),
    })

    expect(result.ok ? [] : result.errors).toEqual([
      { day: 3, exercise: 'kickstand-rdl', field: 'load.value', message: expect.any(String) },
    ])
  })

  test('a Week number already on the shelf previews as the revision it is', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 12, startDate: '2025-06-26' })
    await training.logExercise({
      userId: athlete,
      weekNumber: 12,
      dayOrdinal: 1,
      exerciseKey: 'incline-push-ups',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
      today: AFTERWARDS,
    })
    await training.logDay({
      userId: athlete,
      weekNumber: 12,
      dayOrdinal: 2,
      note: 'ran it in the rain',
      today: AFTERWARDS,
    })

    const result = await training.previewWeek({ userId: athlete, json: coachJson(12), today: AFTERWARDS })

    expect(result.ok ? result.revising : null).toEqual({ startDate: '2025-06-26', logged: 2 })
  })

  test('a Week the athlete has never imported is not a revision of anything', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 12, startDate: '2025-06-26' })

    const result = await training.previewWeek({ userId: athlete, json: coachJson(20), today: AFTERWARDS })

    expect(result.ok ? result.revising : 'not previewed').toBeNull()
  })
})

describe('the date a pasted Week would start on', () => {
  test('it is the day after the last Week on the shelf ended', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const result = await training.previewWeek({ userId: athlete, json: coachJson(12), today: AFTERWARDS })

    expect(result.ok ? result.startDate : null).toBe('2025-09-01')
  })

  test('a revision of a Week already on the shelf starts where that Week already starts', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 12, startDate: '2025-06-26' })

    const result = await training.previewWeek({ userId: athlete, json: coachJson(12), today: AFTERWARDS })

    expect(result.ok ? result.startDate : null).toBe('2025-06-26')
  })

  test('with nothing on the shelf it is the next Monday, because the coach wrote no weekday', async () => {
    const { training, athlete } = await openApp()

    const result = await training.previewWeek({ userId: athlete, json: coachJson(12), today: '2025-09-30' })

    expect(result.ok ? result.startDate : null).toBe('2025-10-06')
  })

  test('on a Monday with nothing on the shelf, that Monday is today', async () => {
    const { training, athlete } = await openApp()

    const result = await training.previewWeek({ userId: athlete, json: coachJson(12), today: '2025-10-06' })

    expect(result.ok ? result.startDate : null).toBe('2025-10-06')
  })
})

describe('the start date the user picks at import', () => {
  test('a Week that starts on a Thursday puts its Day 1 on that Thursday', async () => {
    const { training, athlete } = await openApp()

    await training.importWeek({ userId: athlete, json: coachJson(12), startDate: '2025-06-26', today: AFTERWARDS })

    const week = await training.getWeek({ userId: athlete, number: 12, today: AFTERWARDS })

    expect(week?.days.map((day) => [day.ordinal, day.date, day.weekday])).toEqual([
      [1, '2025-06-26', 'thursday'],
      [2, '2025-06-27', 'friday'],
      [3, '2025-06-28', 'saturday'],
      [4, '2025-06-29', 'sunday'],
      [5, '2025-06-30', 'monday'],
      [6, '2025-07-01', 'tuesday'],
      [7, '2025-07-02', 'wednesday'],
    ])
  })

  test('a Week with only three Days dates each one from its own ordinal', async () => {
    const { training, athlete } = await openApp()

    await training.importWeek({ userId: athlete, json: coachJson(9), startDate: '2025-06-05', today: AFTERWARDS })

    const week = await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS })

    expect(week?.days.map((day) => [day.ordinal, day.date, day.weekday])).toEqual([
      [5, '2025-06-09', 'monday'],
      [6, '2025-06-10', 'tuesday'],
      [7, '2025-06-11', 'wednesday'],
    ])
  })
})

describe('opening the app on a training day', () => {
  test('today’s Day of the current Week is what the app opens on', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const current = await training.getCurrentDay({ userId: athlete, today: '2025-08-27' })

    expect(current?.week.number).toBe(20)
    expect(current?.day?.ordinal).toBe(3)
    expect(current?.day?.focus).toBe('Lower Body')
  })

  test('the Week being trained is the one today falls inside, not the one before it', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const current = await training.getCurrentDay({ userId: athlete, today: '2025-08-31' })

    expect(current?.week.number).toBe(20)
    expect(current?.day?.ordinal).toBe(7)
  })

  test('a Week that has run out is no longer opened on', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(await training.getCurrentDay({ userId: athlete, today: '2025-09-01' })).toBeNull()
  })

  test('a Week the coach cut short still opens, with nothing asked of the missing Day', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })

    const current = await training.getCurrentDay({ userId: athlete, today: '2025-06-06' })

    expect(current?.week.number).toBe(9)
    expect(current?.day).toBeNull()
  })

  test('an athlete with no Weeks has nothing to open on', async () => {
    const { training, athlete } = await openApp()

    expect(await training.getCurrentDay({ userId: athlete, today: '2025-08-27' })).toBeNull()
  })

  test('another athlete’s Week is never what the app opens on', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(await training.getCurrentDay({ userId: other, today: '2025-08-27' })).toBeNull()
  })
})

describe('logging what happened', () => {
  test('one tap on a rating is the whole Log, and the Day reads it back', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'good',
      note: null,
    })
  })

  test('a mistap is corrected by logging again, which replaces rather than adds', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'easy', note: null },
    })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: null,
    })
  })

  test('a skip is recorded as a skip, which an unlogged Exercise is not', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'skipped', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({ kind: 'skipped', note: null })
    expect(exerciseIn(week, { ordinal: 1, key: 'pike-push-ups' }).log).toBeNull()
  })

  test('a note rides along with a rating', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: 'challenging, but did 4x8' },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: 'challenging, but did 4x8',
    })
  })

  test('a note stands on its own when no rating fits', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'note', note: 'back hurt' },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({ kind: 'note', note: 'back hurt' })
  })

  test('a note written by mistake is taken back, leaving the Exercise unlogged', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'note', note: 'bakc hrut' },
    })

    const day = await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: null,
    })

    expect(day?.exercises.find((one) => one.key === 'dips')?.log).toBe(null)
  })

  test('the Day a taken-back Log finished stands open again — unlogged is not answered', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await logEvery({ training, athlete, number: 20, ordinal: 1, except: ['dips'] })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'note', note: 'walked instead' },
    })

    const finished = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(dayIn(finished, 1).complete).toBe(true)

    const day = await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: null,
    })

    expect(day?.complete).toBe(false)
  })

  test('a Log taken back is not handed to the coach', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'note', note: 'meant for another Exercise' },
    })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: null,
    })

    const exported = await exportedWeek({ training, athlete, number: 20 })

    expect(exported.days[0].exercises.find((one: any) => one.key === 'dips').log).toBe(null)
  })

  test('the left and right arm keep their own Logs, as they keep their own loads', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 3,
      exerciseKey: 'box-pistols-left',
      log: { kind: 'difficulty', difficulty: 'challenging', note: null },
    })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 3,
      exerciseKey: 'box-pistols-right',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(exerciseIn(week, { ordinal: 3, key: 'box-pistols-left' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: null,
    })
    expect(exerciseIn(week, { ordinal: 3, key: 'box-pistols-right' }).log).toEqual({
      kind: 'difficulty',
      difficulty: 'good',
      note: null,
    })
  })

  test('a Day other than today is logged the same way, for the session trained without a phone', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const day = await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 3,
      exerciseKey: 'box-pistols-left',
      log: { kind: 'skipped', note: 'no weights' },
    })

    expect(day?.ordinal).toBe(3)
    expect(day?.exercises.find((one) => one.key === 'box-pistols-left')?.log).toEqual({
      kind: 'skipped',
      note: 'no weights',
    })
  })

  test('an athlete cannot log against another athlete’s Exercise', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const day = await training.logExercise({
      userId: other,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    expect(day).toBeNull()
    expect(
      exerciseIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), {
        ordinal: 1,
        key: 'dips',
      }).log,
    ).toBeNull()
  })
})

describe('what happened on the Day as a whole', () => {
  test('a note belongs to the Day, not to any Exercise on it', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 3,
      note: 'Swapped with day 4',
    })

    const week = await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS })

    expect(dayIn(week, 3).log).toBe('Swapped with day 4')
    expect(dayIn(week, 1).log).toBeNull()
  })

  test('a rest Day takes a note too, so "walked" needs no invented Exercise', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked' })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4).log).toBe('walked')
  })

  test('rewriting the note replaces it, and emptying it takes it away', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked 5km' })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4).log).toBe('walked 5km')

    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: '' })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4).log).toBeNull()
  })

  test('an athlete cannot note another athlete\u2019s Day', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(
      await training.logDay({ userId: other, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked' }),
    ).toBeNull()
    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 4).log).toBeNull()
  })
})

describe('a Day finishing on its own', () => {
  test('a training Day is unfinished while an Exercise it asks for is unlogged', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await logEvery({ training, athlete, number: 9, ordinal: 7, except: ['pistol-squats'] })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS }), 7).complete).toBe(false)
  })

  test('the last Exercise logged is what finishes the Day — there is nothing to press', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await logEvery({ training, athlete, number: 9, ordinal: 7, except: [] })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS }), 7).complete).toBe(true)
  })

  test('an Optional Exercise left undone does not hold the Day open', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await logEvery({ training, athlete, number: 9, ordinal: 7, except: ['lateral-lunges'] })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS }), 7)

    expect(day.exercises.find((one) => one.key === 'lateral-lunges')?.log).toBeNull()
    expect(day.complete).toBe(true)
  })

  test('an Optional Exercise logged on its own does not finish the Day either', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 9,
      dayOrdinal: 7,
      exerciseKey: 'lateral-lunges',
      log: { kind: 'difficulty', difficulty: 'easy', note: null },
    })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 9, today: AFTERWARDS }), 7).complete).toBe(false)
  })

  test('an active recovery Day of nothing but Optional Exercises is finished untouched', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const day = dayIn(await training.getWeek({ userId: athlete, number: 20, today: AFTERWARDS }), 7)

    expect(day.exercises.every((one) => one.optional)).toBe(true)
    expect(day.complete).toBe(true)
  })

  test('a rest Day finishes when its date has passed, having asked for nothing', async () => {
    const { training, athlete } = await openApp()

    // Week 20 starts on the Monday, so its Day 4 of full rest is the Thursday.
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: '2025-08-28' }), 4).complete).toBe(false)
    expect(dayIn(await training.getWeek({ userId: athlete, number: 20, today: '2025-08-29' }), 4).complete).toBe(true)
  })
})

describe('handing the Week back to the coach', () => {
  test('the Week exports as JSON, the plan as the coach wrote it', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const exported = await exportedWeek({ training, athlete, number: 20 })

    expect(exported.number).toBe(20)
    expect(exported.startDate).toBe('2025-08-25')
    expect(exported.days.map((day: any) => day.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(exported.days[0].exercises[3]).toMatchObject({
      key: 'dips',
      movementId: 'dip',
      name: 'Dips',
      variant: 'ROM ~120°',
      prescription: { kind: 'reps', sets: 3, reps: { min: 6, max: 6 } },
      raw: 'Dips, ROM ~120°: 3×6, slow — deepened, 2 clean partial weeks banked. Reps hold.',
    })
  })

  test('what the athlete recorded rides back with the Exercise it happened on', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: 'ROM held' },
    })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'pike-push-ups',
      log: { kind: 'skipped', note: null },
    })

    const exercises = (await exportedWeek({ training, athlete, number: 20 })).days[0].exercises
    const logOf = (key: string) => exercises.find((one: any) => one.key === key).log

    expect(logOf('dips')).toEqual({ kind: 'difficulty', difficulty: 'challenging', note: 'ROM held' })
    expect(logOf('pike-push-ups')).toEqual({ kind: 'skipped', note: null })
    // Unlogged is its own answer: the coach reads it as work that did not happen.
    expect(logOf('hollow-body')).toBeNull()
  })

  test('the Day\u2019s own note goes too, on a rest Day as much as a training one', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logDay({ userId: athlete, today: AFTERWARDS, weekNumber: 20, dayOrdinal: 4, note: 'walked 5km' })

    const rest = (await exportedWeek({ training, athlete, number: 20 })).days[3]

    expect(rest.kind).toBe('rest')
    expect(rest.log).toBe('walked 5km')
    // The coach's own words about the Day come back beside the athlete's.
    expect(rest.notes).toBe('Walk optional.')
  })

  test('work against an Exercise the coach dropped is exported, named as an orphan', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      today: AFTERWARDS,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: 'did them anyway' },
    })

    await training.importWeek({
      userId: athlete,
      today: AFTERWARDS,
      startDate: '2025-08-25',
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
      }),
    })

    const exported = await exportedWeek({ training, athlete, number: 20 })

    expect(exported.days[0].exercises.map((one: any) => one.key)).not.toContain('dips')
    expect(exported.days[0].orphans).toEqual([
      expect.objectContaining({
        key: 'dips',
        name: 'Dips',
        log: { kind: 'difficulty', difficulty: 'good', note: 'did them anyway' },
      }),
    ])
    // A Day nothing was dropped from says so by having no orphans at all.
    expect(exported.days[1].orphans).toBeUndefined()
  })

  test('any Week exports, not only the one being trained', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect((await exportedWeek({ training, athlete, number: 9 })).days.map((day: any) => day.ordinal)).toEqual([
      5, 6, 7,
    ])
  })

  test('an athlete cannot export a Week that is not theirs', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(await training.exportWeek({ userId: other, number: 20 })).toBeNull()
  })
})

describe('the shelf', () => {
  test('every imported Week is on the shelf, the most recent first', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const shelf = await training.listWeeks({ userId: athlete, today: '2025-08-27' })

    expect(shelf.map((one) => one.number)).toEqual([20, 15, 9])
  })

  test('the Week today falls inside is the one marked, and it is the only one', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const shelf = await training.listWeeks({ userId: athlete, today: '2025-08-27' })

    expect(shelf.map((one) => ({ number: one.number, current: one.current }))).toEqual([
      { number: 20, current: true },
      { number: 15, current: false },
    ])
  })

  test('between Weeks the shelf still holds them all, with none of them current', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const shelf = await training.listWeeks({ userId: athlete, today: '2025-09-03' })

    expect(shelf.map((one) => one.number)).toEqual([20])
    expect(shelf.every((one) => one.current)).toBe(false)
  })

  test('a Week on the shelf spans from its start date to its last Day', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })

    expect(await training.listWeeks({ userId: athlete, today: AFTERWARDS })).toEqual([
      { number: 9, startDate: '2025-06-05', endDate: '2025-06-11', current: false },
    ])
  })

  test('another athlete\u2019s Weeks are on their shelf, never on this one', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    expect(await training.listWeeks({ userId: other, today: '2025-08-27' })).toEqual([])
  })
})

describe('the contract the coach writes to', () => {
  test('the schema exports as JSON, naming what a Week must carry', async () => {
    const { training } = await openApp()

    const schema = JSON.parse(await training.exportSchema())

    expect(schema.required).toEqual(['number', 'days'])
    expect(Object.keys(schema.properties)).toEqual(['number', 'notes', 'days'])
  })

  test('the schema says what an Exercise cannot be written without', async () => {
    const { training } = await openApp()

    const schema = JSON.parse(await training.exportSchema())
    const exercise = schema.properties.days.items.properties.exercises.items

    expect(exercise.required).toEqual(['key', 'movementId', 'name', 'prescription', 'raw'])
  })

  test('the Prescription is in the schema under its own name, so a round can hold one', async () => {
    const { training } = await openApp()

    const schema = JSON.parse(await training.exportSchema())
    const prescription = schema.$defs.Prescription
    const rounds = prescription.oneOf.find((one: any) => one.properties.kind.const === 'rounds')

    expect(prescription.oneOf.map((one: any) => one.properties.kind.const)).toEqual([
      'reps',
      'time',
      'distance',
      'rounds',
    ])
    expect(rounds.properties.work.$ref).toBe('#/$defs/Prescription')
  })
})

describe('the Movement list the coach reuses', () => {
  test('the ids the imports registered export as JSON', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 9, startDate: '2025-06-05' })

    const { movementIds } = JSON.parse(await training.exportRegistry())

    expect(movementIds).toContain('pull-up')
    expect(movementIds).toContain('scapular-pull')
  })

  test('a Movement trained in several Weeks is listed once', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 15, startDate: '2025-07-31' })
    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const { movementIds } = JSON.parse(await training.exportRegistry())

    expect(movementIds.filter((id: string) => id === 'dip')).toEqual(['dip'])
  })

  test('the registry is global: what another athlete registered is there to reuse', async () => {
    const { training, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete: other, number: 20, startDate: '2025-08-25' })

    expect(JSON.parse(await training.exportRegistry()).movementIds).toContain('dip')
  })

  test('before any import the list is empty rather than missing', async () => {
    const { training } = await openApp()

    expect(JSON.parse(await training.exportRegistry())).toEqual({ movementIds: [] })
  })
})
