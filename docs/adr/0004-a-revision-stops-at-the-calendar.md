# A Revision stops at the calendar, not at the Logs

A Revision writes only the Days that are not _Settled_. A Day is Settled when its date is
behind the athlete's today, or when it is today and done. The boundary is the **calendar**,
with a single concession at today's Day: today still takes the new plan until it is done,
because the most likely reason to paste an adjusted Week mid-week is to change the session
about to be trained.

Settled is read from the `today` sent with the write, not the one sent with the Preview.

## Considered Options

The tidier rule is **the Logs, not the calendar**: a Day is Settled once anything is
recorded on it, wherever it falls. One rule, no date arithmetic, and it subsumes the
today case entirely — a done Day is a logged Day, so the concession disappears.

It was rejected because of the Day the athlete skipped. Nothing is logged against it, so
the Log rule says it is open and the new plan lands on it. The Week then exports with a
prescription the athlete was never actually asked for on a date already gone, and the
coach — whose only view of what happened is that export — writes next Week from it. The
app's one job is to tell the coach the truth about the past, and the elegant rule lies.

The reverse extreme, **today is always Settled** because it is not in the future, was
rejected for the opposite reason: a Week revised at breakfast could not change the
session that evening, which is the common case this feature was reported from.

Making a Revision **refuse** when it touches Settled Days was rejected as pushing the
problem to the coach, who would have to echo back history it has no reason to hold. The
Preview marks the set-aside Days instead, so the athlete sees a rewritten day 3 and can
raise it in the chat.

## Consequences

Settled binds the coach, not the athlete. The plan is frozen; the Logs are not. Last
night's session is still logged this morning and a mistap on a finished Day is still
corrected — the record of what happened is the thing being protected, so freezing the
athlete out would destroy records rather than preserve them. Anyone reading the write path
will find a lock that one of the two writers ignores, and that asymmetry is the point.

Omission is treated as an edit. A Revision that leaves out a Settled Day does not withdraw
it, which is a carve-out in the withdrawal path rather than in the upsert path, and is the
part most easily lost in a refactor.

A Settled region is a region. A Day the paste adds behind the boundary is not written even
where no row exists to overwrite, so a Day destroyed by an earlier bad Revision cannot be
repaired by a later one. Accepted: nothing is versioned, no prior plan is retained, and a
repair path would be indistinguishable from the overwrite this ADR exists to prevent.

The start date stays editable and the boundary follows it, so re-dating a Week forward does
un-Settle its Days. That is a deliberate escape hatch, kept because a Week imported on the
wrong day is a real and recoverable mistake; the Preview says how far the move goes and
that the Logs move with it.

Nothing tells the coach where the boundary fell. The export shows the plan as it actually
stood, and encoding app mechanics into the Week shape would invite the coach to write
around them. The schema export is where the contract is explained.
