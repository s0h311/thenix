import { and, asc, eq, inArray } from 'drizzle-orm'
import { day, exercise, movement, week } from '../../infrastructure/Database/schemas/public.ts'
import { dateOfDay } from './dayDate.ts'
import { parseWeek } from './parseWeek.ts'
import type { Database } from '../../infrastructure/Database/types.ts'
import type { Day, Exercise, ImportResult, Week } from './types.ts'
import type { ImportedWeek } from './weekSchema.ts'

type Dependencies = {
  database: Database
}

/**
 * The Training feature. Everything the coach's JSON turns into — the schema, the
 * Movement registry, the rows — is internal; callers see Weeks and Days.
 */
export function createTraining({ database }: Dependencies) {
  async function readWeek({ userId, number }: { userId: string; number: number }): Promise<Week | null> {
    const [weekRow] = await database
      .select()
      .from(week)
      .where(and(eq(week.userId, userId), eq(week.number, number)))

    if (weekRow === undefined) {
      return null
    }

    const dayRows = await database.select().from(day).where(eq(day.weekId, weekRow.id)).orderBy(asc(day.ordinal))

    const exerciseRows =
      dayRows.length === 0
        ? []
        : await database
            .select()
            .from(exercise)
            .where(
              inArray(
                exercise.dayId,
                dayRows.map((row) => row.id),
              ),
            )
            .orderBy(asc(exercise.position))

    return {
      number: weekRow.number,
      startDate: weekRow.startDate,
      notes: weekRow.notes,
      days: dayRows.map((dayRow) => ({
        ordinal: dayRow.ordinal,
        ...dateOfDay({ startDate: weekRow.startDate, ordinal: dayRow.ordinal }),
        kind: dayRow.kind as Day['kind'],
        focus: dayRow.focus,
        notes: dayRow.notes,
        exercises: exerciseRows.filter((row) => row.dayId === dayRow.id).map(toExercise),
      })),
    }
  }

  async function writeWeek({
    userId,
    startDate,
    imported,
  }: {
    userId: string
    startDate: string
    imported: ImportedWeek
  }): Promise<void> {
    await database.transaction(async (transaction) => {
      const movementIds = [
        ...new Set(imported.days.flatMap((importedDay) => importedDay.exercises.map((one) => one.movementId))),
      ]

      if (movementIds.length > 0) {
        await transaction
          .insert(movement)
          .values(movementIds.map((id) => ({ id })))
          .onConflictDoNothing()
      }

      const [weekRow] = await transaction
        .insert(week)
        .values({ userId, number: imported.number, startDate, notes: imported.notes ?? null })
        .onConflictDoUpdate({
          target: [week.userId, week.number],
          set: { startDate, notes: imported.notes ?? null },
        })
        .returning({ id: week.id })

      if (weekRow === undefined) {
        throw new Error('the Week was not written')
      }

      await transaction.delete(day).where(eq(day.weekId, weekRow.id))

      for (const importedDay of imported.days) {
        const [dayRow] = await transaction
          .insert(day)
          .values({
            weekId: weekRow.id,
            ordinal: importedDay.ordinal,
            kind: importedDay.kind,
            focus: importedDay.focus ?? null,
            notes: importedDay.notes ?? null,
          })
          .returning({ id: day.id })

        if (dayRow === undefined) {
          throw new Error('the Day was not written')
        }

        if (importedDay.exercises.length === 0) {
          continue
        }

        await transaction.insert(exercise).values(
          importedDay.exercises.map((one, position) => ({
            dayId: dayRow.id,
            position,
            key: one.key,
            movementId: one.movementId,
            name: one.name,
            variant: one.variant ?? null,
            side: one.side,
            optional: one.optional,
            toFailure: one.toFailure,
            prescription: one.prescription,
            load: one.load ?? null,
            tempo: one.tempo ?? null,
            restSeconds: one.restSeconds ?? null,
            cue: one.cue ?? null,
            raw: one.raw,
          })),
        )
      }
    })
  }

  return {
    /** Takes the coach's JSON as pasted. Nothing is written unless all of it validates. */
    async importWeek({
      userId,
      json,
      startDate,
    }: {
      userId: string
      json: string
      startDate: string
    }): Promise<ImportResult> {
      const parsed = parseWeek(json)

      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors }
      }

      await writeWeek({ userId, startDate, imported: parsed.week })

      const written = await readWeek({ userId, number: parsed.week.number })

      if (written === null) {
        throw new Error('the imported Week could not be read back')
      }

      return { ok: true, week: written }
    },

    getWeek: readWeek,
  }
}

function toExercise(row: typeof exercise.$inferSelect): Exercise {
  return {
    key: row.key,
    movementId: row.movementId,
    name: row.name,
    variant: row.variant,
    side: row.side as Exercise['side'],
    optional: row.optional,
    toFailure: row.toFailure,
    prescription: row.prescription as Exercise['prescription'],
    load: row.load as Exercise['load'],
    tempo: row.tempo,
    restSeconds: row.restSeconds as Exercise['restSeconds'],
    cue: row.cue,
    raw: row.raw,
  }
}
