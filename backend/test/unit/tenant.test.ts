import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";
import { withTenant } from "../../src/db/tenant.js";

const actor = { organizationId: "org", userId: "user", role: "admin" as const };

test("withTenant preserves the operation error after a successful rollback", async () => {
  const original = new Error("operation failed");
  const queries: string[] = [];
  let releasedWith: boolean | undefined;
  const client = {
    query: async (sql: string) => { queries.push(sql); return { rows: [], rowCount: 0 }; },
    release: (destroy?: boolean) => { releasedWith = destroy; }
  };
  const pool = { connect: async () => client } as unknown as pg.Pool;

  await assert.rejects(withTenant(pool, actor, "request", async () => { throw original; }), (error) => error === original);
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.equal(releasedWith, false);
});

test("withTenant discards a client when rollback also fails", async () => {
  const original = new Error("operation failed");
  const rollback = new Error("rollback failed");
  let releasedWith: boolean | undefined;
  const client = {
    query: async (sql: string) => {
      if (sql === "ROLLBACK") throw rollback;
      return { rows: [], rowCount: 0 };
    },
    release: (destroy?: boolean) => { releasedWith = destroy; }
  };
  const pool = { connect: async () => client } as unknown as pg.Pool;

  await assert.rejects(
    withTenant(pool, actor, "request", async () => { throw original; }),
    (error) => error instanceof AggregateError && error.errors[0] === original && error.errors[1] === rollback
  );
  assert.equal(releasedWith, true);
});
