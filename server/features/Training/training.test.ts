import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { createTestDatabase } from '../../infrastructure/Database/testDatabase.ts'
import { user } from '../../infrastructure/Database/schemas/auth.ts'
import { createTraining } from './createTraining.ts'
import type { Database } from '../../infrastructure/Database/types.ts'
import type { Exercise, Week } from './types.ts'

/* oxlint-disable typescript/no-explicit-any -- the coach is an LLM: a broken Week can hold anything anywhere. */

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
  const result = await training.importWeek({ userId: athlete, json: coachJson(number), startDate })

  if (!result.ok) {
    throw new Error(`week ${number} did not import: ${JSON.stringify(result.errors)}`)
  }

  return result.week
}

function exerciseIn(week: Week | null, { ordinal, key }: { ordinal: number; key: string }): Exercise {
  const found = week?.days.find((day) => day.ordinal === ordinal)?.exercises.find((exercise) => exercise.key === key)

  if (found === undefined) {
    throw new Error(`no exercise ${key} on day ${ordinal}`)
  }

  return found
}

describe('importing a Week', () => {
  test('a pasted Week is readable back, Day by Day', async () => {
    const { training, athlete } = await openApp()

    await training.importWeek({ userId: athlete, json: coachJson(9), startDate: '2025-06-05' })

    const week = await training.getWeek({ userId: athlete, number: 9 })

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

    expect(await training.getWeek({ userId: other, number: 20 })).toBeNull()
  })

  test('two athletes can each hold their own Week 20', async () => {
    const { training, athlete, database } = await openApp()
    const other = await signUp({ database, email: 'other@example.com' })

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await importedWeek({ training, athlete: other, number: 20, startDate: '2025-09-01' })

    expect((await training.getWeek({ userId: athlete, number: 20 }))?.startDate).toBe('2025-08-25')
    expect((await training.getWeek({ userId: other, number: 20 }))?.startDate).toBe('2025-09-01')
  })
})

describe('importing the same Week number twice', () => {
  test('the Week is revised, not duplicated', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    const revised = await training.importWeek({
      userId: athlete,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[0].prescription.sets = 5
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

    expect(revised.ok).toBe(true)
    expect(week?.days).toHaveLength(7)
    expect(exerciseIn(week, { ordinal: 1, key: 'archer-push-ups' }).prescription).toEqual({
      kind: 'reps',
      sets: 5,
      reps: { min: 3, max: 3 },
    })
  })

  test('an Exercise the coach dropped is gone from the revised Week', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })

    await training.importWeek({
      userId: athlete,
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises = week.days[0].exercises.filter((one: any) => one.key !== 'dips')
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

    expect(week?.days[0]?.exercises.map((one) => one.key)).not.toContain('dips')
  })
})

describe('a Week the coach got wrong', () => {
  test('one bad Exercise rejects the whole Week, and nothing at all is written', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
      json: coachJsonWith(20, (week) => {
        week.days[2].exercises[3].load.value = 'ten kilos'
      }),
      startDate: '2025-08-25',
    })

    expect(result.ok).toBe(false)
    expect(await training.getWeek({ userId: athlete, number: 20 })).toBeNull()
  })

  test('the error names the Day, the Exercise and the field, so the coach can fix it', async () => {
    const { training, athlete } = await openApp()

    const result = await training.importWeek({
      userId: athlete,
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
      json: coachJsonWith(20, (week) => {
        week.days[0].exercises[0].prescription.sets = 'four'
      }),
      startDate: '2025-08-25',
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

    expect(exerciseIn(week, { ordinal: 1, key: 'archer-push-ups' }).prescription).toEqual({
      kind: 'reps',
      sets: 4,
      reps: { min: 3, max: 3 },
    })
  })
})

describe('the start date the user picks at import', () => {
  test('a Week that starts on a Thursday puts its Day 1 on that Thursday', async () => {
    const { training, athlete } = await openApp()

    await training.importWeek({ userId: athlete, json: coachJson(12), startDate: '2025-06-26' })

    const week = await training.getWeek({ userId: athlete, number: 12 })

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

    await training.importWeek({ userId: athlete, json: coachJson(9), startDate: '2025-06-05' })

    const week = await training.getWeek({ userId: athlete, number: 9 })

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
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

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
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'easy', note: null },
    })
    await training.logExercise({
      userId: athlete,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

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
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'skipped', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({ kind: 'skipped', note: null })
    expect(exerciseIn(week, { ordinal: 1, key: 'pike-push-ups' }).log).toBeNull()
  })

  test('a note rides along with a rating', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'challenging', note: 'challenging, but did 4x8' },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

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
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'note', note: 'back hurt' },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

    expect(exerciseIn(week, { ordinal: 1, key: 'dips' }).log).toEqual({ kind: 'note', note: 'back hurt' })
  })

  test('the left and right arm keep their own Logs, as they keep their own loads', async () => {
    const { training, athlete } = await openApp()

    await importedWeek({ training, athlete, number: 20, startDate: '2025-08-25' })
    await training.logExercise({
      userId: athlete,
      weekNumber: 20,
      dayOrdinal: 3,
      exerciseKey: 'box-pistols-left',
      log: { kind: 'difficulty', difficulty: 'challenging', note: null },
    })
    await training.logExercise({
      userId: athlete,
      weekNumber: 20,
      dayOrdinal: 3,
      exerciseKey: 'box-pistols-right',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    const week = await training.getWeek({ userId: athlete, number: 20 })

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
      weekNumber: 20,
      dayOrdinal: 1,
      exerciseKey: 'dips',
      log: { kind: 'difficulty', difficulty: 'good', note: null },
    })

    expect(day).toBeNull()
    expect(
      exerciseIn(await training.getWeek({ userId: athlete, number: 20 }), { ordinal: 1, key: 'dips' }).log,
    ).toBeNull()
  })
})
