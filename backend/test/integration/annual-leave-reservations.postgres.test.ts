import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { migrateUp } from "../../src/db/migrate.js";
import { withTenant } from "../../src/db/tenant.js";
import type { ActorContext } from "../../src/domain/types.js";
import { PgAnnualLeaveReservationService } from "../../src/services/pg-annual-leave-reservation-service.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
const firstRange = { startDate: "2030-01-07", endDate: "2030-01-15" };
const secondRange = { startDate: "2030-01-21", endDate: "2030-01-29" };
const down = new URL("../../migrations/020_annual_leave_reservations.down.sql", import.meta.url);
const decisionDown = new URL("../../migrations/021_annual_leave_decision_dates.down.sql", import.meta.url);

async function fixture(t: test.TestContext) {
  assert.ok(url, "BSS_TEST_DATABASE_URL is required");
  const f = await createPostgresFixture(url, "leave_fund");
  t.after(f.dispose);
  await migrateUp(f.owner);
  const privilege = await f.owner.query<{ granted: boolean }>(
    "SELECT has_table_privilege($1, 'annual_leave_reservations', 'SELECT,INSERT,UPDATE') OR has_table_privilege($1, 'annual_leave_decision_dates', 'SELECT,INSERT,UPDATE') AS granted", [f.role]
  );
  assert.equal(privilege.rows[0]!.granted, false);
  await f.owner.query(`GRANT USAGE ON SCHEMA public TO ${f.role}`);
  await f.owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${f.role}`);
  await f.owner.query(`GRANT UPDATE ON workers, leave_requests, annual_leave_reservations, annual_leave_decision_dates, attendance_month_locks TO ${f.role}`);
  await f.owner.query(`GRANT INSERT ON leave_requests, annual_leave_reservations, annual_leave_decision_dates, audit_events, attendance_month_locks, attendance_period_versions, attendance_period_transitions TO ${f.role}`);

  async function seed(label: string) {
    const { rows: [row] } = await f.owner.query<{
      org: string; dept: string; worker: string; workerUser: string; admin: string; manager: string;
    }>(`WITH
      o AS (INSERT INTO organizations(name) VALUES ($1) RETURNING id),
      d AS (INSERT INTO departments(organization_id, name) SELECT id, 'Test' FROM o RETURNING id, organization_id),
      s AS (INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
        SELECT id, 'Day', '08:00', '16:00', 30, 5 FROM o RETURNING id),
      w AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id, annual_leave_allowance)
        SELECT d.organization_id, '5', 'Synthetic Worker', d.id, s.id, 5 FROM d,s RETURNING id, organization_id),
      wu AS (INSERT INTO users(organization_id, email, role, worker_id)
        SELECT organization_id, $2, 'worker', id FROM w RETURNING id),
      a AS (INSERT INTO users(organization_id, email, role) SELECT id, $3, 'admin' FROM o RETURNING id),
      m AS (INSERT INTO users(organization_id, email, role) SELECT id, $4, 'manager' FROM o RETURNING id)
      SELECT o.id AS org, d.id AS dept, w.id AS worker, wu.id AS "workerUser", a.id AS admin, m.id AS manager FROM o,d,w,wu,a,m`,
      [label, `worker-${label}@example.test`, `admin-${label}@example.test`, `manager-${label}@example.test`]);
    assert.ok(row);
    const worker: ActorContext = { organizationId: row.org, userId: row.workerUser, role: "worker",
      departmentIds: [], selfWorkerId: row.worker, sessionId: randomUUID() };
    const admin: ActorContext = { ...worker, userId: row.admin, role: "admin", selfWorkerId: null };
    const manager: ActorContext = { ...admin, userId: row.manager, role: "manager", departmentIds: [row.dept] };
    return { worker, admin, manager };
  }

  const primary = await seed("primary");
  const other = await seed("secondary");
  const reserve = new PgAnnualLeaveReservationService(f.appPool);
  const legacy = new PgMvpService(f.appPool, {
    rfidUidPepper: "leave-reservation-fixture-pepper-1234",
    deviceCredentialEncryptionKey: "leave-reservation-fixture-device-key",
    terminalActivationCode: "synthetic-activation-code",
    publicOrigin: "https://bss.test"
  });
  return { ...f, reserve, legacy, ...primary, other };
}

test("concurrent submissions reserve at most five days and repeat the same request", options, async t => {
  const f = await fixture(t);
  const first = await Promise.all([
    f.reserve.submit(f.worker, firstRange, "submission-one", "first"),
    f.reserve.submit(f.worker, firstRange, "submission-one", "same"),
    f.reserve.submit(f.worker, secondRange, "submission-two", "second")
  ]);
  assert.deepEqual(first[0], first[1]);
  assert.deepEqual([first[0].years[0]!.reservedDays, first[2].years[0]!.reservedDays].sort(), [0, 5]);
  assert.ok(first.every(result => result.status === "pending" && result.years[0]!.requestedDays === 7));
  await assert.rejects(f.reserve.submit(f.worker, { ...firstRange, note: "Different" }, "submission-one", "changed"), { code: "CONFLICT" });
  const audit = await f.owner.query<{ count: string }>("SELECT count(*) FROM audit_events WHERE action='leave_request.reserve'");
  assert.equal(audit.rows[0]!.count, "2");

  const [covered, waiting] = [first[0], first[2]].sort((a, b) => b.years[0]!.reservedDays - a.years[0]!.reservedDays);
  assert.ok(covered && waiting);
  assert.deepEqual(await f.reserve.reprocess(f.worker, waiting.requestId, waiting.revision, "unchanged"), waiting);
  await assert.rejects(f.legacy.approveLeaveRequest(f.admin, covered.requestId, covered.revision, undefined, "legacy-approval"), { code: "CONFLICT" });
  await f.legacy.cancelOwnLeaveRequest(f.worker, covered.requestId, covered.revision, "cancel");
  assert.equal((await f.owner.query("SELECT reserved_days FROM annual_leave_reservations WHERE request_id = $1", [waiting.requestId])).rows[0].reserved_days, 0);
  const raced = await Promise.allSettled([
    f.reserve.reprocess(f.worker, waiting.requestId, waiting.revision, "reprocess-one"),
    f.reserve.reprocess(f.manager, waiting.requestId, waiting.revision, "reprocess-two")
  ]);
  const completed = raced.filter(result => result.status === "fulfilled");
  assert.equal(completed.length, 1);
  const updated = completed[0]!.value;
  assert.deepEqual(updated.years, [{ year: 2030, requestedDays: 7, reservedDays: 5 }]);
  assert.equal(updated.revision, "2");
  assert.ok(raced.some(result => result.status === "rejected" && result.reason.code === "STALE_REVISION"));
  await f.legacy.rejectLeaveRequest(f.manager, updated.requestId, updated.revision, "Synthetic rejection", "reject");
  await assert.rejects(f.reserve.reprocess(f.worker, updated.requestId, "3", "reopen-rejected"), { code: "STALE_REVISION" });
  const released = await f.reserve.submit(f.worker, { startDate: "2030-02-04", endDate: "2030-02-12" }, "submission-three", "third");
  assert.equal(released.years[0]!.reservedDays, 5);
});

test("year boundaries count existing fully covered requests and tenant holidays", options, async t => {
  const f = await fixture(t);
  const december = await f.legacy.createLeaveRequest(f.worker,
    { typeCode: "annual_leave", startDate: "2030-12-23", endDate: "2030-12-25" }, "december");
  await f.legacy.approveLeaveRequest(f.admin, december.id, december.revision, undefined, "approve-december");
  await f.legacy.createLeaveRequest(f.worker,
    { typeCode: "annual_leave", startDate: "2031-01-06", endDate: "2031-01-07" }, "january");
  await f.owner.query("INSERT INTO holidays (organization_id, holiday_date, name) VALUES ($1, '2031-01-06', 'Foreign holiday')",
    [f.other.worker.organizationId]);
  const result = await f.reserve.submit(f.worker,
    { startDate: "2030-12-26", endDate: "2031-01-03" }, "cross-year-one", "cross-year");
  assert.deepEqual(result.years, [
    { year: 2030, requestedDays: 4, reservedDays: 2 },
    { year: 2031, requestedDays: 3, reservedDays: 3 }
  ]);
  await f.owner.query("INSERT INTO holidays (organization_id, holiday_date, name) VALUES ($1, '2031-01-08', 'Tenant holiday')",
    [f.worker.organizationId]);
  const after = await f.reserve.submit(f.worker,
    { startDate: "2031-01-08", endDate: "2031-01-09" }, "local-holiday-one", "local-holiday");
  assert.deepEqual(after.years, [{ year: 2031, requestedDays: 1, reservedDays: 0 }]);
});

test("tenant isolation and role checks hold for reservation reads and writes", options, async t => {
  const f = await fixture(t);
  const created = await f.reserve.submit(f.worker, firstRange, "scope-request-one", "create");
  await assert.rejects(f.reserve.reprocess(f.other.worker, created.requestId, created.revision, "foreign"), { code: "NOT_FOUND" });
  await assert.rejects(f.reserve.reprocess({ ...f.manager, departmentIds: [] }, created.requestId, created.revision, "outside"), { code: "FORBIDDEN" });
  await assert.rejects(f.reserve.reprocess({ ...f.admin, role: "accountant" }, created.requestId, created.revision, "accountant"), { code: "FORBIDDEN" });
  await assert.rejects(f.reserve.submit(f.admin, firstRange, "scope-submission-two", "admin-submission"), { code: "FORBIDDEN" });
  assert.equal(await withTenant(f.appPool, f.other.worker, "hidden", async c =>
    (await c.query("SELECT request_id FROM annual_leave_reservations")).rowCount), 0);
  await assert.rejects(withTenant(f.appPool, f.other.worker, "forbidden", c =>
    c.query("INSERT INTO annual_leave_reservations VALUES ($1,$2,2031,2,1)",
      [f.worker.organizationId, created.requestId])), { code: "42501" });
  await assert.rejects(withTenant(f.appPool, f.other.worker, "foreign-key", c =>
    c.query("INSERT INTO annual_leave_reservations VALUES ($1,$2,2031,2,1)",
      [f.other.worker.organizationId, created.requestId])), { code: "23503" });
});

test("audit failure rolls back both parent and reservation and recovery preserves written data", options, async t => {
  const f = await fixture(t);
  await f.owner.query(`REVOKE INSERT ON audit_events FROM ${f.role}`);
  await assert.rejects(f.reserve.submit(f.worker, firstRange, "audit-retry-one", "missing-audit"), { code: "42501" });
  const empty = await f.owner.query(`SELECT (SELECT COUNT(*) FROM leave_requests)::integer AS requests,
    (SELECT COUNT(*) FROM annual_leave_reservations)::integer AS reservations`);
  assert.deepEqual(empty.rows[0], { requests: 0, reservations: 0 });
  await f.owner.query(`GRANT INSERT ON audit_events TO ${f.role}`);
  const recovered = await f.reserve.submit(f.worker, firstRange, "audit-retry-one", "retry");
  assert.equal(recovered.years[0]!.reservedDays, 5);
  await assert.rejects(f.owner.query(await readFile(down, "utf8")), /reviewed forward recovery/);
  assert.equal((await f.owner.query("SELECT count(*) FROM annual_leave_reservations")).rows[0].count, "1");
});

test("an empty migration can be rolled back and reapplied over existing leave", options, async t => {
  const f = await fixture(t);
  await f.owner.query("BEGIN");
  try {
    await f.owner.query(await readFile(decisionDown, "utf8"));
    await f.owner.query(await readFile(down, "utf8"));
    await f.owner.query("DELETE FROM bss_schema_migrations WHERE version >= '020_annual_leave_reservations'");
    await f.owner.query("COMMIT");
  } catch (error) {
    await f.owner.query("ROLLBACK");
    throw error;
  }
  const original = await f.legacy.createLeaveRequest(f.worker, {
    typeCode: "annual_leave", startDate: "2030-01-07", endDate: "2030-01-11"
  }, "previous-workflow");
  await migrateUp(f.owner);
  const readback = await f.owner.query(
    "SELECT status, revision::text, working_days, reservation_submission_key FROM leave_requests WHERE id=$1",
    [original.id]
  );
  assert.deepEqual(readback.rows[0], {
    status: "pending", revision: "1", working_days: 5, reservation_submission_key: null
  });
  assert.equal((await f.owner.query("SELECT count(*) FROM annual_leave_reservations")).rows[0].count, "0");
  const approved = await f.legacy.approveLeaveRequest(f.admin, original.id, original.revision, undefined, "old-approval");
  assert.equal(approved.status, "approved");
});

const covered = (...dates: string[]) => dates.map(date => ({ date, type: "annual_leave" as const }));

test("only fresh worker-confirmed dates can be approved, with exact day charges and overlap", options, async t => {
  const f = await fixture(t);
  const request = await f.reserve.submit(f.worker, firstRange, "confirm-then-approve", "submit");
  const service = f.reserve;
  await assert.rejects(service.approveConfirmedCoveredDates(f.manager, request.requestId, "1", "without-confirmation"),
    { code: "CONFLICT" });
  const selection = covered("2030-01-07", "2030-01-08", "2030-01-10");
  await assert.rejects(service.confirmCoveredDates(f.worker, request.requestId, "1",
    [...selection, { date: "2030-01-11", type: "paid_leave" } as unknown as typeof selection[number]], "mixed"),
    { code: "VALIDATION_FAILED" });
  await assert.rejects(service.confirmCoveredDates(f.worker, request.requestId, "1",
    covered("2030-01-07", "2030-01-08", "2030-01-09", "2030-01-10", "2030-01-11", "2030-01-14"), "over-fund"),
    { code: "CONFLICT" });
  const confirmed = await service.confirmCoveredDates(f.worker, request.requestId, "1", selection, "confirm");
  const selected = covered("2030-01-07", "2030-01-08", "2030-01-11");
  const revised = await service.confirmCoveredDates(f.worker, request.requestId, confirmed.revision, selected, "new-confirm");
  await assert.rejects(service.approveConfirmedCoveredDates(f.manager, request.requestId, confirmed.revision, "old"),
    { code: "STALE_REVISION" });
  await assert.rejects(service.approveConfirmedCoveredDates({ ...f.manager, departmentIds: [] }, request.requestId, revised.revision, "outside"),
    { code: "FORBIDDEN" });
  await assert.rejects(service.approveConfirmedCoveredDates(f.other.admin, request.requestId, revised.revision, "foreign"),
    { code: "NOT_FOUND" });
  const approval = await service.approveConfirmedCoveredDates(f.manager, request.requestId, revised.revision, "approved");
  assert.deepEqual(approval.dates, selected);
  assert.equal(approval.revision, "4");
  const rows = await f.owner.query("SELECT absence_date::text AS date, approved_revision::text AS revision FROM annual_leave_decision_dates WHERE request_id=$1 AND approved_revision IS NOT NULL ORDER BY absence_date", [request.requestId]);
  assert.deepEqual(rows.rows, selected.map(x=>({ date:x.date, revision:"4" })));
  assert.equal((await f.owner.query("SELECT count(*) FROM annual_leave_decision_dates WHERE request_id=$1", [request.requestId])).rows[0].count, "6");
  await assert.rejects(service.approveConfirmedCoveredDates(f.admin, request.requestId, approval.revision, "repeat"),
    { code: "STALE_REVISION" });
  await assert.rejects(service.submit(f.worker, { startDate:"2030-01-07", endDate:"2030-01-07" }, "overlapping-day", "duplicate-date"),
    { code: "CONFLICT" });
  const rest = await service.submit(f.worker, { startDate:"2030-01-09", endDate:"2030-01-10" }, "previously-unselected", "remaining");
  assert.deepEqual(rest.years, [{ year: 2030, requestedDays: 2, reservedDays: 2 }]);
});

test("a finalized month blocks a whole cross-year decision without modifying its snapshot", options, async t => {
  const f = await fixture(t);
  const oldDecember = await f.legacy.createLeaveRequest(f.worker,
    { typeCode:"annual_leave", startDate:"2030-12-23", endDate:"2030-12-25" }, "old-december");
  await f.legacy.approveLeaveRequest(f.admin, oldDecember.id, oldDecember.revision, undefined, "old-approved");
  await f.legacy.createLeaveRequest(f.worker, { typeCode:"annual_leave", startDate:"2031-01-06", endDate:"2031-01-07" }, "old-january");
  const request = await f.reserve.submit(f.worker, { startDate:"2030-12-26", endDate:"2031-01-03" }, "locked-cross-year", "cross-year");
  assert.deepEqual(request.years.map(year=>year.reservedDays), [2,3]);
  const selected = covered("2030-12-26", "2030-12-31", "2031-01-01", "2031-01-02", "2031-01-03");
  const confirmed = await f.reserve.confirmCoveredDates(f.worker, request.requestId, request.revision, selected, "confirmed");
  const review = await f.legacy.startAttendancePeriodReview(f.admin, 2030, 12, { reason:"Synthetic review" }, "0", "review-december", "review");
  const finalized = await f.legacy.finalizeAttendancePeriod(f.admin, 2030, 12, { reason:"Synthetic finalization" }, review.revision, "finalize-december", "finalize");
  const snapshot = async () => (await f.owner.query(
    "SELECT dataset_checksum_sha256, dataset_snapshot FROM attendance_period_versions WHERE id=$1", [finalized.datasetVersion]
  )).rows[0];
  const before = await snapshot();
  await assert.rejects(f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirmed.revision, "locked"),
    { code:"CONFLICT" });
  assert.equal((await f.owner.query("SELECT count(*) FROM annual_leave_decision_dates WHERE approved_revision IS NOT NULL")).rows[0].count, "0");
  await f.legacy.reopenAttendancePeriod(f.admin, 2030, 12, { reason:"Synthetic earlier decision" }, finalized.revision, "reopen-december", "reopen");
  const approved = await f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirmed.revision, "approve");
  assert.deepEqual(approved.dates, selected);
  assert.deepEqual(await snapshot(), before);
});

test("a competing cancellation leaves either an approval with its dates or a cancellation with no charge", options, async t => {
  const f = await fixture(t);
  const request = await f.reserve.submit(f.worker, firstRange, "approve-cancel-race", "submit");
  const confirmed = await f.reserve.confirmCoveredDates(f.worker, request.requestId, "1", covered("2030-01-07"), "confirm");
  const results = await Promise.allSettled([
    f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirmed.revision, "approve"),
    f.legacy.cancelOwnLeaveRequest(f.worker, request.requestId, confirmed.revision, "cancel")
  ]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length, 1);
  assert.ok(results.some(x=>x.status==="rejected" && x.reason.code==="STALE_REVISION"));
  const result = (await f.owner.query(
    "SELECT status,(SELECT COUNT(*)::int FROM annual_leave_decision_dates WHERE request_id=l.id AND approved_revision IS NOT NULL) AS charged FROM leave_requests l WHERE l.id=$1",
    [request.requestId]
  )).rows[0];
  assert.equal(result.charged, result.status==="approved" ? 1 : 0);
});

test("date decisions enforce tenant isolation and preserve confirmed history on rollback", options, async t => {
  const f = await fixture(t);
  const request = await f.reserve.submit(f.worker, firstRange, "protect-date-history", "submit");
  await f.reserve.confirmCoveredDates(f.worker, request.requestId, "1", covered("2030-01-07"), "confirm");
  const foreign = await withTenant(f.appPool, f.other.worker, "tenant", c=>c.query("SELECT 1 FROM annual_leave_decision_dates"));
  assert.equal(foreign.rowCount, 0);
  await f.owner.query("BEGIN");
  try {
    await assert.rejects(f.owner.query(await readFile(decisionDown,"utf8")), /Preserve confirmed annual leave dates/);
  } finally {
    await f.owner.query("ROLLBACK");
  }
  assert.equal((await f.owner.query("SELECT count(*) FROM annual_leave_decision_dates")).rows[0].count, "1");
});

test("retroactive confirmed dates in REVIEW wait until the period is OPEN", options, async t => {
  const f = await fixture(t);
  const past = { startDate:"2022-01-03", endDate:"2022-01-04" };
  const request = await f.reserve.submit(f.worker, past, "review-past-dates", "submit");
  const confirm = await f.reserve.confirmCoveredDates(f.worker, request.requestId, "1", covered(past.startDate), "confirm");
  await f.legacy.startAttendancePeriodReview(f.admin, 2022, 1, { reason:"Synthetic retroactive review" }, "0", "past-review", "review");
  await assert.rejects(f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirm.revision, "blocked"), /retroaktivno odobrenje/);
  assert.equal((await f.owner.query("SELECT status FROM leave_requests WHERE id=$1", [request.requestId])).rows[0].status, "pending");
});

test("an audit failure rolls back approval and its exact date charges", options, async t => {
  const f = await fixture(t);
  const request = await f.reserve.submit(f.worker, firstRange, "approval-audit-rollback", "submit");
  const confirm = await f.reserve.confirmCoveredDates(f.worker, request.requestId, "1", covered("2030-01-07"), "confirm");
  await f.owner.query(`REVOKE INSERT ON audit_events FROM ${f.role}`);
  await assert.rejects(f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirm.revision, "no-audit"), {code:"42501"});
  const persisted = (await f.owner.query(
    "SELECT l.status,l.revision::text,d.approved_revision FROM leave_requests l JOIN annual_leave_decision_dates d ON d.request_id=l.id WHERE l.id=$1",
    [request.requestId]
  )).rows[0];
  assert.deepEqual(persisted,{status:"pending",revision:confirm.revision,approved_revision:null});
});
