import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth.ts'

/**
 * The Movement registry: the identity an Exercise keeps across Weeks. Global, not
 * per-user — any user's import registers an id on first sight.
 */
export const movement = pgTable('movement', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** A Week is scoped to a user and numbered by the coach, never by counting rows. */
export const week = pgTable(
  'week',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique('week_user_number_unique').on(table.userId, table.number)],
)

/** A Day carries its ordinal only; its weekday is derived as startDate + (ordinal - 1). */
export const day = pgTable(
  'day',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    weekId: uuid('week_id')
      .notNull()
      .references(() => week.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    kind: text('kind').notNull(),
    focus: text('focus'),
    notes: text('notes'),
  },
  (table) => [unique('day_week_ordinal_unique').on(table.weekId, table.ordinal)],
)

/**
 * Prescription, load and rest are JSONB — they are read whole and never queried into.
 * `movementId` and `side` are real columns so a cross-Week Movement query stays a join.
 */
export const exercise = pgTable(
  'exercise',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => day.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    key: text('key').notNull(),
    movementId: text('movement_id')
      .notNull()
      .references(() => movement.id),
    name: text('name').notNull(),
    variant: text('variant'),
    side: text('side').notNull(),
    optional: boolean('optional').notNull(),
    toFailure: boolean('to_failure').notNull(),
    prescription: jsonb('prescription').notNull(),
    load: jsonb('load'),
    tempo: text('tempo'),
    restSeconds: jsonb('rest_seconds'),
    cue: text('cue'),
    raw: text('raw').notNull(),
  },
  (table) => [
    unique('exercise_day_key_unique').on(table.dayId, table.key),
    index('exercise_movementId_idx').on(table.movementId),
    index('exercise_side_idx').on(table.side),
  ],
)

/**
 * What the athlete did, one row per Exercise — writing again replaces, so a mistap
 * costs one more tap. The three shapes of ADR 0003 are stored flat: `skipped`, a
 * `difficulty`, or a note standing alone. No column here counts anything.
 */
export const log = pgTable(
  'log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercise.id, { onDelete: 'cascade' }),
    skipped: boolean('skipped').notNull().default(false),
    difficulty: text('difficulty'),
    note: text('note'),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
  },
  (table) => [unique('log_exercise_unique').on(table.exerciseId)],
)

/**
 * The athlete's note on a Day as a whole — "swapped with day 4", "walked". Its own
 * table rather than a column on `day`, because `day.notes` is the coach's and is
 * rewritten by every import, while this is the athlete's and must outlive one.
 */
export const dayLog = pgTable(
  'day_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => day.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    loggedAt: timestamp('logged_at').defaultNow().notNull(),
  },
  (table) => [unique('day_log_day_unique').on(table.dayId)],
)
