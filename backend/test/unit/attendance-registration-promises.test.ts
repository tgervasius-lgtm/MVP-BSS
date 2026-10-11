import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { ActorContext } from "../../src/domain/types.js";
import type { Authenticate } from "../../src/http/app.js";
import { registerAttendancePeriodRoutes } from "../../src/http/routes/attendance-periods.js";
import { FakePhaseAService, IDS } from "../helpers/fakes.js";

const actor: ActorContext = { organizationId: IDS.organization, userId: IDS.user,
  role: "admin", departmentIds: [], selfWorkerId: null, sessionId: "synthetic-session" };

test("attendance route registration still returns a Promise and captures registration failure", async () => {
  const failure = new Error("synthetic registration failure");
  const app = { get: () => { throw failure; } } as unknown as FastifyInstance;
  const result = registerAttendancePeriodRoutes(app, {
    mvpService: new FakePhaseAService(), authenticate: (() => { throw new Error("must not authenticate at registration"); }) as Authenticate
  });
  assert.ok(result instanceof Promise);
  await assert.rejects(result, (error) => error === failure);
});

test("fixture results evaluate immediately but expose throwing inputs as rejected Promises", async () => {
  const service = new FakePhaseAService();
  let read = false;
  const failure = new Error("synthetic fixture failure");
  const result = service.startAttendancePeriodReview(actor, 2026, 10, {
    get reason(): string { read = true; throw failure; }
  }, "0", "synthetic-key", "synthetic-request");
  assert.equal(read, true);
  assert.ok(result instanceof Promise);
  await assert.rejects(result, (error) => error === failure);
  assert.equal((await service.getAttendancePeriod(actor, 2026, 10)).status, "open");
});
