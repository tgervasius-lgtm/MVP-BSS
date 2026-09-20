import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext } from "../../src/domain/types.js";
import { PgPhaseAService } from "../../src/services/pg-phase-a-service.js";
import { createPostgresFixture } from "../helpers/postgres-fixture.js";

const databaseUrl = process.env.BSS_TEST_DATABASE_URL;
const required = process.env.BSS_REQUIRE_POSTGRES_TESTS === "true";

// Delay a real transaction immediately after BEGIN. All SQL, locks, commits,
// rollbacks and service calls remain real; only the scheduling is controlled.
function pauseAfterBegin(pool: pg.Pool) {
  let signalStarted!: () => void;
  let resume!: () => void;
  let startedAt = "";
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  const released = new Promise<void>((resolve) => { resume = resolve; });
  const gatedPool = new Proxy(pool, {
    get(target, property) {
      if (property !== "connect") return Reflect.get(target, property);
      return async () => {
        const client = await target.connect();
        return new Proxy(client, {
          get(connection, key) {
            if (key === "query") return async (sql: string, values?: unknown[]) => {
              const result = await connection.query(sql, values);
              if (sql === "BEGIN") {
                const timing = await connection.query<{ started: string }>("SELECT transaction_timestamp()::text AS started");
                startedAt = timing.rows[0]!.started;
                signalStarted();
                await released;
              }
              return result;
            };
            const value = Reflect.get(connection, key);
            return typeof value === "function" ? value.bind(connection) : value;
          }
        });
      };
    }
  });
  return { pool: gatedPool, started, resume, startedAt: () => startedAt };
}

test("RFID assignments follow lock order when transaction start order is reversed", {
  skip: !databaseUrl && !required, timeout: 60_000
}, async (t) => {
  assert.ok(databaseUrl, "BSS_TEST_DATABASE_URL is required");
  const fixture = await createPostgresFixture(databaseUrl, "rfid_order");
  t.after(fixture.dispose);
  const { owner, appPool, role } = fixture;
  await migrateUp(owner);
  await owner.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await owner.query(`GRANT SELECT ON workers, rfid_cards TO ${role}`);
  await owner.query(`GRANT UPDATE ON workers TO ${role}`);
  await owner.query(`GRANT INSERT, UPDATE ON rfid_cards TO ${role}`);
  await owner.query(`GRANT INSERT ON audit_events TO ${role}`);
  const organization = (await owner.query("INSERT INTO organizations(name) VALUES ('RFID ordering fixture') RETURNING id")).rows[0]!.id as string;
  const department = (await owner.query("INSERT INTO departments(organization_id, name) VALUES ($1, 'Ordering') RETURNING id", [organization])).rows[0]!.id;
  const shift = (await owner.query(`INSERT INTO shifts(organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
    VALUES ($1, 'Ordering shift', '08:00', '16:00', 0, 0) RETURNING id`, [organization])).rows[0]!.id;
  const worker = (await owner.query(`INSERT INTO workers(organization_id, code, name, department_id, shift_id)
    VALUES ($1, 'ordering-worker', 'Ordering Worker', $2, $3) RETURNING id`, [organization, department, shift])).rows[0]!.id as string;
  const user = (await owner.query(`INSERT INTO users(organization_id, email, role)
    VALUES ($1, 'ordering@example.test', 'admin') RETURNING id`, [organization])).rows[0]!.id as string;
  const actor: ActorContext = { organizationId: organization, userId: user, role: "admin",
    departmentIds: [], selfWorkerId: null, sessionId: "rfid-order-session" };
  const pepper = "rfid-order-test-pepper-0123456789abcdef";
  const service = new PgPhaseAService(appPool, pepper);
  const gate = pauseAfterBegin(appPool);
  const delayedService = new PgPhaseAService(gate.pool, pepper);
  const older = delayedService.assignWorkerRfidCard(actor, worker, { uid: "04:AA:01" }, "older-start-later-lock")
    .then((value) => ({ status: "fulfilled" as const, value }), (reason: unknown) => ({ status: "rejected" as const, reason }));
  let earlierCard: Awaited<ReturnType<typeof service.assignWorkerRfidCard>>;
  try {
    await Promise.race([gate.started, older.then(() => { throw new Error("Assignment exited before BEGIN gate"); })]);
    await owner.query("SELECT pg_sleep(0.02)");
    earlierCard = await service.assignWorkerRfidCard(actor, worker, { uid: "04:AA:02" }, "newer-start-earlier-lock");
  } finally {
    gate.resume();
    await older;
  }
  const result = await older;
  t.diagnostic(`Older transaction began at ${gate.startedAt()}; earlier lock winner activated at ${earlierCard.validFrom}`);
  assert.equal(result.status, "fulfilled", result.status === "rejected" ? String(result.reason) : undefined);
  const windows = await owner.query<{ id: string; status: string; valid_from: string; valid_to: string | null }>(
    "SELECT id, status, valid_from::text, valid_to::text FROM rfid_cards ORDER BY valid_from, id");
  assert.equal(windows.rows.length, 2);
  const previous = windows.rows.find((row) => row.id === earlierCard.id)!;
  const current = windows.rows.find((row) => row.id === result.value.id)!;
  assert.equal(previous.status, "blocked");
  assert.equal(current.status, "active");
  assert.equal(previous.valid_to, current.valid_from, "replacement must have one shared boundary without gaps");
  assert.equal(current.valid_to, null);
  assert.equal((await owner.query("SELECT id FROM audit_events WHERE action = 'rfid_card.assign'")).rowCount, 2);
});
