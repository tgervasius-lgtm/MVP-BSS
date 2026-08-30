import { createHash } from "node:crypto";
import type pg from "pg";
import { withTenant, type TenantTransaction } from "../db/tenant.js";
import { AppError } from "../domain/errors.js";
import type { ActorContext, Page } from "../domain/types.js";
import { generateReportArtifact } from "../reports/generate.js";
import { requireRole } from "../security/rbac.js";
import {
  parsePeriodSnapshot,
  REPORT_TEMPLATE_VERSION,
  snapshotChecksum,
  type AttendancePeriodSnapshot
} from "./attendance-period-snapshot.js";
import type {
  ReportArtifact,
  ReportExportVerificationView,
  ReportExportView,
  ReportExportWrite,
  ReportPreviewView,
  ReportPreviewWrite
} from "./contracts.js";
import { decodeTimelineCursor, encodeTimelineCursor } from "./cursors.js";
import { createLiveReportPreview, createLockedReportPreview } from "./report-dataset.js";
import { requireBoundedDateRange } from "./validation.js";

const MAX_EXPORT_ROWS = 10_000;

type ReportExportRow = {
  id: string;
  created_by: string;
  report_type: ReportExportView["reportType"];
  format: ReportExportView["format"];
  status: ReportExportView["status"];
  filters: ReportExportWrite | string;
  row_count: number | null;
  total_minutes: string | number | null;
  checksum_sha256: string | null;
  dataset_version: string;
  dataset_checksum_sha256: string | null;
  period_version_id: string | null;
  calculation_versions: string[] | string;
  scope_department_ids: string[];
  template_version: string;
  created_at: string | Date;
  completed_at: string | Date | null;
  expires_at: string | Date | null;
  content?: Buffer | null;
  mime_type?: string | null;
  file_name?: string | null;
};

type PeriodVersionRow = {
  id: string;
  dataset_snapshot: AttendancePeriodSnapshot | string;
  dataset_checksum_sha256: string;
  calculation_versions: string[] | string;
  template_version: string;
};

const reportSelect = `SELECT id, created_by, report_type, format,
  CASE WHEN status = 'ready' AND expires_at IS NOT NULL AND expires_at <= clock_timestamp()
    THEN 'expired' ELSE status END AS status,
  filters, row_count, total_minutes, checksum_sha256, dataset_version,
  dataset_checksum_sha256, period_version_id, calculation_versions, scope_department_ids,
  template_version, created_at, completed_at, expires_at`;

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function jsonObject<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

function reportExportView(row: ReportExportRow): ReportExportView {
  const expired = row.expires_at !== null && new Date(row.expires_at).getTime() <= Date.now();
  const status = expired && row.status === "ready" ? "expired" : row.status;
  return {
    id: row.id,
    reportType: row.report_type,
    format: row.format,
    status,
    filters: jsonObject<ReportExportWrite>(row.filters),
    rowCount: row.row_count,
    officialMinutes: row.total_minutes === null ? null : Number(row.total_minutes),
    checksumSha256: row.checksum_sha256,
    datasetVersion: row.dataset_version,
    datasetChecksumSha256: row.dataset_checksum_sha256,
    periodVersionId: row.period_version_id,
    calculationVersions: jsonObject<string[]>(row.calculation_versions),
    templateVersion: row.template_version,
    createdAt: iso(row.created_at),
    readyAt: row.completed_at ? iso(row.completed_at) : null,
    downloadUrl: status === "ready" ? `/api/v1/report-exports/${row.id}/download` : null,
    downloadExpiresAt: row.expires_at ? iso(row.expires_at) : null
  };
}

function previewInput(input: ReportExportWrite, limit: number): ReportPreviewWrite {
  return {
    reportType: input.reportType,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
    ...(input.workerId !== undefined ? { workerId: input.workerId } : {}),
    ...(input.attendanceStatus !== undefined ? { attendanceStatus: input.attendanceStatus } : {}),
    limit
  };
}

function requireScope(actor: ActorContext, departmentId?: string | null): void {
  if (actor.role === "manager" && departmentId && !actor.departmentIds.includes(departmentId)) {
    throw new AppError("FORBIDDEN", "Odjel nije u dodijeljenom opsegu voditelja.");
  }
}

function canRead(row: ReportExportRow, actor: ActorContext): boolean {
  if (actor.role !== "manager") return true;
  return row.created_by === actor.userId && row.scope_department_ids.every((id) => actor.departmentIds.includes(id));
}

async function insertAudit(
  client: TenantTransaction,
  actor: ActorContext,
  requestId: string,
  row: ReportExportRow
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
       organization_id, actor_type, actor_id, actor_role, action, entity_type, entity_id,
       after_json, request_id, metadata
     ) VALUES ($1, 'user', $2, $3, 'report_export.create', 'report_export', $4, $5::jsonb, $6, $7::jsonb)`,
    [actor.organizationId, actor.userId, actor.role, row.id,
      JSON.stringify({ reportType: row.report_type, format: row.format, rowCount: row.row_count,
        checksumSha256: row.checksum_sha256, datasetVersion: row.dataset_version,
        datasetChecksumSha256: row.dataset_checksum_sha256, periodVersionId: row.period_version_id,
        calculationVersions: jsonObject<string[]>(row.calculation_versions), templateVersion: row.template_version }),
      requestId, JSON.stringify({ module: "reports" })]
  );
}

export class PgReportService {
  constructor(private readonly pool: pg.Pool) {}

  async createPreview(actor: ActorContext, input: ReportPreviewWrite): Promise<ReportPreviewView> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    requireBoundedDateRange(input.periodFrom, input.periodTo);
    requireScope(actor, input.departmentId);
    return withTenant(this.pool, actor, "report-preview", (client) => createLiveReportPreview(client, actor, input));
  }

  async listExports(actor: ActorContext, cursor: string | undefined, limit: number): Promise<Page<ReportExportView>> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    return withTenant(this.pool, actor, "list-report-exports", async (client) => {
      const after = decodeTimelineCursor(cursor);
      const result = await client.query<ReportExportRow>(
        `${reportSelect} FROM report_exports
         WHERE ($1::text <> 'manager' OR (created_by = $2 AND scope_department_ids <@ $3::uuid[]))
           AND ($4::timestamptz IS NULL OR (created_at, id) < ($4::timestamptz, $5::uuid))
         ORDER BY created_at DESC, id DESC LIMIT $6`,
        [actor.role, actor.userId, actor.departmentIds, after?.at ?? null, after?.id ?? null, limit + 1]
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM report_exports
         WHERE ($1::text <> 'manager' OR (created_by = $2 AND scope_department_ids <@ $3::uuid[]))`,
        [actor.role, actor.userId, actor.departmentIds]
      );
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      return { items: rows.map(reportExportView), page: {
        nextCursor: hasMore && rows.at(-1) ? encodeTimelineCursor(rows.at(-1)!.created_at, rows.at(-1)!.id) : null,
        total: Number(count.rows[0]?.count ?? 0)
      } };
    });
  }

  async createExport(actor: ActorContext, input: ReportExportWrite, requestId: string): Promise<ReportExportView> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    requireBoundedDateRange(input.periodFrom, input.periodTo);
    requireScope(actor, input.departmentId);
    return withTenant(this.pool, actor, requestId, async (client) => {
      let preview: ReportPreviewView;
      let datasetChecksumSha256: string | null = null;
      let calculationVersions: string[] = [];
      let templateVersion = REPORT_TEMPLATE_VERSION;
      const periodVersionId = input.periodVersionId ?? null;
      if (periodVersionId) {
        const version = (await client.query<PeriodVersionRow>(
          `SELECT id, dataset_snapshot, dataset_checksum_sha256, calculation_versions, template_version
           FROM attendance_period_versions WHERE id = $1`, [periodVersionId]
        )).rows[0];
        if (!version) throw new AppError("NOT_FOUND", "Spremljena verzija zaključanog razdoblja nije pronađena.");
        const snapshot = parsePeriodSnapshot(version.dataset_snapshot);
        if (snapshotChecksum(snapshot) !== version.dataset_checksum_sha256) {
          throw new AppError("CONFLICT", "Checksum spremljenog dataseta nije valjan.");
        }
        preview = createLockedReportPreview(snapshot, version.id, actor, previewInput(input, MAX_EXPORT_ROWS));
        datasetChecksumSha256 = version.dataset_checksum_sha256;
        calculationVersions = jsonObject<string[]>(version.calculation_versions);
        templateVersion = version.template_version;
      } else {
        preview = await createLiveReportPreview(client, actor, previewInput(input, MAX_EXPORT_ROWS));
      }
      if (preview.truncated) {
        throw new AppError("VALIDATION_FAILED", `Izvještaj prelazi sigurnosni limit od ${MAX_EXPORT_ROWS} redaka. Suzite razdoblje ili filtre.`);
      }
      const artifact = await generateReportArtifact(preview, input, {
        datasetChecksumSha256,
        calculationVersions,
        templateVersion,
        periodVersionId
      });
      const row = (await client.query<ReportExportRow>(
        `INSERT INTO report_exports (
           organization_id, created_by, report_type, filters, format, status, dataset_version,
           dataset_checksum_sha256, period_version_id, calculation_versions, scope_department_ids,
           template_version, row_count, total_minutes, storage_key, checksum_sha256, expires_at,
           completed_at, content, mime_type, file_name
         ) VALUES ($1, $2, $3, $4::jsonb, $5, 'ready', $6, $7, $8, $9::jsonb, $10::uuid[],
           $11, $12, $13, 'postgres:report_exports', $14,
           CASE WHEN $8::uuid IS NULL THEN clock_timestamp() + interval '24 hours' ELSE NULL END,
           clock_timestamp(), $15, $16, $17)
         RETURNING id, created_by, report_type, format, status, filters, row_count, total_minutes,
           checksum_sha256, dataset_version, dataset_checksum_sha256, period_version_id,
           calculation_versions, scope_department_ids, template_version, created_at, completed_at, expires_at`,
        [actor.organizationId, actor.userId, input.reportType, JSON.stringify(input), input.format,
          preview.datasetVersion, datasetChecksumSha256, periodVersionId, JSON.stringify(calculationVersions),
          actor.role === "manager" ? actor.departmentIds : [], templateVersion, artifact.rowCount,
          artifact.officialMinutes, artifact.checksumSha256, artifact.content, artifact.mimeType, artifact.fileName]
      )).rows[0]!;
      await insertAudit(client, actor, requestId, row);
      return reportExportView(row);
    });
  }

  async getExport(actor: ActorContext, exportId: string): Promise<ReportExportView> {
    const row = await this.readExport(actor, exportId, false);
    return reportExportView(row);
  }

  async downloadExport(actor: ActorContext, exportId: string): Promise<ReportArtifact> {
    const row = await this.readExport(actor, exportId, true);
    if (row.status !== "ready" || !row.content || !row.mime_type || !row.file_name ||
      (row.expires_at && new Date(row.expires_at) <= new Date())) {
      throw new AppError("NOT_FOUND", "Izvještaj više nije dostupan za preuzimanje.");
    }
    return { content: row.content, mimeType: row.mime_type, fileName: row.file_name,
      checksumSha256: row.checksum_sha256 ?? "" };
  }

  async verifyExport(actor: ActorContext, exportId: string): Promise<ReportExportVerificationView> {
    const row = await this.readExport(actor, exportId, true);
    const artifactChecksumMatches = Boolean(row.content && row.checksum_sha256
      && createHash("sha256").update(row.content).digest("hex") === row.checksum_sha256);
    // Live exports can verify their artifact bytes, but they have no immutable
    // period dataset against which reproducibility can be proven.
    let datasetChecksumMatches = false;
    if (row.period_version_id) {
      datasetChecksumMatches = await withTenant(this.pool, actor, "verify-report-dataset", async (client) => {
        const version = (await client.query<PeriodVersionRow>(
          `SELECT id, dataset_snapshot, dataset_checksum_sha256, calculation_versions, template_version
           FROM attendance_period_versions WHERE id = $1`, [row.period_version_id]
        )).rows[0];
        if (!version) return false;
        const snapshot = parsePeriodSnapshot(version.dataset_snapshot);
        return snapshotChecksum(snapshot) === version.dataset_checksum_sha256
          && version.dataset_checksum_sha256 === row.dataset_checksum_sha256
          && version.id === row.dataset_version
          && version.template_version === row.template_version
          && JSON.stringify(jsonObject<string[]>(version.calculation_versions))
            === JSON.stringify(jsonObject<string[]>(row.calculation_versions));
      });
    }
    return { exportId: row.id, verified: artifactChecksumMatches && datasetChecksumMatches,
      artifactChecksumMatches, datasetChecksumMatches, periodVersionId: row.period_version_id,
      datasetVersion: row.dataset_version, datasetChecksumSha256: row.dataset_checksum_sha256,
      calculationVersions: jsonObject<string[]>(row.calculation_versions), templateVersion: row.template_version,
      verifiedAt: new Date().toISOString() };
  }

  private async readExport(actor: ActorContext, exportId: string, includeContent: boolean): Promise<ReportExportRow> {
    requireRole(actor, ["admin", "manager", "accountant"]);
    return withTenant(this.pool, actor, "get-report-export", async (client) => {
      const result = await client.query<ReportExportRow>(
        `${reportSelect}${includeContent ? ", content, mime_type, file_name" : ""}
         FROM report_exports WHERE id = $1`, [exportId]
      );
      const row = result.rows[0];
      if (!row) throw new AppError("NOT_FOUND", "Izvještaj nije pronađen.");
      if (!canRead(row, actor)) throw new AppError("NOT_FOUND", "Izvještaj nije pronađen.");
      return row;
    });
  }
}
