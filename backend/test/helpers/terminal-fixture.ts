// Disposable, synthetic bench only; never imported by the application server.
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../../src/config.js";
import { bootstrapOrganization } from "../../src/db/bootstrap.js";
import { migrateUp } from "../../src/db/migrate.js";
import type { ActorContext } from "../../src/domain/types.js";
import { buildApp } from "../../src/http/app.js";
import { hashRfidUid } from "../../src/security/rfid.js";
import { PgAuthService } from "../../src/services/pg-auth-service.js";
import { PgMvpService } from "../../src/services/pg-mvp-service.js";
import { createPostgresFixture } from "./postgres-fixture.js";

export async function terminalFixture(databaseUrl: string, port = 0, frontend = false) {
  const fixture = await createPostgresFixture(databaseUrl, "terminal");
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  try {
    const { owner, appPool, appUrl, role, databaseName } = fixture;
    await migrateUp(owner);
    const grants = await readFile(new URL("../../deploy/runtime-grants.sql", import.meta.url), "utf8");
    await owner.query(grants.slice(grants.indexOf("GRANT CONNECT"))
      .replaceAll(':"runtime_role"', role).replaceAll(":DBNAME", databaseName));
    const adminPassword = `Bench-${randomBytes(24).toString("hex")}`;
    const seeded = await bootstrapOrganization(owner, {
      BSS_BOOTSTRAP_ORGANIZATION_NAME: "BSS terminal test — sintetički podaci",
      BSS_BOOTSTRAP_ADMIN_EMAIL: `terminal-${fixture.suffix}@example.invalid`,
      BSS_BOOTSTRAP_ADMIN_PASSWORD: adminPassword
    });
    const actor: ActorContext = { organizationId: seeded.organizationId, userId: seeded.adminUserId,
      role: "admin", departmentIds: [], selfWorkerId: null, sessionId: randomUUID() };
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: appUrl.toString(), DATABASE_SSL: "false",
      PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, COOKIE_SECURE: "false",
      RFID_UID_PEPPER: randomBytes(32).toString("hex"), DEVICE_CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      TERMINAL_ACTIVATION_CODE: randomBytes(24).toString("hex"),
      ...(frontend ? { FRONTEND_ROOT: fileURLToPath(new URL("../../../dist", import.meta.url)) } : {}) });
    const auth = new PgAuthService(appPool, config);
    const service = new PgMvpService(appPool, config);
    const department = (await owner.query<{id: string}>("SELECT id FROM departments WHERE organization_id=$1", [actor.organizationId])).rows[0]!.id;
    const shift = (await owner.query<{id: string}>("SELECT id FROM shifts WHERE organization_id=$1", [actor.organizationId])).rows[0]!.id;
    const cards: Array<{hash: string; label: string}> = [];
    const workers = [];
    for (const [index, uid] of ["04112233", "04AABBCC"].entries()) {
      const worker = await service.createWorker(actor, { code: `T-${index + 1}`, name: `Testni radnik ${index + 1}`,
        departmentId: department, shiftId: shift, email: null, annualLeaveAllowance: 20 }, "terminal-bench-worker");
      await service.assignWorkerRfidCard(actor, worker.id, {uid}, "terminal-bench-card");
      cards.push({hash: hashRfidUid(uid, config.rfidUidPepper).toString("hex"), label: worker.name});
      workers.push(worker);
    }
    const paired = await service.pairTerminal(actor, {name: "Laptop simulator", location: "Testni stol",
      activationCode: config.terminalActivationCode}, "terminal-bench-pair");
    app = await buildApp({config, authService: auth, phaseAService: service, logger: false});
    const apiOrigin = await app.listen({host: "127.0.0.1", port});
    const agentConfig = {mode: "synthetic-bench", apiOrigin, terminalId: paired.terminal.id,
      deviceCredential: paired.deviceCredential, rfidPepper: config.rfidUidPepper,
      acknowledgementKeyId: paired.acknowledgementKey.id,
      acknowledgementKeyVersion: paired.acknowledgementKey.version, cards};
    return { ...fixture, app, service, actor, workers, agentConfig,
      login: {email: seeded.email, password: adminPassword},
      dispose: async () => { await app!.close(); await fixture.dispose(); } };
  } catch (error) {
    await app?.close();
    await fixture.dispose();
    throw error;
  }
}
