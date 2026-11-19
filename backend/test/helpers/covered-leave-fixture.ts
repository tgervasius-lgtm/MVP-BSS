import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext } from "../../src/domain/types.js";
import { PgAnnualLeaveReservationService } from "../../src/services/pg-annual-leave-reservation-service.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";
import { createPostgresFixture } from "./postgres-fixture.js";

export async function coveredLeaveFixture(url: string, coveredDateReads = false) {
  const f = await createPostgresFixture(url, "leave_fund");
  try {
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
  } catch (error) {
    await f.dispose();
    throw error;
  }
}
