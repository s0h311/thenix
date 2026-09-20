import { expect, describe, test } from 'vitest'
import { page } from 'vitest/browser'
import { createRoot } from 'react-dom/client'
import { WeekView } from './WeekView.tsx'
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
      exercises: [],
    },
    {
      ordinal: 6,
      date: '2025-08-30',
      weekday: 'saturday',
      kind: 'training',
      focus: 'Zone 2 Run',
      notes: null,
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
        },
      ],
    },
    {
      ordinal: 7,
      date: '2025-08-31',
      weekday: 'sunday',
      kind: 'training',
      focus: 'Active Recovery',
      notes: null,
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
function openApp({ day }: { day: Day | null }) {
  const container = document.createElement('div')

  document.body.append(container)
  createRoot(container).render(
    <WeekView
      week={WEEK}
      day={day}
    />,
  )

  return page.elementLocator(container)
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
