import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext } from "../../src/domain/types.js";
import { digest, type ImportSession, type ImportWorker } from "../../src/imports/model.js";
import { PgWorkerImportStore } from "../../src/imports/pg-worker-import-store.js";
import { createPostgresFixture } from "./postgres-fixture.js";

export async function importFixture(databaseUrl: string) {
  const fixture = await createPostgresFixture(databaseUrl, "import", 5);
  try {
    const { owner, role, appPool } = fixture;
    await migrateUp(owner);
    await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await owner.query(`GRANT SELECT ON departments, shifts, workers, audit_events, worker_department_assignments,
      worker_shift_assignments, worker_status_versions, worker_import_sessions, worker_import_staging,
      worker_import_commits, worker_import_commit_workers TO ${role}`);
    await owner.query(`GRANT INSERT ON workers, audit_events, worker_import_sessions, worker_import_staging,
      worker_import_commits, worker_import_commit_workers TO ${role}`);
    await owner.query(`GRANT UPDATE ON departments, shifts, worker_import_sessions, worker_import_staging TO ${role}`);
    await owner.query(`GRANT DELETE ON worker_import_sessions, worker_import_staging TO ${role}`);
    const organizations: Array<{ actor: ActorContext; department: string; shift: string }> = [];
    for (let i = 0; i < 2; i++) {
      const org = (await owner.query<{ id: string }>("INSERT INTO organizations(name) VALUES ('Import fixture') RETURNING id")).rows[0]!.id;
      const admin = (await owner.query<{ id: string }>("INSERT INTO users(organization_id,email,role) VALUES ($1,$2,'admin') RETURNING id",
        [org, `${randomUUID()}@example.invalid`])).rows[0]!.id;
      const dep = (await owner.query<{ id: string }>("INSERT INTO departments(organization_id,name) VALUES ($1,'Department') RETURNING id", [org])).rows[0]!.id;
      const shift = (await owner.query<{ id: string }>(`INSERT INTO shifts(organization_id,name,start_time,end_time,break_minutes,tolerance_minutes)
        VALUES ($1,'Day','08:00','16:00',30,5) RETURNING id`, [org])).rows[0]!.id;
      organizations.push({ actor: { organizationId: org, userId: admin, role: "admin", departmentIds: [],
        selfWorkerId: null, sessionId: randomUUID() }, department: dep, shift });
    }
    const first = organizations[0]!; const other = organizations[1]!;
    const store = new PgWorkerImportStore(appPool);
    function worker(code: string, changes: Partial<ImportWorker> = {}): ImportWorker {
      return { code, name: `Synthetic ${code}`, email: null, departmentId: first.department,
        shiftId: first.shift, annualLeaveAllowance: 0, ...changes };
    }
    async function prepare(rows: ImportWorker[], key = randomUUID()) {
      return (await store.prepare(first.actor, { fileChecksum: digest(rows), parserVersion: "synthetic-fixture-v1", rows }, key, "prepare-test")).session;
    }
    function commit(session: ImportSession, key = randomUUID()) {
      assert.ok(session.previewChecksum);
      return store.commit(first.actor, session.id, session.revision,
        { approved: true, previewChecksum: session.previewChecksum }, key, "commit-test");
    }
    async function count(table: "workers" | "worker_import_staging" | "worker_import_commits" | "worker_import_commit_workers") {
      return Number((await owner.query<{ count: string }>(`SELECT count(*)::text FROM ${table}`)).rows[0]!.count);
    }
    // Fixture-only clock travel. Runtime cannot change either timestamp; these
    // owner DDL changes run in a transaction and are never granted to appPool.
    async function age(id: string, interval: "25 hours" | "32 days", terminal = false) {
      await owner.query("BEGIN");
      try {
        await owner.query("ALTER TABLE worker_import_sessions DISABLE TRIGGER worker_import_session_identity");
        await owner.query(`UPDATE worker_import_sessions SET created_at = created_at - $2::interval,
          expires_at = expires_at - $2::interval, terminal_at = CASE WHEN $3 THEN terminal_at - $2::interval ELSE terminal_at END
          WHERE id = $1`, [id, interval, terminal]);
        await owner.query("ALTER TABLE worker_import_sessions ENABLE TRIGGER worker_import_session_identity");
        await owner.query("COMMIT");
      } catch (error) { await owner.query("ROLLBACK"); throw error; }
    }
    return { ...fixture, first, other, store, worker, prepare, commit, count, age };
  } catch (error) { await fixture.dispose(); throw error; }
}
