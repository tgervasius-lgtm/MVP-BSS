# RFID assignment ordering (#175)

## Confirmed failure

The unchanged-main baseline run [35520087701](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/35520087701)
failed the existing two-success concurrent RFID assignment assertion.
The deterministic regression on commit `41d2fa881a7d516256030b0a76a56f6fece0c17c`
then reproduced it in PostgreSQL 16, run [35521791401](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/35521791401).
All six preceding integration cases passed. The new ordering case failed;
PostgreSQL logged `rfid_cards_check` while closing the previous card.

The older transaction began at `16:09:39.532720+00`, but acquired the lifecycle
lock after a newer transaction had activated a card at `16:09:39.564...+00`.
Using the older transaction timestamp for the replacement boundary would
produce `valid_to < valid_from`. This is an application ordering defect,
separate from #173 fixture ACL contention, not proof of a production incident.

## Focused correction

After the existing organization lifecycle lock and active-worker row lock,
capture one effective timestamp and use it for both the previous card's end
and the replacement card's start. Preserve an explicit `validFrom`; otherwise
use the database clock at that point. Keep the value as PostgreSQL text until
it is cast back to timestamptz, preserving sub-millisecond precision.

The transaction, tenant/RLS context, Administrator requirement, unique active
card constraints and audit insertion remain unchanged. There is no schema,
grant, API shape, dependency or frozen Product Contract change. No retry is
introduced. Invalid explicit earlier boundaries must still roll back atomically.

[PostgreSQL 16 time semantics](https://www.postgresql.org/docs/16/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
distinguish the fixed transaction start time from the current clock.

## Verification and integration

The regression controls scheduling immediately after a real BEGIN, while all
service SQL, locks, transactions and assertions remain real. Acceptance needs
two successful calls, one active card, exactly shared validity boundaries,
two audit records, preserved explicit times, rejected invalid history and
negative tenant/role tests. Required PostgreSQL and repository results are
recorded on the focused PR, separately from the expected failing reproduction.

Candidate `69e225b2059f9eaa58d6eefb6836a13e06253e5e` passed PostgreSQL 16
run [35521979334](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/35521979334):
45 unit/contract tests and 9 integration tests (7 top-level plus 2 nested),
with zero failures or skips. Full-stack run
[35521979356](https://github.com/tgervasius-lgtm/MVP-BSS/actions/runs/35521979356)
also passed. The same deterministic schedule failed before the correction.

Prerequisite #174 is merged as `290b0476e6f047a42bed72c4247d462d530fc607`.
PR #176 is refreshed against that protected main; its remaining diff contains
the RFID correction, regression and evidence documentation. All protected
checks must pass on the refreshed candidate. On 20 September 2026 the owner
approved the concrete #174 -> #176 -> #108 merge sequence with checks between
steps and the existing automatic publications. This is not a general restart.
Green repository checks do not establish pilot, production or terminal readiness.

## Recovery and limits

No data migration or backfill is needed. A reviewed revert restores the old
timestamp behavior and its ordering defect; it is containment, not a fix.
Hold release on regression. This change covers RFID assignment; it is not a
global audit of every lifecycle timestamp, clock synchronization or physical
terminal. Existing staged/physical readiness requirements still apply.
