import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import { withTenant } from "../../src/db/tenant.js";
import type { ActorContext } from "../../src/domain/types.js";
import { PgAnnualLeaveReservationService } from "../../src/services/pg-annual-leave-reservation-service.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";
import { createHash } from "node:crypto";
import { loadConfig } from "../../src/config.js";
import { buildApp } from "../../src/http/app.js";
import { FakeAuthService } from "../helpers/fakes.js";
import { AppError } from "../../src/domain/errors.js";

const url = process.env.BSS_TEST_DATABASE_URL;
const options = { skip: !url && process.env.BSS_REQUIRE_POSTGRES_TESTS !== "true" };
const firstRange = { startDate: "2030-01-07", endDate: "2030-01-15" };
const secondRange = { startDate: "2030-01-21", endDate: "2030-01-29" };
const down = new URL("../../migrations/020_annual_leave_reservations.down.sql", import.meta.url);
const decisionDown = new URL("../../migrations/021_annual_leave_decision_dates.down.sql", import.meta.url);

async function fixture(t: test.TestContext, coveredDateReads = false) {
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
  }, coveredDateReads);
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
  const f = await fixture(t, true);
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
  const dec = (await f.legacy.listLeaveBalances(f.worker, { year:2030, limit:10 })).items[0]!;
  const jan = (await f.legacy.listLeaveBalances(f.worker, { year:2031, limit:10 })).items[0]!;
  assert.deepEqual([dec.approvedDays,dec.plannedDays,dec.availableDays],[5,0,0]);
  assert.deepEqual([jan.approvedDays,jan.plannedDays,jan.availableDays],[3,2,0]);
  const january = await f.legacy.listApprovedLeaveCalendar(f.manager, {from:"2031-01-01",to:"2031-01-31"});
  assert.deepEqual(january.items.map(({startDate,endDate})=>[startDate,endDate]),[["2031-01-01","2031-01-03"]]);
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

test("BSS OS #308 five approved dates across the balance, calendar, reports, snapshots and exports", options, async t => {
  const f = await fixture(t, true);
  await f.owner.query(`GRANT INSERT ON report_exports TO ${f.role}`);
  const seats = new Map([
    ["admin", f.admin], ["manager", f.manager], ["other", f.other.admin],
    ["outside", { ...f.manager, departmentIds: [] }], ["worker", f.worker]
  ]);
  class FixtureAuth extends FakeAuthService {
    override async resolveAccessToken(token: string) {
      const actor = seats.get(token);
      if (!actor) throw new AppError("UNAUTHENTICATED", "synthetic session required");
      const { context } = await super.resolveAccessToken(actor.role);
      return { actor, context };
    }
  }
  const app = await buildApp({
    config: loadConfig({ NODE_ENV:"test", PUBLIC_ORIGIN:"https://bss.test", DATABASE_URL:url, LOG_LEVEL:"silent" }),
    authService: new FixtureAuth(), phaseAService: f.legacy, logger:false
  });
  t.after(() => app.close());
  async function read(path:string, actor="admin") {
    const res = await app.inject({method:"GET",url:path,cookies:{bss_session:actor}});
    assert.equal(res.statusCode,200,res.body);
    return res;
  }
  async function post(path:string, body:object, status:number, rev?:string) {
    const res = await app.inject({method:"POST",url:path,cookies:{bss_session:"admin"},payload:body,
      headers:{origin:"https://bss.test", ...(rev === undefined ? {} : {"if-match":rev,"idempotency-key":randomUUID()})}});
    assert.equal(res.statusCode,status,res.body);
    return res.json();
  }
  const month="/api/v1/attendance-periods/2030/1";
  async function finalize() {
    const open=(await read(month)).json();
    const review=await post(month+"/review",{reason:"Ogledna provjera godišnjeg odmora"},200,open.revision);
    return post(month+"/finalize",{reason:"Ogledno zaključavanje godišnjeg odmora"},200,review.revision);
  }
  const filter={reportType:"approved_absences",periodFrom:"2030-01-01",periodTo:"2030-01-31"};
  const exportsPath="/api/v1/report-exports";
  const calendarPath="/api/v1/approved-leave-calendar?from=2030-01-01&to=2030-01-31";
  const balancePath="/api/v1/leave-balances?year=2030";
  const oldLegacy=await f.legacy.createLeaveRequest(f.worker,
    { typeCode:"annual_leave",startDate:"2029-12-17",endDate:"2029-12-18" },"legacy-december");
  await f.legacy.approveLeaveRequest(f.manager,oldLegacy.id,oldLegacy.revision,undefined,"legacy-approve");
  const oldView=(await read("/api/v1/approved-leave-calendar?from=2029-12-01&to=2029-12-31","manager")).json();
  assert.deepEqual(oldView.items.map((i:any)=>[i.startDate,i.endDate]),[["2029-12-17","2029-12-18"]]);
  const v1=await finalize();
  const earlier=await post(exportsPath,{...filter,format:"csv",periodVersionId:v1.datasetVersion},202);
  const old=(await read(exportsPath+"/"+earlier.id+"/download")).rawPayload;
  const changed=await post(month+"/reopen",{reason:"Ogledno ponovno otvaranje"},200,v1.revision);
  assert.ok(changed.revision);
  const request=await f.reserve.submit(f.worker,firstRange,"proof-five-dates","proof-submit");
  const pending=(await read(balancePath,"worker")).json().items[0];
  assert.deepEqual(request.years,[{year:2030,requestedDays:7,reservedDays:5}]);
  assert.equal(pending.plannedDays,5);
  const selected=covered("2030-01-07","2030-01-08","2030-01-10","2030-01-11","2030-01-15");
  const confirmed=await f.reserve.confirmCoveredDates(f.worker,request.requestId,request.revision,selected,"proof-confirm");
  const approval=await f.reserve.approveConfirmedCoveredDates(f.manager,request.requestId,confirmed.revision,"proof-approve");
  assert.deepEqual(approval.dates,selected);
  const stored=(await f.owner.query("SELECT absence_date::text AS day FROM annual_leave_decision_dates WHERE request_id=$1 AND approved_revision IS NOT NULL ORDER BY absence_date",[request.requestId])).rows;
  assert.deepEqual(stored.map(i=>i.day),selected.map(i=>i.date));
  const balance=(await read(balancePath,"worker")).json().items[0];
  const expectedSaldo={approved:5,planned:0,remaining:0,available:0};
  const actualSaldo={approved:balance.approvedDays,planned:balance.plannedDays,remaining:balance.remainingDays,available:balance.availableDays};
  assert.deepEqual(actualSaldo,expectedSaldo);
  const expectedRanges = [
    ["2030-01-07","2030-01-08",2], ["2030-01-10","2030-01-11",2], ["2030-01-15","2030-01-15",1]
  ];
  const rows=(await read(calendarPath,"manager")).json().items;
  assert.deepEqual(rows.map((i:any)=>[i.startDate,i.endDate]),expectedRanges.map(row=>row.slice(0,2)));
  const clipped=(await read("/api/v1/approved-leave-calendar?from=2030-01-08&to=2030-01-08","manager")).json().items;
  assert.deepEqual(clipped.map((i:any)=>[i.id,i.startDate,i.endDate]),[[rows[0].id,"2030-01-08","2030-01-08"]]);
  const gap=(await read("/api/v1/approved-leave-calendar?from=2030-01-09&to=2030-01-09","manager")).json().items;
  assert.deepEqual(gap,[]);
  await t.test("approved leave calendar preserves dates with a local-midnight DATE parser", async scope => {
    const originalDateParser = pg.types.getTypeParser(1082, "text");
    scope.after(() => pg.types.setTypeParser(1082, "text", originalDateParser));
    pg.types.setTypeParser(1082, "text", value => new Date(value + "T00:00:00+02:00"));

    const legacy = (await read("/api/v1/approved-leave-calendar?from=2029-12-01&to=2029-12-31", "manager")).json().items;
    assert.deepEqual(legacy, oldView.items);
    const covered = (await read(calendarPath, "manager")).json().items;
    assert.deepEqual(covered, rows);
  });
  for(const who of ["outside","other"])assert.deepEqual((await read(calendarPath,who)).json().items,[]);
  const live=await post("/api/v1/report-previews",{...filter,limit:10},200);
  assert.deepEqual(live.rows.map((i:any)=>[i.startDate,i.endDate,i.workingDays]),expectedRanges);
  const clippedLive=await post("/api/v1/report-previews",{...filter,periodFrom:"2030-01-08",periodTo:"2030-01-08",limit:10},200);
  assert.deepEqual(clippedLive.rows.map((i:any)=>[i.startDate,i.endDate,i.workingDays]),[["2030-01-08","2030-01-08",1]]);
  const v2=await finalize();
  assert.notEqual(v2.datasetVersion,v1.datasetVersion);
  const snapshot=(await f.owner.query("SELECT dataset_snapshot FROM attendance_period_versions WHERE id=$1",[v2.datasetVersion])).rows[0].dataset_snapshot;
  assert.deepEqual(snapshot.approvedAbsences.map((i:any)=>[i.startDate,i.endDate,i.workingDays]),expectedRanges);
  const later=await post(exportsPath,{...filter,format:"csv",periodVersionId:v2.datasetVersion},202);
  const latest=(await read(exportsPath+"/"+later.id+"/download")).rawPayload.toString("utf8");
  const csvRows=latest.split(String.fromCharCode(10)).filter(line=>line.includes("Synthetic Worker"));
  assert.equal(csvRows.length,expectedRanges.length);
  for (const [index,[from,to,days]] of expectedRanges.entries()) {
    const normalized=csvRows[index]!.replaceAll('"',"").split(";");
    assert.ok(normalized.includes(String(from)) && normalized.includes(String(to))
      && normalized[normalized.indexOf(String(to),normalized.indexOf(String(from))+1)+1]===String(days),csvRows[index]);
  }
  const oldAgain=(await read(exportsPath+"/"+earlier.id+"/download")).rawPayload;
  const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
  assert.deepEqual(oldAgain,old);
  assert.equal(sha(oldAgain),earlier.checksumSha256);
  assert.equal((await read(exportsPath+"/"+earlier.id+"/verification")).json().verified,true);
  console.log("BSS308_CANDIDATE_PASS "+JSON.stringify({actualSaldo,expectedSaldo,pendingPlanned:pending.plannedDays,
    stored:stored.map(i=>i.day),calendar:rows.map((i:any)=>[i.startDate,i.endDate]),snapshotRows:snapshot.approvedAbsences.length,
    V2WorkingDays:snapshot.approvedAbsences.map((i:any)=>i.workingDays),oldExportSha256:sha(oldAgain)}));
});

test("covered reads let the existing HTTP route request only unapproved dates within allowance", options, async t => {
  const f = await fixture(t, true);
  const request = await f.reserve.submit(f.worker, firstRange, "free-dates-request", "submit");
  const dates = covered("2030-01-07", "2030-01-08", "2030-01-10", "2030-01-11", "2030-01-15");
  const confirmation = await f.reserve.confirmCoveredDates(f.worker, request.requestId, request.revision, dates, "confirm");
  await f.reserve.approveConfirmedCoveredDates(f.manager, request.requestId, confirmation.revision, "approve");
  class WorkerAuth extends FakeAuthService {
    override async resolveAccessToken(token: string) {
      const actor = token === "manager" ? f.manager : f.worker;
      const { context } = await super.resolveAccessToken(actor.role);
      return { actor, context };
    }
  }
  const app = await buildApp({
    config: loadConfig({ NODE_ENV: "test", PUBLIC_ORIGIN: "https://bss.test", DATABASE_URL: url, LOG_LEVEL: "silent" }),
    authService: new WorkerAuth(), phaseAService: f.legacy, logger: false
  });
  t.after(() => app.close());
  const submit = (day: string, actor = "worker") => app.inject({
    method: "POST", url: "/api/v1/leave-requests", cookies: { bss_session: actor },
    headers: { origin: "https://bss.test" }, payload: { typeCode: "annual_leave", startDate: day, endDate: day }
  });
  assert.equal((await submit("2030-01-09")).statusCode, 422);
  await f.owner.query("UPDATE workers SET annual_leave_allowance = 6 WHERE id = $1", [f.worker.selfWorkerId]);
  const racing = await Promise.all([submit("2030-01-09"), submit("2030-01-14")]);
  assert.deepEqual(racing.map(response => response.statusCode).sort(), [201, 422]);
  await f.owner.query("UPDATE workers SET annual_leave_allowance = 7 WHERE id = $1", [f.worker.selfWorkerId]);
  const remaining = racing[0]!.statusCode === 422 ? "2030-01-09" : "2030-01-14";
  const second = await submit(remaining);
  assert.equal(second.statusCode, 201, second.body);
  assert.equal((await submit("2030-01-09")).statusCode, 409);
  assert.equal((await submit("2030-01-10")).statusCode, 409);
  assert.equal((await submit("2030-01-21")).statusCode, 422);
  assert.equal((await submit("2030-01-22", "manager")).statusCode, 403);
  const balance = await f.legacy.listLeaveBalances(f.worker, { year: 2030, limit: 20 });
  assert.deepEqual(balance.items.map(item => [item.approvedDays, item.plannedDays, item.availableDays]), [[5, 2, 0]]);
  const original = await f.owner.query("SELECT status FROM leave_requests WHERE id = $1", [request.requestId]);
  assert.equal(original.rows[0].status, "approved");
});

test("approved leave calendars preserve manager department scope under both visibility settings", options, async t => {
  for (const coveredDateReads of [false, true]) {
    await t.test(coveredDateReads ? "covered dates" : "legacy dates", async scope => {
      const f = await fixture(scope, coveredDateReads);
      const { rows: [outside] } = await f.owner.query<{ worker: string; user: string }>(`WITH
        d AS (INSERT INTO departments(organization_id, name) VALUES ($1, 'Outside') RETURNING id),
        w AS (INSERT INTO workers(organization_id, code, name, department_id, shift_id, annual_leave_allowance)
          SELECT $1, '6', 'Outside Worker', d.id, own.shift_id, 5 FROM d, workers own WHERE own.id = $2 RETURNING id),
        u AS (INSERT INTO users(organization_id, email, role, worker_id)
          SELECT $1, 'outside@example.test', 'worker', id FROM w RETURNING id)
        SELECT w.id AS worker, u.id AS user FROM w,u`, [f.worker.organizationId, f.worker.selfWorkerId]);
      assert.ok(outside);
      const outsideWorker: ActorContext = { ...f.worker, userId: outside.user, selfWorkerId: outside.worker };
      const day = { startDate: "2030-01-07", endDate: "2030-01-07" };
      for (const [index, worker] of [f.worker, outsideWorker].entries()) {
        if (coveredDateReads) {
          const request = await f.reserve.submit(worker, day, `calendar-scope-${index}`, "submit");
          const confirmation = await f.reserve.confirmCoveredDates(worker, request.requestId, request.revision, covered(day.startDate), "confirm");
          await f.reserve.approveConfirmedCoveredDates(f.admin, request.requestId, confirmation.revision, "approve");
        } else {
          const request = await f.legacy.createLeaveRequest(worker, { typeCode: "annual_leave", ...day }, "submit");
          await f.legacy.approveLeaveRequest(f.admin, request.id, request.revision, undefined, "approve");
        }
      }
      const filters = { from: day.startDate, to: day.endDate };
      const names = async (actor: ActorContext) => (await f.legacy.listApprovedLeaveCalendar(actor, filters)).items
        .map(item => item.employeeName).sort();
      for (const visibility of ["department", "organization"]) {
        await f.owner.query("UPDATE organizations SET approved_leave_visibility = $1 WHERE id = $2", [visibility, f.worker.organizationId]);
        assert.deepEqual(await names(f.manager), ["Synthetic Worker"], `${visibility}: assigned manager`);
        assert.deepEqual(await names({ ...f.manager, departmentIds: [] }), [], `${visibility}: unassigned manager`);
        for (const role of ["admin", "accountant"] as const) {
          assert.deepEqual(await names({ ...f.admin, role }), ["Outside Worker", "Synthetic Worker"], `${visibility}: ${role}`);
        }
        assert.deepEqual(await names(f.worker), visibility === "organization"
          ? ["Outside Worker", "Synthetic Worker"] : ["Synthetic Worker"], `${visibility}: configured worker view`);
      }
    });
  }
});

test("decision rollback requires the exact non-superuser owner and preserves hidden confirmed history", options, async t => {
  for (const populated of [false, true]) {
    await t.test(populated ? "confirmed history" : "empty table", async scope => {
      const f = await fixture(scope);
      if (populated) {
        const request = await f.reserve.submit(f.worker, firstRange, "migration-history", "submit");
        await f.reserve.confirmCoveredDates(f.worker, request.requestId, request.revision, covered("2030-01-07"), "confirm");
      }
      const tableOwner = `bss_dates_owner_${f.suffix}`;
      const inheritor = `bss_dates_migrator_${f.suffix}`;
      const password = `synthetic-${f.suffix}`;
      const clients: pg.Client[] = [];
      const createdRoles: string[] = [];
      try {
        for (const role of [tableOwner, inheritor]) {
          await f.owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB`);
          createdRoles.push(role);
        }
        await f.owner.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${tableOwner};
          ALTER TABLE annual_leave_decision_dates OWNER TO ${tableOwner};
          REVOKE CREATE ON SCHEMA public FROM ${tableOwner};
          GRANT ${tableOwner} TO ${inheritor} WITH INHERIT TRUE, SET TRUE`);
        async function connect(role: string) {
          const connection = new URL(f.appUrl);
          connection.username = role;
          connection.password = password;
          const client = new pg.Client({ connectionString: connection.toString(), statement_timeout: 10_000 });
          clients.push(client);
          await client.connect();
          const identity = (await client.query("SELECT current_user AS name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")).rows[0];
          assert.deepEqual(identity, { name: role, rolsuper: false, rolbypassrls: false });
          assert.equal((await client.query("SELECT bss_current_organization_id() AS tenant")).rows[0].tenant, null);
          return client;
        }
        const migration = await connect(inheritor);
        assert.equal((await migration.query("SELECT count(*) FROM annual_leave_decision_dates")).rows[0].count, "0");
        const sql = await readFile(decisionDown, "utf8");
        await migration.query("BEGIN");
        try {
          await assert.rejects(migration.query(sql), { code: "42501" });
        } finally {
          await migration.query("ROLLBACK");
        }
        const history = async () => (await f.owner.query("SELECT count(*) FROM annual_leave_decision_dates")).rows[0].count;
        assert.equal(await history(), populated ? "1" : "0", "rejected identity must preserve the table and all rows");
        const directOwner = await connect(tableOwner);
        assert.equal((await directOwner.query("SELECT count(*) FROM annual_leave_decision_dates")).rows[0].count, populated ? "1" : "0");
        await directOwner.query("BEGIN");
        try {
          if (populated) {
            await assert.rejects(directOwner.query(sql), /Preserve confirmed annual leave dates/);
          } else {
            await directOwner.query(sql);
            assert.equal((await directOwner.query("SELECT to_regclass('public.annual_leave_decision_dates') AS relation")).rows[0].relation, null);
          }
        } finally {
          await directOwner.query("ROLLBACK");
        }
        assert.equal(await history(), populated ? "1" : "0");
      } finally {
        for (const client of clients) await client.end();
        for (const role of createdRoles.toReversed()) {
          await f.owner.query(`REASSIGN OWNED BY ${role} TO CURRENT_USER; DROP OWNED BY ${role}; DROP ROLE ${role}`);
        }
      }
    });
  }
});
