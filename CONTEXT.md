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

**Shelf**:
Every Week the athlete has imported, most recent first, with the Week being trained
marked in words rather than by date arithmetic. What makes twenty Weeks something to
look back through. A Week on the shelf is not read-only: last week's makeup session is
logged against the Week it belongs to.
_Avoid_: History, archive, list

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
A Log is the athlete's to take back: emptying a note that was the whole of one leaves
the Exercise unlogged again. Only the coach's revision never deletes one — see Orphan.
_Avoid_: Progress, result, history

**Orphan**:
A Log whose Exercise a later revision of the Week dropped. The plan moved on and the
work did not, so the Log is kept and shown under its Day rather than deleted. A Day the
revision drops whole is kept the same way when anything was recorded on it — the Day is
still where its orphans belong — and goes only when nothing was.
_Avoid_: Stale, deleted, removed

**Progression**:
The coach's decision about which lever moves next Week. It appears in Week prose and is
never something the app computes.
_Avoid_: Progress

### Moving data

**Import**:
Taking a coach-authored Week JSON into the app. The app validates; it never parses prose.

**Preview**:
The parse shown before anything is written: the Week as the app read it, never the
text that was pasted. Confirming is a second step, so a Week that read differently
from what the athlete expected is caught while the shelf is still untouched. It is
also where the start date is picked — the day after the last Week ended, or the next
Monday when there is none, because the coach writes no weekday at all.
_Avoid_: Draft, dry run, staging

**Export**:
Emitting a Week with its Logs as JSON, for the coach to read when writing the next Week.
Three things are exported, each a paste into the coach's chat: a Week, the **schema**,
and the **registry**.

**Schema export**:
The contract the coach writes to, published as JSON Schema generated from the parser
itself so the two cannot drift. A first-class feature, not documentation: a fresh chat
knows nothing, and a coach that has not read it writes Weeks the import rejects.

**Registry export**:
Every `movementId` an import has registered, so the coach reuses ids instead of
inventing them. Global rather than per-athlete — ids are shared vocabulary.
