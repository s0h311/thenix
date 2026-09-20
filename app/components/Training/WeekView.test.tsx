import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { WeekView } from './WeekView.tsx'
import type { Logged, Noted } from './WeekView.tsx'
import type { Day, Week } from '../../../shared/training.ts'

const WEEK: Week = {
  number: 20,
  startDate: '2025-08-25',
  notes: 'PAIN RULE (all days): ≤3/10 during, baseline within 24h.',
  days: [
    {
      ordinal: 1,
      date: '2025-08-25',
      weekday: 'monday',
      kind: 'training',
      focus: 'Upper Push + Core',
      notes: null,
      log: null,
      complete: false,
      exercises: [
        {
          key: 'dips',
          movementId: 'dip',
          name: 'Dips',
          variant: 'ROM ~120°',
          side: 'both',
          optional: false,
          toFailure: false,
          prescription: { kind: 'reps', sets: 3, reps: { min: 6, max: 6 } },
          load: null,
          tempo: 'slow',
          restSeconds: null,
          cue: 'Deepened, 2 clean partial weeks banked.',
          raw: 'Dips, ROM ~120°: 3×6, slow — deepened, 2 clean partial weeks banked.',
          log: null,
        },
        {
          key: 'hollow-body',
          movementId: 'hollow-body-hold',
          name: 'Hollow body',
          variant: 'weighted',
          side: 'both',
          optional: false,
          toFailure: false,
          prescription: { kind: 'time', sets: 3, seconds: { min: 35, max: 35 } },
          load: { kind: 'perHand', value: 1, unit: 'kg', approx: false },
          tempo: null,
          restSeconds: { min: 60, max: 60 },
          cue: null,
          raw: 'Hollow body, weighted: 3×35s, 1kg/hand, rest 60s.',
          log: null,
        },
        {
          key: 'biceps-curls',
          movementId: 'biceps-curl',
          name: 'Biceps curls',
          variant: 'effective sets',
          side: 'both',
          optional: false,
          toFailure: true,
          prescription: { kind: 'reps', sets: 3, reps: null },
          load: { kind: 'symmetric', value: 12, unit: 'kg', approx: false },
          tempo: null,
          restSeconds: { min: 35, max: 35 },
          cue: null,
          raw: 'biceps curls, effective sets, 12kg (14kg if hitting 15+ reps), 3 sets, 35 sec rest',
          log: null,
        },
      ],
    },
    {
      ordinal: 4,
      date: '2025-08-28',
      weekday: 'thursday',
      kind: 'rest',
      focus: 'Full Rest',
      notes: null,
      log: null,
      // Its Thursday has been and gone, and a rest Day asks for nothing else.
      complete: true,
      exercises: [],
    },
    {
      ordinal: 6,
      date: '2025-08-30',
      weekday: 'saturday',
      kind: 'training',
      focus: 'Zone 2 Run',
      notes: null,
      log: null,
      complete: false,
      exercises: [
        {
          key: 'zone-2-run',
          movementId: 'zone-2-run',
          name: 'Zone 2 run',
          variant: null,
          side: 'both',
          optional: false,
          toFailure: false,
          prescription: { kind: 'distance', km: { min: 10, max: 11 }, pace: '6:00–6:10/km' },
          load: null,
          tempo: null,
          restSeconds: null,
          cue: '3:2 breathing.',
          raw: '10–11 km @ 6:00–6:10/km, 3:2 breathing',
          log: null,
        },
      ],
    },
    {
      ordinal: 7,
      date: '2025-08-31',
      weekday: 'sunday',
      kind: 'training',
      focus: 'Active Recovery',
      notes: 'walked 5km instead',
      log: 'walked 5km instead',
      // Nothing on it is asked for, so there was never anything to finish.
      complete: true,
      exercises: [
        {
          key: 'dead-hang',
          movementId: 'dead-hang',
          name: 'Dead hang',
          variant: 'passive',
          side: 'both',
          optional: true,
          toFailure: false,
          prescription: { kind: 'time', sets: 2, seconds: { min: 45, max: 45 } },
          load: null,
          tempo: null,
          restSeconds: null,
          cue: null,
          raw: '(Optional) Dead hang: 2×45s, passive',
          log: { kind: 'difficulty', difficulty: 'challenging', note: 'shoulders tired' },
        },
      ],
    },
  ],
}

function dayOf(ordinal: number): Day {
  const found = WEEK.days.find((one) => one.ordinal === ordinal)

  if (found === undefined) {
    throw new Error(`the fixture Week has no Day ${ordinal}`)
  }

  return found
}

/** The screen the athlete opens on, mounted the way the page mounts it. */
function openApp({
  day,
  onLog = () => {},
  onNote = () => {},
}: {
  day: Day | null
  onLog?: (entry: Logged) => void
  onNote?: (entry: Noted) => void
}) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <WeekView
      week={WEEK}
      day={day}
      onLog={onLog}
      onNote={onNote}
    />,
  )

  return page.elementLocator(container)
}

/** The screen, plus everything it has sent — the tap is the save, so there is no button. */
function openTraining({ day }: { day: Day | null }) {
  const logged: Logged[] = []
  const noted: Noted[] = []

  return {
    screen: openApp({ day, onLog: (entry) => logged.push(entry), onNote: (entry) => noted.push(entry) }),
    logged,
    noted,
  }
}

describe('the Day the athlete opens on', () => {
  test('the Focus is the headline, so today reads at a glance', async () => {
    const screen = openApp({ day: dayOf(1) })

    await expect.element(screen.getByRole('heading', { name: /Upper Push \+ Core/ })).toBeVisible()
  })

  test('an Exercise shows the prescription, the Variant, the cue and the coach’s own line', async () => {
    const screen = openApp({ day: dayOf(1) })

    await expect.element(screen.getByText('Dips', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('ROM ~120°', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('3×6', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('slow', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('Deepened, 2 clean partial weeks banked.', { exact: true })).toBeVisible()
    await expect
      .element(
        screen.getByText('Dips, ROM ~120°: 3×6, slow — deepened, 2 clean partial weeks banked.', { exact: true }),
      )
      .toBeVisible()
  })

  test('load and rest sit beside the prescription', async () => {
    const screen = openApp({ day: dayOf(1) })

    await expect.element(screen.getByText('3×35s', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('1kg/hand', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('rest 60s', { exact: true })).toBeVisible()
  })

  test('a set taken to failure asks for max rather than a rep count', async () => {
    const screen = openApp({ day: dayOf(1) })

    await expect.element(screen.getByText('3× max', { exact: true })).toBeVisible()
  })

  test('the Week’s notes are reachable without leaving the Day', async () => {
    const screen = openApp({ day: dayOf(1) })

    await screen.getByRole('button', { name: /Week notes/ }).click()

    await expect.element(screen.getByText(/PAIN RULE/)).toBeVisible()
  })

  test('a rest Day asks for no Exercises', async () => {
    const screen = openApp({ day: dayOf(4) })

    await expect.element(screen.getByText(/Rest Day/)).toBeVisible()
    expect(screen.getByRole('listitem').all()).toHaveLength(0)
  })

  test('an all-optional Day is still a training Day, with each Exercise marked optional', async () => {
    const screen = openApp({ day: dayOf(7) })

    await expect.element(screen.getByRole('heading', { name: /Active Recovery/ })).toBeVisible()
    await expect.element(screen.getByText('Optional', { exact: true })).toBeVisible()
    await expect.element(screen.getByText('2×45s', { exact: true })).toBeVisible()
  })

  test('any other Day of the Week can be opened from the Day being trained', async () => {
    const screen = openApp({ day: dayOf(1) })

    await screen.getByRole('button', { name: /Day 6/ }).click()

    await expect.element(screen.getByText('10–11 km @ 6:00–6:10/km', { exact: true })).toBeVisible()
  })

  test('a Week that holds no Day for today still opens, and says so', async () => {
    const screen = openApp({ day: null })

    await expect.element(screen.getByText(/Nothing is scheduled for today/)).toBeVisible()
    await expect.element(screen.getByRole('button', { name: /Day 1/ })).toBeVisible()
  })
})

describe('logging what happened', () => {
  test('one tap on a rating is the whole Log', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Good — Dips' }).click()

    expect(logged).toEqual([
      { dayOrdinal: 1, exerciseKey: 'dips', log: { kind: 'difficulty', difficulty: 'good', note: null } },
    ])
  })

  test('the tapped rating is the one shown as chosen, and the others are not', async () => {
    const { screen } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Challenging — Dips' }).click()

    await expect
      .element(screen.getByRole('button', { name: 'Challenging — Dips' }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('button', { name: 'Good — Dips' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('a mistap is corrected by tapping the rating that was meant', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Easy — Dips' }).click()
    await screen.getByRole('button', { name: 'Challenging — Dips' }).click()

    await expect.element(screen.getByRole('button', { name: 'Easy — Dips' })).toHaveAttribute('aria-pressed', 'false')
    expect(logged.at(-1)?.log).toEqual({ kind: 'difficulty', difficulty: 'challenging', note: null })
  })

  test('a skip is its own tap, and reads as a skip rather than as nothing', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Skipped — Dips' }).click()

    await expect.element(screen.getByRole('button', { name: 'Skipped — Dips' })).toHaveAttribute('aria-pressed', 'true')
    expect(logged).toEqual([{ dayOrdinal: 1, exerciseKey: 'dips', log: { kind: 'skipped', note: null } }])
  })

  test('a chosen rating is marked by more than its colour', async () => {
    const { screen } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Good — Dips' }).click()

    await expect.element(screen.getByRole('button', { name: 'Good — Dips' })).toHaveTextContent('✓')
  })

  test('a note written with no rating is a Log in its own right', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('textbox', { name: 'Note on Dips' }).fill('back hurt')
    await screen.getByRole('button', { name: /Week notes/ }).click()

    expect(logged).toEqual([{ dayOrdinal: 1, exerciseKey: 'dips', log: { kind: 'note', note: 'back hurt' } }])
  })

  test('a note written after a rating keeps the rating', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: 'Challenging — Dips' }).click()
    await screen.getByRole('textbox', { name: 'Note on Dips' }).fill('challenging, but did 4x8')
    await screen.getByRole('button', { name: /Week notes/ }).click()

    expect(logged.at(-1)?.log).toEqual({
      kind: 'difficulty',
      difficulty: 'challenging',
      note: 'challenging, but did 4x8',
    })
  })

  test('a Log already recorded is shown when the Day opens, rating and note both', async () => {
    const { screen } = openTraining({ day: dayOf(7) })

    await expect
      .element(screen.getByRole('button', { name: 'Challenging — Dead hang' }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect.element(screen.getByRole('textbox', { name: 'Note on Dead hang' })).toHaveValue('shoulders tired')
  })

  test('a Day other than the one being trained is logged through the Day strip', async () => {
    const { screen, logged } = openTraining({ day: dayOf(1) })

    await screen.getByRole('button', { name: /Day 6/ }).click()
    await screen.getByRole('button', { name: 'Good — Zone 2 run' }).click()

    expect(logged).toEqual([
      { dayOrdinal: 6, exerciseKey: 'zone-2-run', log: { kind: 'difficulty', difficulty: 'good', note: null } },
    ])
  })

  test('a rest Day asks for nothing, so there is nothing to log', async () => {
    const { screen } = openTraining({ day: dayOf(4) })

    expect(screen.getByRole('button', { name: /Skipped/ }).all()).toHaveLength(0)
  })
})

describe('the Day as a whole', () => {
  test('a note belongs to the Day itself, alongside the Exercises rather than inside one', async () => {
    const { screen, noted } = openTraining({ day: dayOf(1) })

    await screen.getByRole('textbox', { name: 'Note on Day 1' }).fill('Swapped with day 4')
    await screen.getByRole('button', { name: /Week notes/ }).click()

    expect(noted).toEqual([{ dayOrdinal: 1, note: 'Swapped with day 4' }])
  })

  test('a rest Day takes a note too, so a walk needs no invented Exercise', async () => {
    const { screen, noted } = openTraining({ day: dayOf(4) })

    await screen.getByRole('textbox', { name: 'Note on Day 4' }).fill('walked')
    await screen.getByRole('button', { name: /Week notes/ }).click()

    expect(noted).toEqual([{ dayOrdinal: 4, note: 'walked' }])
  })

  test('a note already written is there when the Day opens', async () => {
    const { screen } = openTraining({ day: dayOf(7) })

    await expect.element(screen.getByRole('textbox', { name: 'Note on Day 7' })).toHaveValue('walked 5km instead')
  })

  test('how much of the Day is left is on the screen, and moves with every tap', async () => {
    const { screen } = openTraining({ day: dayOf(1) })

    await expect.element(screen.getByText('0 of 3 logged')).toBeVisible()

    await screen.getByRole('button', { name: 'Good — Dips' }).click()

    await expect.element(screen.getByText('1 of 3 logged')).toBeVisible()
  })

  test('the last Exercise logged finishes the Day — there is nothing to press', async () => {
    const { screen } = openTraining({ day: dayOf(6) })

    expect(screen.getByRole('button', { name: /Done/ }).all()).toHaveLength(0)

    await screen.getByRole('button', { name: 'Good — Zone 2 run' }).click()

    await expect.element(screen.getByText(/Day done/)).toBeVisible()
  })

  test('an Optional Exercise is not something the Day asks for, so it is not counted', async () => {
    const { screen } = openTraining({ day: dayOf(7) })

    await expect.element(screen.getByText(/Day done/)).toBeVisible()
    expect(screen.getByText(/logged$/).all()).toHaveLength(0)
  })

  test('a rest Day whose date has passed reads as done', async () => {
    const { screen } = openTraining({ day: dayOf(4) })

    await expect.element(screen.getByText(/Day done/)).toBeVisible()
  })
})
