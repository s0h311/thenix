# thenix

A personal training log. A coach (an LLM) writes a **Week** of training as JSON; the
athlete imports it, works through it day by day recording what actually happened, and
exports the result so the coach can write the next Week.

## Language

### The plan

**Training**:
The domain. Deliberately not "calisthenics": roughly two days in seven are running, and
early Weeks include HIIT and cycling.
_Avoid_: Calisthenics, workout, fitness

**Program**:
The long arc across many Weeks — progression paths, injury timelines, lever decisions.
Acknowledged but not modelled; it lives in the coach's head and in Week prose.

**Week**:
A numbered period of training with a start date, containing ordered Days. The unit of
import and of export. Its number comes from the imported JSON, never from counting rows.
_Avoid_: Plan, block, cycle

**Day**:
One position within a Week, identified by its ordinal (1..n). Its weekday is derived as
`Week.startDate + (n-1)` and is display only. A Week need not have seven Days.
_Avoid_: Session, date, workout

**Focus**:
A Day's headline, naming what it trains — "Upper Push + Core", "VO2max Run".

**Exercise**:
One prescribed item within a Day. Identified within its Day by a `key` the coach emits.
_Avoid_: Movement (that is the cross-Week identity), set, activity

**Movement**:
The identity an Exercise keeps across Weeks, carried as `movementId`. What makes a
twenty-Week chart possible. "Chair dips" and "Dips, ROM ~120°" are one Movement.
_Avoid_: Exercise, lift

**Variant**:
How a Movement is being made harder or easier right now — ROM, leverage, elevation,
assistance. The Variant changing _is_ the progression, so it is never normalised away.
_Avoid_: Modification, version, progression

**Side**:
Which limb an Exercise loads: `both`, `each`, `left`, or `right`. `each` means the
prescription repeats per side; `left`/`right` means this Exercise is that limb only, and
its counterpart is a separate Exercise with its own load.

**Prescription**:
What the coach asks for, discriminated by the unit counted: reps, time, distance, or
rounds. Modifiers that cross all four — Side, Load, tempo, rest — sit beside it, not
inside it.
_Avoid_: Target, goal, sets

**Load**:
External resistance, discriminated by how it is distributed: symmetric, per-hand,
asymmetric, bodyweight, or improvised. Asymmetric is not an edge case — during rehab the
two arms carry deliberately different weights.

**Raw**:
The coach's original prescription text, kept verbatim beside the parsed fields. Structure
powers features; Raw is what is displayed when parsing was partial, and it is why an
import can never fail.

### What happened

**Log**:
The record of what the athlete actually did on a Day. Distinct from the coach's intent.
_Avoid_: Progress, result, history

**Orphan**:
A Log whose Exercise a later revision of the Week dropped. The plan moved on and the
work did not, so the Log is kept and shown under its Day rather than deleted.
_Avoid_: Stale, deleted, removed

**Progression**:
The coach's decision about which lever moves next Week. It appears in Week prose and is
never something the app computes.
_Avoid_: Progress

### Moving data

**Import**:
Taking a coach-authored Week JSON into the app. The app validates; it never parses prose.

**Export**:
Emitting a Week with its Logs as JSON, for the coach to read when writing the next Week.
Carries the known `movementId` list so the coach reuses ids instead of inventing them.
