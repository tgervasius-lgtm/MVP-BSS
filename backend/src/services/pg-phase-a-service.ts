import { createHash } from "node:crypto";
import type pg from "pg";
import { AppError } from "../domain/errors.js";
import type { ActorContext, EntityStatus, Page, Role } from "../domain/types.js";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { hashRfidUid, maskRfidUid } from "../security/rfid.js";
import { createOpaqueToken, hashToken } from "../security/tokens.js";
import type {
  DashboardSummaryView,
  DepartmentView,
  HolidayCalendarView,
  HolidayView,
  LeaveBalanceView,
  OrganizationView,
  PhaseAService,
  ReportPreviewView,
  ReportPreviewWrite,
  RfidCardView,
  ShiftView,
  ShiftWrite,
  TerminalSyncEventView,
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
type LeaveBalanceRow = {
  worker_id: string;
  annual_leave_allowance: number;
  approved_days: string | number;
  planned_days: string | number;
  revision: string | number;
};
type TerminalSyncEventRow = {
  id: string;
  terminal_id: string;
  device_event_id: string;
  sequence: string | number;
  worker_id: string | null;
  occurred_at: Date | string;
  received_at: Date | string;
  event_type: TerminalSyncEventView["eventType"];
  status: TerminalSyncEventView["status"];
  rejection_code: string | null;
};
type ReportRow = Record<string, string | number | Date | null>;

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

function terminalSyncEventView(row: TerminalSyncEventRow): TerminalSyncEventView {
  const iso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
  return {
    id: row.id,
    terminalId: row.terminal_id,
    deviceEventId: row.device_event_id,
    sequence: Number(row.sequence),
    workerId: row.worker_id,
    occurredAt: iso(row.occurred_at),
    receivedAt: iso(row.received_at),
    eventType: row.event_type,
    status: row.status,
    rejectionCode: row.rejection_code
  };
}

function datasetVersion(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function reportValue(value: string | number | Date | null): string | number | null {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function reportRows(rows: ReportRow[]): Array<Record<string, string | number | null>> {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, reportValue(value)])));
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

function decodeTimelineCursor(cursor: string | undefined): { receivedAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { receivedAt?: unknown; id?: unknown };
    if (
      typeof parsed.receivedAt !== "string" || Number.isNaN(Date.parse(parsed.receivedAt)) ||
      typeof parsed.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id)
    ) throw new Error();
    return { receivedAt: parsed.receivedAt, id: parsed.id };
  } catch {
    throw new AppError("VALIDATION_FAILED", "Kursor terminalskih događaja nije valjan.");
  }
}

function encodeTimelineCursor(row: TerminalSyncEventRow): string {
  const receivedAt = row.received_at instanceof Date ? row.received_at.toISOString() : new Date(row.received_at).toISOString();
  return Buffer.from(JSON.stringify({ receivedAt, id: row.id })).toString("base64url");
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
  constructor(
    private readonly pool: pg.Pool,
    private readonly rfidUidPepper: string
  ) {}

  async getDashboardSummary(actor: ActorContext, date: string): Promise<DashboardSummaryView> {
    return withTenant(this.pool, actor, "dashboard-summary", async (client) => {
      const result = await client.query<{
        present: string;
        absent_today: string;
        review_required: string;
        pending_decision: string;
        worked_minutes: string;
        balance_minutes: string;
        available_leave: string;
        data_revision: string;
      }>(
        `WITH scoped_workers AS (
           SELECT id FROM workers
           WHERE status = 'active'
             AND ($2::text <> 'manager' OR department_id = ANY($3::uuid[]))
             AND ($2::text <> 'worker' OR id = $4::uuid)
         )
         SELECT
           (SELECT COUNT(*)::text FROM attendance_days a JOIN scoped_workers w ON w.id = a.worker_id
             WHERE a.work_date = $1::date AND a.check_in IS NOT NULL) AS present,
           (SELECT COUNT(DISTINCT l.worker_id)::text FROM leave_requests l JOIN scoped_workers w ON w.id = l.worker_id
             WHERE l.status = 'approved' AND $1::date BETWEEN l.start_date AND l.end_date) AS absent_today,
           (SELECT COUNT(*)::text FROM attendance_days a JOIN scoped_workers w ON w.id = a.worker_id
             WHERE a.work_date = $1::date AND a.status IN ('late', 'incomplete')) AS review_required,
           ((SELECT COUNT(*) FROM leave_requests l JOIN scoped_workers w ON w.id = l.worker_id WHERE l.status = 'pending') +
            (SELECT COUNT(*) FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
               JOIN scoped_workers w ON w.id = a.worker_id WHERE c.status = 'pending'))::text AS pending_decision,
           COALESCE((SELECT SUM(a.worked_minutes) FROM attendance_days a JOIN scoped_workers w ON w.id = a.worker_id
             WHERE a.work_date = $1::date), 0)::text AS worked_minutes,
           COALESCE((SELECT SUM(a.worked_minutes - a.planned_minutes) FROM attendance_days a JOIN scoped_workers w ON w.id = a.worker_id
             WHERE a.work_date = $1::date), 0)::text AS balance_minutes,
           COALESCE((SELECT MAX(w.annual_leave_allowance) -
              COALESCE(SUM(l.working_days) FILTER (WHERE l.leave_type = 'annual_leave' AND l.status IN ('approved', 'pending')
                AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM $1::date)), 0)
             FROM workers w LEFT JOIN leave_requests l ON l.worker_id = w.id WHERE w.id = $4::uuid), 0)::text AS available_leave,
           GREATEST(
             COALESCE((SELECT MAX(a.revision) FROM attendance_days a JOIN scoped_workers w ON w.id = a.worker_id), 0),
             COALESCE((SELECT MAX(l.revision) FROM leave_requests l JOIN scoped_workers w ON w.id = l.worker_id), 0),
             COALESCE((SELECT MAX(c.revision) FROM correction_requests c JOIN attendance_days a ON a.id = c.attendance_day_id
               JOIN scoped_workers w ON w.id = a.worker_id), 0)
           )::text AS data_revision`,
        [date, actor.role, actor.departmentIds, actor.selfWorkerId]
      );
      const row = result.rows[0];
      if (!row) throw new Error("Dashboard query returned no row");
      const filters = { date };
      const kpis: DashboardSummaryView["kpis"] = actor.role === "worker"
        ? [
            { id: "worked_minutes", value: Number(row.worked_minutes), targetScreen: "mytime", filters },
            { id: "balance_minutes", value: Number(row.balance_minutes), targetScreen: "mytime", filters },
            { id: "available_leave", value: Number(row.available_leave), targetScreen: "vacations", filters: { year: date.slice(0, 4) } },
            { id: "pending_decision", value: Number(row.pending_decision), targetScreen: "requests", filters: { status: "pending" } }
          ]
        : [
            { id: "present", value: Number(row.present), targetScreen: "attendance", filters: { ...filters, presence: "present" } },
            { id: "review_required", value: Number(row.review_required), targetScreen: "attendance", filters: { ...filters, status: "review_required" } },
            { id: "absent_today", value: Number(row.absent_today), targetScreen: "attendance", filters: { ...filters, presence: "absent" } },
            { id: "pending_decision", value: Number(row.pending_decision), targetScreen: "requests", filters: { status: "pending" } }
          ];
      return { date, role: actor.role, kpis, datasetVersion: datasetVersion({ date, role: actor.role, revision: row.data_revision, kpis }) };
    });
  }

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

  async updateDepartment(
    actor: ActorContext,
    departmentId: string,
    patch: { name?: string; status?: EntityStatus },
    revision: string,
    requestId: string
  ): Promise<DepartmentView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const before = await client.query<DepartmentRow>(
          "SELECT id, name, status, revision FROM departments WHERE id = $1",
          [departmentId]
        );
        if (!before.rows[0]) throw new AppError("NOT_FOUND", "Odjel nije pronađen.");
        const result = await client.query<DepartmentRow>(
          `UPDATE departments SET
             name = CASE WHEN $2 THEN $3 ELSE name END,
             status = CASE WHEN $4 THEN $5 ELSE status END,
             revision = revision + 1
           WHERE id = $1 AND revision = $6::bigint
           RETURNING id, name, status, revision`,
          [departmentId, patch.name !== undefined, patch.name?.trim() ?? null, patch.status !== undefined, patch.status ?? null, revision]
        );
        const row = result.rows[0];
        if (!row) throw new AppError("STALE_REVISION", "Odjel je u međuvremenu promijenjen.");
        await audit(client, actor, requestId, "department.update", "department", departmentId, before.rows[0], row);
        return departmentView(row);
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  }

  async listHolidays(actor: ActorContext, year: number): Promise<HolidayCalendarView> {
    return withTenant(this.pool, actor, "list-holidays", async (client) => {
      const result = await client.query<HolidayRow>(
        `SELECT id, holiday_date, name, revision FROM holidays
         WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date`,
        [year]
      );
      const calendar = await client.query<{ revision: string | number }>(
        "SELECT revision FROM holiday_calendars WHERE year = $1",
        [year]
      );
      return { items: result.rows.map(holidayView), revision: String(calendar.rows[0]?.revision ?? 0) };
    });
  }

  async replaceHolidays(
    actor: ActorContext,
    year: number,
    holidays: Array<{ date: string; name: string }>,
    revision: string,
    requestId: string
  ): Promise<HolidayCalendarView> {
    try {
      return await withTenant(this.pool, actor, requestId, async (client) => {
        await client.query(
          `INSERT INTO holiday_calendars (organization_id, year, revision)
           VALUES ($1, $2, 0) ON CONFLICT (organization_id, year) DO NOTHING`,
          [actor.organizationId, year]
        );
        const locked = await client.query<{ revision: string | number }>(
          `UPDATE holiday_calendars SET revision = revision + 1, updated_at = clock_timestamp()
           WHERE year = $1 AND revision = $2::bigint RETURNING revision`,
          [year, revision]
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
        return { items: created.map(holidayView), revision: String(locked.rows[0].revision) };
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

  async listWorkerRfidCards(actor: ActorContext, workerId: string): Promise<RfidCardView[]> {
    return withTenant(this.pool, actor, "list-worker-rfid-cards", async (client) => {
      const result = await client.query<RfidRow>(
        `SELECT r.id, r.masked_uid, r.worker_id, r.status, r.valid_from, r.valid_to, r.revision
         FROM rfid_cards r
         JOIN workers w ON w.id = r.worker_id
         WHERE r.worker_id = $1
           AND ($2::text <> 'manager' OR w.department_id = ANY($3::uuid[]))
         ORDER BY r.valid_from DESC, r.id DESC`,
        [workerId, actor.role, actor.departmentIds]
      );
      if (result.rows.length === 0) {
        const worker = await client.query(
          `SELECT id FROM workers WHERE id = $1
           AND ($2::text <> 'manager' OR department_id = ANY($3::uuid[]))`,
          [workerId, actor.role, actor.departmentIds]
        );
        if (!worker.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen u dopuštenom opsegu.");
      }
      return result.rows.map(rfidView);
    });
  }

  async assignWorkerRfidCard(
    actor: ActorContext,
    workerId: string,
    input: { uid: string; validFrom?: string },
    requestId: string
  ): Promise<RfidCardView> {
    try {
      const uidHash = hashRfidUid(input.uid, this.rfidUidPepper);
      const maskedUid = maskRfidUid(input.uid);
      return await withTenant(this.pool, actor, requestId, async (client) => {
        const worker = await client.query("SELECT id FROM workers WHERE id = $1", [workerId]);
        if (!worker.rows[0]) throw new AppError("NOT_FOUND", "Radnik nije pronađen.");
        const result = await client.query<RfidRow>(
          `INSERT INTO rfid_cards (organization_id, worker_id, uid_hash, masked_uid, valid_from)
           VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, clock_timestamp()))
           RETURNING id, masked_uid, worker_id, status, valid_from, valid_to, revision`,
          [actor.organizationId, workerId, uidHash, maskedUid, input.validFrom ?? null]
        );
        const row = result.rows[0];
        if (!row) throw new Error("RFID assignment returned no row");
        await audit(client, actor, requestId, "rfid_card.assign", "rfid_card", row.id, null, {
          id: row.id,
          workerId,
          maskedUid,
          status: row.status,
          validFrom: row.valid_from
        });
        return rfidView(row);
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

  async listLeaveBalances(
    actor: ActorContext,
    filters: { year: number; cursor?: string; limit: number; departmentId?: string; workerId?: string }
  ): Promise<Page<LeaveBalanceView> & { datasetVersion: string }> {
    return withTenant(this.pool, actor, "list-leave-balances", async (client) => {
      const after = decodeCursor(filters.cursor);
      const values = [
        filters.year,
        actor.role,
        actor.departmentIds,
        actor.selfWorkerId,
        filters.departmentId ?? null,
        filters.workerId ?? null
      ];
      const result = await client.query<LeaveBalanceRow>(
        `SELECT w.id AS worker_id, w.annual_leave_allowance,
           COALESCE(SUM(CASE WHEN l.status = 'approved' THEN days.working_days ELSE 0 END), 0)::integer AS approved_days,
           COALESCE(SUM(CASE WHEN l.status = 'pending' THEN days.working_days ELSE 0 END), 0)::integer AS planned_days,
           GREATEST(w.revision, COALESCE(MAX(l.revision), 0)) AS revision
         FROM workers w
         LEFT JOIN leave_requests l ON l.worker_id = w.id
           AND l.leave_type = 'annual_leave'
           AND l.end_date >= make_date($1, 1, 1)
           AND l.start_date <= make_date($1, 12, 31)
           AND l.status IN ('approved', 'pending')
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::integer AS working_days
           FROM generate_series(
             GREATEST(l.start_date, make_date($1, 1, 1))::timestamp,
             LEAST(l.end_date, make_date($1, 12, 31))::timestamp,
             interval '1 day'
           ) AS day(value)
           WHERE EXTRACT(ISODOW FROM day.value) < 6
             AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = day.value::date)
         ) days ON l.id IS NOT NULL
         WHERE w.status = 'active'
           AND ($2::text <> 'manager' OR w.department_id = ANY($3::uuid[]))
           AND ($2::text <> 'worker' OR w.id = $4::uuid)
           AND ($5::uuid IS NULL OR w.department_id = $5)
           AND ($6::uuid IS NULL OR w.id = $6)
           AND ($7::uuid IS NULL OR w.id > $7)
         GROUP BY w.id
         ORDER BY w.id
         LIMIT $8`,
        [...values, after, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM workers w
         WHERE w.status = 'active'
           AND ($1::text <> 'manager' OR w.department_id = ANY($2::uuid[]))
           AND ($1::text <> 'worker' OR w.id = $3::uuid)
           AND ($4::uuid IS NULL OR w.department_id = $4)
           AND ($5::uuid IS NULL OR w.id = $5)`,
        [actor.role, actor.departmentIds, actor.selfWorkerId, filters.departmentId ?? null, filters.workerId ?? null]
      );
      const hasMore = result.rows.length > filters.limit;
      const pageRows = result.rows.slice(0, filters.limit);
      const items = pageRows.map((row): LeaveBalanceView => {
        const allowanceDays = row.annual_leave_allowance;
        const approvedDays = Number(row.approved_days);
        const plannedDays = Number(row.planned_days);
        return {
          workerId: row.worker_id,
          year: filters.year,
          allowanceDays,
          carriedOverDays: 0,
          approvedDays,
          plannedDays,
          remainingDays: allowanceDays - approvedDays,
          availableDays: allowanceDays - approvedDays - plannedDays,
          revision: String(row.revision)
        };
      });
      const page = {
        nextCursor: hasMore && pageRows.at(-1) ? encodeCursor(pageRows.at(-1)!.worker_id) : null,
        total: Number(count.rows[0]?.count ?? 0)
      };
      return { items, page, datasetVersion: datasetVersion({ filters, total: page.total, items }) };
    });
  }

  async createReportPreview(actor: ActorContext, input: ReportPreviewWrite): Promise<ReportPreviewView> {
    if (input.periodFrom > input.periodTo) {
      throw new AppError("VALIDATION_FAILED", "Početni datum izvještaja mora biti prije završnog datuma.");
    }
    return withTenant(this.pool, actor, "report-preview", async (client) => {
      const limit = input.limit ?? 100;
      const parameters = [
        input.periodFrom,
        input.periodTo,
        actor.role,
        actor.departmentIds,
        input.departmentId ?? null,
        input.workerId ?? null,
        input.attendanceStatus ?? null,
        limit + 1
      ];
      type PreviewRow = ReportRow & {
        __row_count: string | number;
        __worked_minutes: string | number;
        __planned_minutes: string | number;
        __balance_minutes: string | number;
        __revision: string | number;
      };
      let result: pg.QueryResult<PreviewRow>;
      let columns: ReportPreviewView["columns"];

      const attendanceScope = `a.work_date BETWEEN $1::date AND $2::date
        AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
        AND ($5::uuid IS NULL OR w.department_id = $5)
        AND ($6::uuid IS NULL OR w.id = $6)`;
      if (input.reportType === "monthly_summary") {
        result = await client.query<PreviewRow>(
          `WITH rows AS (
             SELECT w.code AS "workerCode", w.name AS "workerName",
               COUNT(a.id)::integer AS "dayCount", SUM(a.worked_minutes)::integer AS "workedMinutes",
               SUM(a.planned_minutes)::integer AS "plannedMinutes",
               SUM(a.worked_minutes - a.planned_minutes)::integer AS "balanceMinutes",
               MAX(a.revision) AS revision
             FROM attendance_days a JOIN workers w ON w.id = a.worker_id
             WHERE ${attendanceScope} AND ($7::text IS NULL OR a.status = $7)
             GROUP BY w.id
           )
           SELECT rows.*,
             COUNT(*) OVER() AS __row_count,
             COALESCE(SUM("workedMinutes") OVER(), 0) AS __worked_minutes,
             COALESCE(SUM("plannedMinutes") OVER(), 0) AS __planned_minutes,
             COALESCE(SUM("balanceMinutes") OVER(), 0) AS __balance_minutes,
             COALESCE(MAX(revision) OVER(), 0) AS __revision
           FROM rows ORDER BY "workerCode" LIMIT $8`,
          parameters
        );
        columns = [
          { key: "workerCode", label: "Šifra", dataType: "text" },
          { key: "workerName", label: "Radnik", dataType: "text" },
          { key: "dayCount", label: "Dana", dataType: "integer" },
          { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" },
          { key: "plannedMinutes", label: "Planirano", dataType: "minutes" },
          { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
        ];
      } else if (input.reportType === "attendance_journal" || input.reportType === "exceptions") {
        const exceptionClause = input.reportType === "exceptions" ? "AND a.status IN ('late', 'incomplete', 'corrected')" : "";
        result = await client.query<PreviewRow>(
          `WITH rows AS (
             SELECT w.code AS "workerCode", w.name AS "workerName", a.work_date AS "workDate",
               a.status, a.worked_minutes AS "workedMinutes", a.planned_minutes AS "plannedMinutes",
               a.worked_minutes - a.planned_minutes AS "balanceMinutes", a.revision
             FROM attendance_days a JOIN workers w ON w.id = a.worker_id
             WHERE ${attendanceScope} ${exceptionClause} AND ($7::text IS NULL OR a.status = $7)
           )
           SELECT rows.*,
             COUNT(*) OVER() AS __row_count,
             COALESCE(SUM("workedMinutes") OVER(), 0) AS __worked_minutes,
             COALESCE(SUM("plannedMinutes") OVER(), 0) AS __planned_minutes,
             COALESCE(SUM("balanceMinutes") OVER(), 0) AS __balance_minutes,
             COALESCE(MAX(revision) OVER(), 0) AS __revision
           FROM rows ORDER BY "workDate", "workerCode" LIMIT $8`,
          parameters
        );
        columns = [
          { key: "workerCode", label: "Šifra", dataType: "text" },
          { key: "workerName", label: "Radnik", dataType: "text" },
          { key: "workDate", label: "Datum", dataType: "date" },
          { key: "status", label: "Status", dataType: "status" },
          { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" },
          { key: "plannedMinutes", label: "Planirano", dataType: "minutes" },
          { key: "balanceMinutes", label: "Saldo", dataType: "minutes" }
        ];
      } else if (input.reportType === "approved_absences") {
        result = await client.query<PreviewRow>(
          `WITH rows AS (
             SELECT w.code AS "workerCode", w.name AS "workerName", l.leave_type AS "typeCode",
               l.start_date AS "startDate", l.end_date AS "endDate", l.working_days AS "workingDays",
               l.status, l.revision
             FROM leave_requests l JOIN workers w ON w.id = l.worker_id
             WHERE l.status = 'approved' AND l.end_date >= $1::date AND l.start_date <= $2::date
               AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
               AND ($5::uuid IS NULL OR w.department_id = $5)
               AND ($6::uuid IS NULL OR w.id = $6)
           )
           SELECT rows.*, COUNT(*) OVER() AS __row_count, 0 AS __worked_minutes,
             0 AS __planned_minutes, 0 AS __balance_minutes, COALESCE(MAX(revision) OVER(), 0) AS __revision
           FROM rows ORDER BY "startDate", "workerCode" LIMIT $8`,
          parameters
        );
        columns = [
          { key: "workerCode", label: "Šifra", dataType: "text" },
          { key: "workerName", label: "Radnik", dataType: "text" },
          { key: "typeCode", label: "Vrsta", dataType: "text" },
          { key: "startDate", label: "Od", dataType: "date" },
          { key: "endDate", label: "Do", dataType: "date" },
          { key: "workingDays", label: "Radnih dana", dataType: "integer" },
          { key: "status", label: "Status", dataType: "status" }
        ];
      } else {
        result = await client.query<PreviewRow>(
          `WITH rows AS (
             SELECT w.code AS "workerCode", w.name AS "workerName", a.work_date AS "workDate",
               c.status, c.created_at AS "requestedAt", c.reason, c.revision
             FROM correction_requests c
             JOIN attendance_days a ON a.id = c.attendance_day_id
             JOIN workers w ON w.id = a.worker_id
             WHERE c.created_at >= $1::date AND c.created_at < ($2::date + interval '1 day')
               AND ($3::text <> 'manager' OR w.department_id = ANY($4::uuid[]))
               AND ($5::uuid IS NULL OR w.department_id = $5)
               AND ($6::uuid IS NULL OR w.id = $6)
           )
           SELECT rows.*, COUNT(*) OVER() AS __row_count, 0 AS __worked_minutes,
             0 AS __planned_minutes, 0 AS __balance_minutes, COALESCE(MAX(revision) OVER(), 0) AS __revision
           FROM rows ORDER BY "requestedAt", "workerCode" LIMIT $8`,
          parameters
        );
        columns = [
          { key: "workerCode", label: "Šifra", dataType: "text" },
          { key: "workerName", label: "Radnik", dataType: "text" },
          { key: "workDate", label: "Datum", dataType: "date" },
          { key: "status", label: "Status", dataType: "status" },
          { key: "requestedAt", label: "Zatraženo", dataType: "datetime" },
          { key: "reason", label: "Razlog korekcije", dataType: "text" }
        ];
      }

      const metadata = result.rows[0];
      const rowCount = Number(metadata?.__row_count ?? 0);
      const selected = result.rows.slice(0, limit);
      const rows = reportRows(selected.map((row) => {
        const {
          __row_count: _rowCount,
          __worked_minutes: _worked,
          __planned_minutes: _planned,
          __balance_minutes: _balance,
          __revision: _revision,
          revision: _entityRevision,
          ...data
        } = row;
        return data;
      }));
      const totals = {
        rowCount,
        workedMinutes: Number(metadata?.__worked_minutes ?? 0),
        plannedMinutes: Number(metadata?.__planned_minutes ?? 0),
        balanceMinutes: Number(metadata?.__balance_minutes ?? 0)
      };
      const filters: ReportPreviewWrite = { ...input, limit };
      return {
        reportType: input.reportType,
        filters,
        columns,
        rows,
        totals,
        datasetVersion: datasetVersion({ filters, totals, revision: String(metadata?.__revision ?? 0) }),
        truncated: rowCount > limit
      };
    });
  }

  async listTerminalSyncEvents(
    actor: ActorContext,
    terminalId: string,
    filters: { from: string; to: string; eventStatus?: TerminalSyncEventView["status"]; cursor?: string; limit: number }
  ): Promise<Page<TerminalSyncEventView>> {
    if (filters.from > filters.to) throw new AppError("VALIDATION_FAILED", "Početni datum mora biti prije završnog datuma.");
    return withTenant(this.pool, actor, "list-terminal-sync-events", async (client) => {
      const terminal = await client.query("SELECT id FROM terminals WHERE id = $1", [terminalId]);
      if (!terminal.rows[0]) throw new AppError("NOT_FOUND", "Terminal nije pronađen.");
      const cursor = decodeTimelineCursor(filters.cursor);
      const result = await client.query<TerminalSyncEventRow>(
        `SELECT id, terminal_id, device_event_id, sequence, worker_id, occurred_at, received_at,
           event_type, status, rejection_code
         FROM terminal_sync_events
         WHERE terminal_id = $1
           AND received_at >= $2::date AND received_at < ($3::date + interval '1 day')
           AND ($4::text IS NULL OR status = $4)
           AND ($5::timestamptz IS NULL OR (received_at, id) < ($5::timestamptz, $6::uuid))
         ORDER BY received_at DESC, id DESC LIMIT $7`,
        [terminalId, filters.from, filters.to, filters.eventStatus ?? null, cursor?.receivedAt ?? null, cursor?.id ?? null, filters.limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM terminal_sync_events
         WHERE terminal_id = $1
           AND received_at >= $2::date AND received_at < ($3::date + interval '1 day')
           AND ($4::text IS NULL OR status = $4)`,
        [terminalId, filters.from, filters.to, filters.eventStatus ?? null]
      );
      const hasMore = result.rows.length > filters.limit;
      const rows = result.rows.slice(0, filters.limit);
      return {
        items: rows.map(terminalSyncEventView),
        page: {
          nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(rows.at(-1)!) : null,
          total: Number(count.rows[0]?.count ?? 0)
        }
      };
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
