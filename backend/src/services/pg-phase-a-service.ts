import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext, EntityStatus, Page, Role } from "../domain/types.js";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { createOpaqueToken, hashToken } from "../security/tokens.js";
import type {
  DepartmentView,
  HolidayView,
  OrganizationView,
  PhaseAService,
  RfidCardView,
  ShiftView,
  ShiftWrite,
  UserView,
  WorkerView,
  WorkerWrite
} from "./contracts.js";

type OrganizationRow = {
  id: string;
  name: string;
  tax_identifier: string | null;
  timezone: string;
  revision: string | number;
};
type DepartmentRow = { id: string; name: string; status: EntityStatus; revision: string | number };
type HolidayRow = { id: string; holiday_date: string | Date; name: string; revision: string | number };
type UserRow = {
  id: string;
  email: string;
  role: Role;
  status: EntityStatus;
  worker_id: string | null;
  revision: string | number;
  department_ids: string[];
};
type WorkerRow = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  department_id: string;
  shift_id: string;
  status: EntityStatus;
  annual_leave_allowance: number;
  revision: string | number;
};
type ShiftRow = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  tolerance_minutes: number;
  assigned_worker_count: string | number;
  revision: string | number;
};
type RfidRow = {
  id: string;
  masked_uid: string;
  worker_id: string;
  status: EntityStatus;
  valid_from: Date | string;
  valid_to: Date | string | null;
  revision: string | number;
};

function organizationView(row: OrganizationRow): OrganizationView {
  const view: OrganizationView = {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    revision: String(row.revision)
  };
  if (row.tax_identifier) view.taxIdentifier = row.tax_identifier;
  return view;
}

function departmentView(row: DepartmentRow): DepartmentView {
  return { id: row.id, name: row.name, status: row.status, revision: String(row.revision) };
}

function holidayView(row: HolidayRow): HolidayView {
  const date = row.holiday_date instanceof Date ? row.holiday_date.toISOString().slice(0, 10) : String(row.holiday_date).slice(0, 10);
  return { id: row.id, date, name: row.name, revision: String(row.revision) };
}

function userView(row: UserRow): UserView {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    workerId: row.worker_id,
    departmentIds: row.department_ids ?? [],
    revision: String(row.revision)
  };
}

function workerView(row: WorkerRow): WorkerView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    departmentId: row.department_id,
    shiftId: row.shift_id,
    status: row.status,
    annualLeaveAllowance: row.annual_leave_allowance,
    revision: String(row.revision)
  };
}

function shiftView(row: ShiftRow): ShiftView {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    breakMinutes: row.break_minutes,
    toleranceMinutes: row.tolerance_minutes,
    assignedWorkerCount: Number(row.assigned_worker_count),
    revision: String(row.revision)
  };
}

function rfidView(row: RfidRow): RfidCardView {
  const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
  return {
    id: row.id,
    maskedUid: row.masked_uid,
    workerId: row.worker_id,
    status: row.status,
    validFrom: iso(row.valid_from),
    validTo: row.valid_to ? iso(row.valid_to) : null,
    revision: String(row.revision)
  };
}

function decodeCursor(cursor: string | undefined): string | null {
  if (!cursor) return null;
  try {
    const value = Buffer.from(cursor, "base64url").toString("utf8");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error();
    return value;
  } catch {
    throw new AppError("VALIDATION_FAILED", "Kursor stranice nije valjan.");
  }
}

function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64url");
}

function normalizeDatabaseError(error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "23505") throw new AppError("CONFLICT", "Zapis s istom jedinstvenom vrijednošću već postoji.");
  if (code === "23503" || code === "23514" || code === "22P02") {
    throw new AppError("VALIDATION_FAILED", "Povezani zapis ili vrijednost nisu valjani.");
  }
  throw error;
}

async function audit(
  client: TenantTransaction,
  actor: ActorContext,
  requestId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
       organization_id, actor_type, actor_id, actor_role, action, entity_type,
       entity_id, before_json, after_json, request_id, metadata
     ) VALUES ($1, 'user', $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb)`,
    [actor.organizationId, actor.userId, actor.role, action, entityType, entityId, before, after, requestId]
  );
}

const userSelect = `
  SELECT u.id, u.email, u.role, u.status, u.worker_id, u.revision,
         COALESCE(array_agg(s.department_id) FILTER (WHERE s.department_id IS NOT NULL), ARRAY[]::uuid[]) AS department_ids
  FROM users u
  LEFT JOIN user_department_scopes s
    ON s.organization_id = u.organization_id AND s.user_id = u.id`;

const shiftSelect = `
  SELECT s.id, s.name, s.start_time::text, s.end_time::text, s.break_minutes,
         s.tolerance_minutes, s.revision,
         COUNT(w.id) FILTER (WHERE w.status = 'active') AS assigned_worker_count
  FROM shifts s
  LEFT JOIN workers w ON w.organization_id = s.organization_id AND w.shift_id = s.id`;

export class PgPhaseAService implements PhaseAService {
  constructor(private readonly pool: pg.Pool) {}

  async getOrganization(actor: ActorContext): Promise<OrganizationView> {
    return withTenant(this.pool, actor, "read-organization", async (client) => {
      const result = await client.query<OrganizationRow>(
        "SELECT id, name, tax_identifier, timezone, revision FROM organizations WHERE id = $1",
        [actor.organizationId]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Organizacija nije pronađena.");
      return organizationView(row);
    });
  }

  async updateOrganization(
    actor: ActorContext,
    patch: Partial<Pick<OrganizationView, "name" | "taxIdentifier" | "timezone">>,
    revision: string,
    requestId: string
  ): Promise<OrganizationView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const before = await client.query<OrganizationRow>(
          "SELECT id, name, tax_identifier, timezone, revision FROM organizations WHERE id = $1",
          [actor.organizationId]
        );
        const result = await client.query<OrganizationRow>(
          `UPDATE organizations SET
             name = CASE WHEN $2 THEN $3 ELSE name END,
             tax_identifier = CASE WHEN $4 THEN $5 ELSE tax_identifier END,
             timezone = CASE WHEN $6 THEN $7 ELSE timezone END,
             revision = revision + 1
           WHERE id = $1 AND revision = $8::bigint
           RETURNING id, name, tax_identifier, timezone, revision`,
          [
            actor.organizationId,
            patch.name !== undefined,
            patch.name ?? null,
            patch.taxIdentifier !== undefined,
            patch.taxIdentifier ?? null,
            patch.timezone !== undefined,
            patch.timezone ?? null,
            revision
          ]
        );
        const row = result.rows[0];
        if (!row) throw new AppError("STALE_REVISION", "Organizacija je u međuvremenu promijenjena.");
        await audit(client, actor, requestId, "organization.update", "organization", row.id, before.rows[0] ?? null, row);
        return organizationView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async listDepartments(actor: ActorContext): Promise<DepartmentView[]> {
    return withTenant(this.pool, actor, "list-departments", async (client) => {
      const result = await client.query<DepartmentRow>(
        `SELECT id, name, status, revision FROM departments
         WHERE ($1::text <> 'manager' OR id = ANY($2::uuid[])) ORDER BY name, id`,
        [actor.role, actor.departmentIds]
      );
      return result.rows.map(departmentView);
    });
  }

  async createDepartment(actor: ActorContext, name: string, requestId: string): Promise<DepartmentView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const result = await client.query<DepartmentRow>(
          `INSERT INTO departments (organization_id, name) VALUES ($1, $2)
           RETURNING id, name, status, revision`,
          [actor.organizationId, name.trim()]
        );
        const row = result.rows[0];
        if (!row) throw new Error("Department insert returned no row");
        await audit(client, actor, requestId, "department.create", "department", row.id, null, row);
        return departmentView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async listHolidays(actor: ActorContext, year: number): Promise<HolidayView[]> {
    return withTenant(this.pool, actor, "list-holidays", async (client) => {
      const result = await client.query<HolidayRow>(
        `SELECT id, holiday_date, name, revision FROM holidays
         WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date`,
        [year]
      );
      return result.rows.map(holidayView);
    });
  }

  async replaceHolidays(
    actor: ActorContext,
    year: number,
    holidays: Array<{ date: string; name: string }>,
    revision: string,
    requestId: string
  ): Promise<HolidayView[]> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const locked = await client.query<OrganizationRow>(
          `UPDATE organizations SET revision = revision + 1
           WHERE id = $1 AND revision = $2::bigint
           RETURNING id, name, tax_identifier, timezone, revision`,
          [actor.organizationId, revision]
        );
        if (!locked.rows[0]) throw new AppError("STALE_REVISION", "Kalendar je u međuvremenu promijenjen.");
        const previous = await client.query<HolidayRow>(
          "SELECT id, holiday_date, name, revision FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date",
          [year]
        );
        await client.query("DELETE FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1", [year]);
        const created: HolidayRow[] = [];
        for (const holiday of holidays) {
          if (Number(holiday.date.slice(0, 4)) !== year) {
            throw new AppError("VALIDATION_FAILED", "Svi blagdani moraju pripadati traženoj godini.");
          }
          const inserted = await client.query<HolidayRow>(
            `INSERT INTO holidays (organization_id, holiday_date, name) VALUES ($1, $2, $3)
             RETURNING id, holiday_date, name, revision`,
            [actor.organizationId, holiday.date, holiday.name.trim()]
          );
          const row = inserted.rows[0];
          if (row) created.push(row);
        }
        await audit(client, actor, requestId, "holidays.replace", "organization", actor.organizationId, previous.rows, created);
        return created.map(holidayView);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async listUsers(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<UserView>> {
    return withTenant(this.pool, actor, "list-users", async (client) => {
      const after = decodeCursor(cursor);
      const result = await client.query<UserRow>(
        `${userSelect}
         WHERE ($1::uuid IS NULL OR u.id > $1)
         GROUP BY u.id ORDER BY u.id LIMIT $2`,
        [after, limit + 1]
      );
      const total = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
      const hasMore = result.rows.length > limit;
      const items = result.rows.slice(0, limit);
      return {
        items: items.map(userView),
        page: { nextCursor: hasMore && items.at(-1) ? encodeCursor(items.at(-1)!.id) : null, total: Number(total.rows[0]?.count ?? 0) }
      };
    });
  }

  async inviteUser(
    actor: ActorContext,
    input: { email: string; role: Role; workerId?: string | null; departmentIds?: string[] },
    requestId: string
  ): Promise<UserView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const inserted = await client.query<UserRow>(
          `INSERT INTO users (organization_id, email, role, status, worker_id)
           VALUES ($1, lower($2), $3, 'blocked', $4)
           RETURNING id, email, role, status, worker_id, revision, ARRAY[]::uuid[] AS department_ids`,
          [actor.organizationId, input.email.trim(), input.role, input.workerId ?? null]
        );
        const row = inserted.rows[0];
        if (!row) throw new Error("User insert returned no row");
        await this.replaceUserScopes(client, actor.organizationId, row.id, input.departmentIds ?? []);
        const invitationToken = createOpaqueToken();
        await client.query(
          `INSERT INTO user_invitations (
             organization_id, email, role, worker_id, token_hash, expires_at, invited_by
           ) VALUES ($1, $2, $3, $4, $5, clock_timestamp() + interval '72 hours', $6)`,
          [actor.organizationId, row.email, row.role, row.worker_id, hashToken(invitationToken), actor.userId]
        );
        const hydrated = await this.getUserRow(client, row.id);
        await audit(client, actor, requestId, "user.invite", "user", row.id, null, { ...hydrated, invitationToken: "[REDACTED]" });
        return userView(hydrated);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async updateUser(
    actor: ActorContext,
    userId: string,
    patch: { role?: Role; status?: EntityStatus; departmentIds?: string[] },
    revision: string,
    requestId: string
  ): Promise<UserView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const before = await this.getUserRow(client, userId);
        const updated = await client.query<{ id: string }>(
          `UPDATE users SET
             role = CASE WHEN $2 THEN $3 ELSE role END,
             status = CASE WHEN $4 THEN $5 ELSE status END,
             revision = revision + 1
           WHERE id = $1 AND revision = $6::bigint RETURNING id`,
          [userId, patch.role !== undefined, patch.role ?? null, patch.status !== undefined, patch.status ?? null, revision]
        );
        if (!updated.rows[0]) throw new AppError("STALE_REVISION", "Korisnički račun je u međuvremenu promijenjen.");
        if (patch.departmentIds) await this.replaceUserScopes(client, actor.organizationId, userId, patch.departmentIds);
        const after = await this.getUserRow(client, userId);
        await audit(client, actor, requestId, "user.update", "user", userId, before, after);
        return userView(after);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async listWorkers(
    actor: ActorContext,
    filters: { cursor?: string; limit: number; departmentId?: string; status?: EntityStatus; search?: string }
  ): Promise<Page<WorkerView>> {
    return withTenant(this.pool, actor, "list-workers", async (client) => {
      const after = decodeCursor(filters.cursor);
      const result = await client.query<WorkerRow>(
        `SELECT id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision
         FROM workers
         WHERE ($1::uuid IS NULL OR id > $1)
           AND ($2::text <> 'manager' OR department_id = ANY($3::uuid[]))
           AND ($4::uuid IS NULL OR department_id = $4)
           AND ($5::text IS NULL OR status = $5)
           AND ($6::text IS NULL OR name ILIKE '%' || $6 || '%' OR code ILIKE '%' || $6 || '%')
         ORDER BY id LIMIT $7`,
        [after, actor.role, actor.departmentIds, filters.departmentId ?? null, filters.status ?? null, filters.search ?? null, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM workers
         WHERE ($1::text <> 'manager' OR department_id = ANY($2::uuid[]))
           AND ($3::uuid IS NULL OR department_id = $3)
           AND ($4::text IS NULL OR status = $4)
           AND ($5::text IS NULL OR name ILIKE '%' || $5 || '%' OR code ILIKE '%' || $5 || '%')`,
        [actor.role, actor.departmentIds, filters.departmentId ?? null, filters.status ?? null, filters.search ?? null]
      );
      const hasMore = result.rows.length > filters.limit;
      const items = result.rows.slice(0, filters.limit);
      return {
        items: items.map(workerView),
        page: { nextCursor: hasMore && items.at(-1) ? encodeCursor(items.at(-1)!.id) : null, total: Number(count.rows[0]?.count ?? 0) }
      };
    });
  }

  async createWorker(actor: ActorContext, input: WorkerWrite, requestId: string): Promise<WorkerView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const result = await client.query<WorkerRow>(
          `INSERT INTO workers (
             organization_id, code, name, email, department_id, shift_id, annual_leave_allowance
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision`,
          [actor.organizationId, input.code.trim(), input.name.trim(), input.email ?? null, input.departmentId, input.shiftId, input.annualLeaveAllowance]
        );
        const row = result.rows[0];
        if (!row) throw new Error("Worker insert returned no row");
        await audit(client, actor, requestId, "worker.create", "worker", row.id, null, row);
        return workerView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async getWorker(actor: ActorContext, workerId: string): Promise<WorkerView> {
    return withTenant(this.pool, actor, "get-worker", async (client) => {
      const result = await client.query<WorkerRow>(
        `SELECT id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision
         FROM workers WHERE id = $1 AND ($2::text <> 'manager' OR department_id = ANY($3::uuid[]))`,
        [workerId, actor.role, actor.departmentIds]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Radnik nije pronađen u dopuštenom opsegu.");
      return workerView(row);
    });
  }

  async updateWorker(actor: ActorContext, workerId: string, input: WorkerWrite, revision: string, requestId: string): Promise<WorkerView> {
    return this.mutateWorker(actor, workerId, revision, requestId, "worker.update", async (client) => {
      return client.query<WorkerRow>(
        `UPDATE workers SET code = $2, name = $3, email = $4, department_id = $5,
           shift_id = $6, annual_leave_allowance = $7, revision = revision + 1
         WHERE id = $1 AND revision = $8::bigint
         RETURNING id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision`,
        [workerId, input.code.trim(), input.name.trim(), input.email ?? null, input.departmentId, input.shiftId, input.annualLeaveAllowance, revision]
      );
    });
  }

  async deactivateWorker(actor: ActorContext, workerId: string, revision: string, requestId: string): Promise<WorkerView> {
    return this.mutateWorker(actor, workerId, revision, requestId, "worker.deactivate", async (client) => {
      return client.query<WorkerRow>(
        `UPDATE workers SET status = 'blocked', deactivated_at = clock_timestamp(), revision = revision + 1
         WHERE id = $1 AND revision = $2::bigint
         RETURNING id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision`,
        [workerId, revision]
      );
    });
  }

  async listShifts(actor: ActorContext): Promise<ShiftView[]> {
    return withTenant(this.pool, actor, "list-shifts", async (client) => {
      const result = await client.query<ShiftRow>(`${shiftSelect} GROUP BY s.id ORDER BY s.name, s.id`);
      return result.rows.map(shiftView);
    });
  }

  async createShift(actor: ActorContext, input: ShiftWrite, requestId: string): Promise<ShiftView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO shifts (organization_id, name, start_time, end_time, break_minutes, tolerance_minutes)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [actor.organizationId, input.name.trim(), input.startTime, input.endTime, input.breakMinutes, input.toleranceMinutes]
        );
        const id = inserted.rows[0]?.id;
        if (!id) throw new Error("Shift insert returned no id");
        const row = await this.getShiftRow(client, id);
        await audit(client, actor, requestId, "shift.create", "shift", id, null, row);
        return shiftView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async updateShift(actor: ActorContext, shiftId: string, input: ShiftWrite, revision: string, requestId: string): Promise<ShiftView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const before = await this.getShiftRow(client, shiftId);
        const updated = await client.query<{ id: string }>(
          `UPDATE shifts SET name = $2, start_time = $3, end_time = $4,
             break_minutes = $5, tolerance_minutes = $6, revision = revision + 1
           WHERE id = $1 AND revision = $7::bigint RETURNING id`,
          [shiftId, input.name.trim(), input.startTime, input.endTime, input.breakMinutes, input.toleranceMinutes, revision]
        );
        if (!updated.rows[0]) throw new AppError("STALE_REVISION", "Smjena je u međuvremenu promijenjena.");
        const after = await this.getShiftRow(client, shiftId);
        await audit(client, actor, requestId, "shift.update", "shift", shiftId, before, after);
        return shiftView(after);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async blockRfidCard(actor: ActorContext, cardId: string, requestId: string): Promise<RfidCardView> {
    return withTenant(this.pool, actor, requestId, async (client) => {
      const before = await client.query<RfidRow>(
        "SELECT id, masked_uid, worker_id, status, valid_from, valid_to, revision FROM rfid_cards WHERE id = $1",
        [cardId]
      );
      const result = await client.query<RfidRow>(
        `UPDATE rfid_cards SET status = 'blocked', valid_to = COALESCE(valid_to, clock_timestamp()), revision = revision + 1
         WHERE id = $1 RETURNING id, masked_uid, worker_id, status, valid_from, valid_to, revision`,
        [cardId]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "RFID kartica nije pronađena.");
      await audit(client, actor, requestId, "rfid_card.block", "rfid_card", cardId, before.rows[0] ?? null, row);
      return rfidView(row);
    });
  }

  private async mutateWorker(
    actor: ActorContext,
    workerId: string,
    revision: string,
    requestId: string,
    action: string,
    mutation: (client: TenantTransaction) => Promise<pg.QueryResult<WorkerRow>>
  ): Promise<WorkerView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const before = await client.query<WorkerRow>(
          `SELECT id, code, name, email, department_id, shift_id, status, annual_leave_allowance, revision
           FROM workers WHERE id = $1`,
          [workerId]
        );
        if (!before.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
        const result = await mutation(client);
        const row = result.rows[0];
        if (!row) throw new AppError("STALE_REVISION", "Radnik je u međuvremenu promijenjen.");
        await audit(client, actor, requestId, action, "worker", workerId, before.rows[0], row);
        return workerView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  private async getUserRow(client: TenantTransaction, userId: string): Promise<UserRow> {
    const result = await client.query<UserRow>(`${userSelect} WHERE u.id = $1 GROUP BY u.id`, [userId]);
    const row = result.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "Korisnički račun nije pronađen.");
    return row;
  }

  private async replaceUserScopes(client: TenantTransaction, organizationId: string, userId: string, departmentIds: string[]): Promise<void> {
    await client.query("DELETE FROM user_department_scopes WHERE user_id = $1", [userId]);
    for (const departmentId of [...new Set(departmentIds)]) {
      await client.query(
        "INSERT INTO user_department_scopes (organization_id, user_id, department_id) VALUES ($1, $2, $3)",
        [organizationId, userId, departmentId]
      );
    }
  }

  private async getShiftRow(client: TenantTransaction, shiftId: string): Promise<ShiftRow> {
    const result = await client.query<ShiftRow>(`${shiftSelect} WHERE s.id = $1 GROUP BY s.id`, [shiftId]);
    const row = result.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "Smjena nije pronađena.");
    return row;
  }
}
