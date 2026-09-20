import { and, asc, eq, inArray, max, notExists, notInArray } from 'drizzle-orm'
import { day, dayLog, exercise, log, movement, week } from '../../infrastructure/Database/schemas/public.ts'
import { dateOfDay, startAfter } from './dayDate.ts'
import { forCoach } from './forCoach.ts'
import { parseWeek } from './parseWeek.ts'
import { schemaForCoach } from './weekSchema.ts'
import type { Database } from '../../infrastructure/Database/types.ts'
import type { PlannedWeek } from './forCoach.ts'
import type {
  CurrentDay,
  Day,
  Difficulty,
  Exercise,
  ImportResult,
  Log,
  Orphan,
  PreviewResult,
  Week,
  WeekOnShelf,
  WeekPreview,
} from './types.ts'
import type { ImportedWeek } from './weekSchema.ts'

type Dependencies = {
  database: Database
}

/** A Week reduced to when it ran — what both the shelf and "which Week is now" need. */
type Span = Omit<WeekOnShelf, 'current'>

type ExerciseRow = { exercise: typeof exercise.$inferSelect; log: typeof log.$inferSelect | null }

/**
 * The Training feature. Everything the coach's JSON turns into — the schema, the
 * Movement registry, the rows — is internal; callers see Weeks and Days.
 */
export function createTraining({ database }: Dependencies) {
  /** The Week as it stands: the plan, and every Log written against it. */
  async function loadWeek({ userId, number }: { userId: string; number: number }): Promise<PlannedWeek | null> {
    const [weekRow] = await database
      .select()
      .from(week)
      .where(and(eq(week.userId, userId), eq(week.number, number)))

    if (weekRow === undefined) {
      return null
    }

    const dayRows = await database
      .select({ day, log: dayLog })
      .from(day)
      .leftJoin(dayLog, eq(dayLog.dayId, day.id))
      .where(eq(day.weekId, weekRow.id))
      .orderBy(asc(day.ordinal))

    // The Log rides along with the Exercise it belongs to: the screen that asks for
    // a Day always wants to know what already happened on it.
    const exerciseRows =
      dayRows.length === 0
        ? []
        : await database
            .select({ exercise, log })
            .from(exercise)
            .leftJoin(log, eq(log.exerciseId, exercise.id))
            .where(
              inArray(
                exercise.dayId,
                dayRows.map((row) => row.day.id),
              ),
            )
            .orderBy(asc(exercise.position))

    return {
      number: weekRow.number,
      startDate: weekRow.startDate,
      notes: weekRow.notes,
      days: dayRows.map(({ day: dayRow, log: dayLogRow }) => {
        const kind = dayRow.kind as Day['kind']
        const dated = dateOfDay({ startDate: weekRow.startDate, ordinal: dayRow.ordinal })
        const onDay = exerciseRows.filter((row) => row.exercise.dayId === dayRow.id)
        const exercises = onDay.filter((row) => !row.exercise.dropped).map(toExercise)
        // A dropped Exercise is only still here because it carries a Log — that Log,
        // under the Day it was written on, is the orphan.
        const orphans = onDay.flatMap<Orphan>((row) =>
          row.exercise.dropped && row.log !== null ? [{ ...toExercise(row), log: toLog(row.log) }] : [],
        )

        return {
          ordinal: dayRow.ordinal,
          ...dated,
          kind,
          focus: dayRow.focus,
          notes: dayRow.notes,
          log: dayLogRow?.note ?? null,
          exercises,
          orphans,
        }
      }),
    }
  }

  /**
   * The same Week, read on a given day: completion is the one thing a Week cannot be
   * read without a clock, because a rest Day finishes by the calendar and nothing else.
   */
  async function readWeek({
    userId,
    number,
    today,
  }: {
    userId: string
    number: number
    today: string
  }): Promise<Week | null> {
    const planned = await loadWeek({ userId, number })

    if (planned === null) {
      return null
    }

    return {
      ...planned,
      days: planned.days.map((day) => ({ ...day, complete: isComplete({ ...day, today }) })),
    }
  }

  /**
   * Every Week the athlete has, with the dates it runs between and nothing else —
   * no plan, no Logs. Most recent first, which is the end the shelf is read from.
   */
  async function weekSpans({ userId }: { userId: string }): Promise<Span[]> {
    const rows = await database
      .select({ number: week.number, startDate: week.startDate, lastOrdinal: max(day.ordinal) })
      .from(week)
      .leftJoin(day, eq(day.weekId, week.id))
      .where(eq(week.userId, userId))
      .groupBy(week.id)

    return rows
      .map((row) => ({
        number: row.number,
        startDate: row.startDate,
        // A Week runs from its start date to its last Day, so a Week the coach cut
        // short ends early rather than always filling seven days.
        endDate:
          row.lastOrdinal === null ? null : dateOfDay({ startDate: row.startDate, ordinal: row.lastOrdinal }).date,
      }))
      .toSorted((one, other) => other.startDate.localeCompare(one.startDate))
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

      // A revision is matched onto what is already there rather than replacing it:
      // Days by ordinal and Exercises by key, which is what lets a Log outlive the
      // plan it was written against.
      const ordinals = imported.days.map((one) => one.ordinal)
      const outOfWeek =
        ordinals.length === 0
          ? eq(day.weekId, weekRow.id)
          : and(eq(day.weekId, weekRow.id), notInArray(day.ordinal, ordinals))

      // A whole Day the revision no longer asks for is treated as its Exercises are:
      // it goes, unless something was recorded on it. A Day that was trained outlives
      // the plan that asked for it, carrying its Logs as orphans.
      const withdrawn = (await transaction.select({ id: day.id }).from(day).where(outOfWeek)).map((row) => row.id)

      if (withdrawn.length > 0) {
        await transaction
          .delete(exercise)
          .where(
            and(
              inArray(exercise.dayId, withdrawn),
              notExists(transaction.select().from(log).where(eq(log.exerciseId, exercise.id))),
            ),
          )

        await transaction.update(exercise).set({ dropped: true }).where(inArray(exercise.dayId, withdrawn))

        // Nothing logged and nothing left to log: the Day was never trained, so the
        // revision takes it away entirely.
        await transaction
          .delete(day)
          .where(
            and(
              inArray(day.id, withdrawn),
              notExists(transaction.select().from(exercise).where(eq(exercise.dayId, day.id))),
              notExists(transaction.select().from(dayLog).where(eq(dayLog.dayId, day.id))),
            ),
          )
      }

      for (const importedDay of imported.days) {
        const revisedDay = {
          kind: importedDay.kind,
          focus: importedDay.focus ?? null,
          // The coach's words about the Day. The athlete's own note lives in `day_log`
          // and is deliberately not touched here.
          notes: importedDay.notes ?? null,
        }

        const [dayRow] = await transaction
          .insert(day)
          .values({ weekId: weekRow.id, ordinal: importedDay.ordinal, ...revisedDay })
          .onConflictDoUpdate({ target: [day.weekId, day.ordinal], set: revisedDay })
          .returning({ id: day.id })

        if (dayRow === undefined) {
          throw new Error('the Day was not written')
        }

        const keys = importedDay.exercises.map((one) => one.key)
        const outOfPlan =
          keys.length === 0
            ? eq(exercise.dayId, dayRow.id)
            : and(eq(exercise.dayId, dayRow.id), notInArray(exercise.key, keys))

        // An Exercise the revision no longer asks for goes, unless the athlete already
        // did it: that one is kept out of the plan, carrying its Log as an orphan.
        await transaction
          .delete(exercise)
          .where(and(outOfPlan, notExists(transaction.select().from(log).where(eq(log.exerciseId, exercise.id)))))

        await transaction.update(exercise).set({ dropped: true }).where(outOfPlan)

        for (const [position, one] of importedDay.exercises.entries()) {
          const revisedExercise = {
            position,
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
            // The coach putting a dropped Exercise back rejoins it to the plan, Log
            // and all: an orphan is a state of the plan, not a state of the Log.
            dropped: false,
          }

          await transaction
            .insert(exercise)
            .values({ dayId: dayRow.id, key: one.key, ...revisedExercise })
            .onConflictDoUpdate({ target: [exercise.dayId, exercise.key], set: revisedExercise })
        }
      }
    })
  }

  return {
    /** Takes the coach's JSON as pasted. Nothing is written unless all of it validates. */
    async importWeek({
      userId,
      json,
      startDate,
      today,
    }: {
      userId: string
      json: string
      startDate: string
      today: string
    }): Promise<ImportResult> {
      const parsed = parseWeek(json)

      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors }
      }

      await writeWeek({ userId, startDate, imported: parsed.week })

      const written = await readWeek({ userId, number: parsed.week.number, today })

      if (written === null) {
        throw new Error('the imported Week could not be read back')
      }

      return { ok: true, week: written }
    },

    /**
     * The paste read back as a Week, with nothing written. Confirming is a second
     * step on purpose: an import that parsed differently from what the athlete
     * expected is caught before the shelf changes rather than after.
     */
    async previewWeek({
      userId,
      json,
      today,
    }: {
      userId: string
      json: string
      today: string
    }): Promise<PreviewResult> {
      const parsed = parseWeek(json)

      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors }
      }

      const ends = (await weekSpans({ userId })).flatMap((span) => (span.endDate === null ? [] : [span.endDate]))

      return {
        ok: true,
        preview: asPreview(parsed.week),
        startDate: startAfter({ previousEnd: ends.toSorted().at(-1) ?? null, today }),
      }
    },

    getWeek: readWeek,

    /**
     * The Week handed back to the coach, as the JSON text it is pasted as. Null when
     * the athlete has no such Week, which is the only way this can fail.
     */
    async exportWeek({ userId, number }: { userId: string; number: number }): Promise<string | null> {
      const planned = await loadWeek({ userId, number })

      return planned === null ? null : JSON.stringify(forCoach(planned), null, 2)
    },

    /**
     * The contract the coach writes to, as the text it is pasted into a fresh chat
     * as. It is the same for every athlete, so it takes nothing: the session the
     * action resolves is what says who may ask for it.
     */
    async exportSchema(): Promise<string> {
      return schemaForCoach()
    },

    /**
     * Every `movementId` an import has registered, so the coach reuses ids instead of
     * inventing them — which is what makes a twenty-Week Movement chart possible. The
     * registry is global by design, so this asks for no athlete either.
     */
    async exportRegistry(): Promise<string> {
      const rows = await database.select({ id: movement.id }).from(movement).orderBy(asc(movement.id))

      return JSON.stringify({ movementIds: rows.map((row) => row.id) }, null, 2)
    },

    /**
     * Records what happened against one Exercise, replacing whatever was there — a
     * mistap costs one more tap, never an undo. A null `log` is the Log taken back:
     * a note written by mistake is the whole of what was recorded, so removing it
     * leaves the Exercise unlogged rather than holding an empty Log open. Returns
     * null when the athlete has no such Exercise, which is the only way this fails.
     */
    async logExercise({
      userId,
      weekNumber,
      dayOrdinal,
      exerciseKey,
      log: entry,
      today,
    }: {
      userId: string
      weekNumber: number
      dayOrdinal: number
      exerciseKey: string
      log: Log | null
      today: string
    }): Promise<Day | null> {
      const [found] = await database
        .select({ id: exercise.id })
        .from(exercise)
        .innerJoin(day, eq(day.id, exercise.dayId))
        .innerJoin(week, eq(week.id, day.weekId))
        .where(
          and(
            eq(week.userId, userId),
            eq(week.number, weekNumber),
            eq(day.ordinal, dayOrdinal),
            eq(exercise.key, exerciseKey),
            eq(exercise.dropped, false),
          ),
        )

      if (found === undefined) {
        return null
      }

      if (entry === null) {
        await database.delete(log).where(eq(log.exerciseId, found.id))
      } else {
        const columns = columnsOf(entry)

        await database
          .insert(log)
          .values({ exerciseId: found.id, ...columns })
          .onConflictDoUpdate({ target: log.exerciseId, set: { ...columns, loggedAt: new Date() } })
      }

      const written = await readWeek({ userId, number: weekNumber, today })

      return written?.days.find((one) => one.ordinal === dayOrdinal) ?? null
    },

    /**
     * The athlete's note on the Day as a whole, replacing whatever was there. Null
     * when the athlete has no such Day, which is the only way this can fail.
     */
    async logDay({
      userId,
      weekNumber,
      dayOrdinal,
      note,
      today,
    }: {
      userId: string
      weekNumber: number
      dayOrdinal: number
      note: string
      today: string
    }): Promise<Day | null> {
      const [found] = await database
        .select({ id: day.id })
        .from(day)
        .innerJoin(week, eq(week.id, day.weekId))
        .where(and(eq(week.userId, userId), eq(week.number, weekNumber), eq(day.ordinal, dayOrdinal)))

      if (found === undefined) {
        return null
      }

      const trimmed = note.trim()

      // Emptying the box is how a note is taken back — there is nothing else in a
      // Day's Log to keep standing, so the row goes with it.
      if (trimmed === '') {
        await database.delete(dayLog).where(eq(dayLog.dayId, found.id))
      } else {
        await database
          .insert(dayLog)
          .values({ dayId: found.id, note: trimmed })
          .onConflictDoUpdate({ target: dayLog.dayId, set: { note: trimmed, loggedAt: new Date() } })
      }

      const noted = await readWeek({ userId, number: weekNumber, today })

      return noted?.days.find((one) => one.ordinal === dayOrdinal) ?? null
    },

    /**
     * The shelf: every Week the athlete has imported, most recent first, the one
     * being trained marked. It carries no plan — twenty Weeks are to be looked
     * through, and reading one is what opening it is for.
     */
    async listWeeks({ userId, today }: { userId: string; today: string }): Promise<WeekOnShelf[]> {
      const spans = await weekSpans({ userId })
      const current = currentIn({ spans, today })

      return spans.map((span) => ({ ...span, current: span.number === current }))
    },

    /** What the app opens on: today's Day, and the Week it sits in. */
    async getCurrentDay({ userId, today }: { userId: string; today: string }): Promise<CurrentDay | null> {
      const number = currentIn({ spans: await weekSpans({ userId }), today })

      if (number === null) {
        return null
      }

      const found = await readWeek({ userId, number, today })

      if (found === null) {
        return null
      }

      return { week: found, day: found.days.find((one) => one.date === today) ?? null }
    },
  }
}

/**
 * The Week today falls inside. Weeks should not overlap, but a re-dated import can
 * make them: the spans come most recent first, so the one that started last wins.
 */
function currentIn({ spans, today }: { spans: Span[]; today: string }): number | null {
  const running = spans.find((span) => span.endDate !== null && span.startDate <= today && today <= span.endDate)

  return running?.number ?? null
}

/**
 * Whether a Day has finished. Nothing stores this and nothing sets it: a training
 * Day is done when every Exercise it asks for has been logged, and an Exercise the
 * coach marked `(Optional)` is never one it asks for.
 */
function isComplete({
  kind,
  date,
  exercises,
  today,
}: {
  kind: Day['kind']
  date: string
  exercises: Exercise[]
  today: string
}): boolean {
  // A rest Day asks for nothing, so the only thing that can finish it is the clock —
  // and it is the athlete's clock, because that is where the resting happened.
  if (kind === 'rest') {
    return date < today
  }

  return exercises.every((one) => one.optional || one.log !== null)
}

function toExercise({ exercise: row, log: logRow }: ExerciseRow): Exercise {
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
    log: logRow === null ? null : toLog(logRow),
  }
}

/** The three shapes of ADR 0003, read back out of the flat columns they are stored in. */
function toLog(row: typeof log.$inferSelect): Log {
  if (row.skipped) {
    return { kind: 'skipped', note: row.note }
  }

  if (row.difficulty !== null) {
    return { kind: 'difficulty', difficulty: row.difficulty as Difficulty, note: row.note }
  }

  return { kind: 'note', note: row.note ?? '' }
}

/** And the same three shapes flattened back down for storage. */
function columnsOf(entry: Log): { skipped: boolean; difficulty: string | null; note: string | null } {
  return {
    skipped: entry.kind === 'skipped',
    difficulty: entry.kind === 'difficulty' ? entry.difficulty : null,
    note: entry.note ?? null,
  }
}

/** The parse as the athlete reads it back: ordinals, Focus, and the coach's own lines. */
function asPreview(imported: ImportedWeek): WeekPreview {
  return {
    number: imported.number,
    notes: imported.notes ?? null,
    days: imported.days.map((one) => ({
      ordinal: one.ordinal,
      kind: one.kind,
      focus: one.focus ?? null,
      exercises: one.exercises.map((each) => ({ key: each.key, name: each.name, raw: each.raw })),
    })),
  }
}
