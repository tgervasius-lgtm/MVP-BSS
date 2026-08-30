import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import ExcelJS from "exceljs";
import { generateReportArtifact } from "../../src/reports/generate.js";
import { snapshotChecksum, type AttendancePeriodSnapshot } from "../../src/services/attendance-period-snapshot.js";
import type { ReportExportWrite, ReportPreviewView } from "../../src/services/contracts.js";
import { createLockedReportPreview } from "../../src/services/report-dataset.js";

const preview: ReportPreviewView = {
  reportType: "monthly_summary",
  filters: {
    reportType: "monthly_summary",
    periodFrom: "2026-07-01",
    periodTo: "2026-07-31"
  },
  columns: [
    { key: "workerName", label: "Radnik", dataType: "text" },
    { key: "note", label: "Napomena", dataType: "text" },
    { key: "workedMinutes", label: "Odrađeno", dataType: "minutes" }
  ],
  rows: [{ workerName: "Ana Župić", note: '=HYPERLINK("https://invalid.test")', workedMinutes: 450 }],
  totals: { rowCount: 1, workedMinutes: 450, plannedMinutes: 450, balanceMinutes: 0 },
  datasetVersion: "a".repeat(64),
  truncated: false
};

function input(format: ReportExportWrite["format"]): ReportExportWrite {
  return {
    reportType: "monthly_summary",
    format,
    periodFrom: "2026-07-01",
    periodTo: "2026-07-31"
  };
}

test("CSV report is UTF-8, semicolon-delimited and neutralizes spreadsheet formulas", async () => {
  const artifact = await generateReportArtifact(preview, input("csv"));
  const text = artifact.content.toString("utf8");
  assert.equal(artifact.content.subarray(0, 3).toString("hex"), "efbbbf");
  assert.match(text, /Radnik;Napomena;Odrađeno/);
  assert.match(text, /Ana Župić;"'=HYPERLINK\(""https:\/\/invalid\.test""\)";450/);
  assert.equal(createHash("sha256").update(artifact.content).digest("hex"), artifact.checksumSha256);
});

test("XLSX report is a valid workbook with frozen headers, filters and safe text cells", async () => {
  const artifact = await generateReportArtifact(preview, input("xlsx"));
  assert.equal(artifact.content.subarray(0, 4).toString("hex"), "504b0304");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.content as never);
  const sheet = workbook.getWorksheet("Izvještaj");
  assert.ok(sheet);
  assert.equal(sheet.getCell("B5").value, `'=HYPERLINK("https://invalid.test")`);
  assert.equal(sheet.views[0]?.state, "frozen");
  assert.equal(sheet.views[0]?.ySplit, 4);
  assert.equal(sheet.views[0]?.topLeftCell, "A5");
  assert.ok(sheet.autoFilter);
  assert.equal(createHash("sha256").update(artifact.content).digest("hex"), artifact.checksumSha256);
});

test("PDF report embeds Croatian-capable fonts and returns a checksum-protected artifact", async () => {
  const artifact = await generateReportArtifact(preview, input("pdf"));
  assert.equal(artifact.content.subarray(0, 4).toString("ascii"), "%PDF");
  assert.equal(artifact.mimeType, "application/pdf");
  assert.ok(artifact.content.length > 2_000);
  assert.equal(createHash("sha256").update(artifact.content).digest("hex"), artifact.checksumSha256);
});

test("locked monthly totals exclude active and incomplete attendance and preserve provenance", async () => {
  const snapshot: AttendancePeriodSnapshot = {
    schemaVersion: "attendance-period-dataset-v1",
    organization: { id: "00000000-0000-4000-8000-000000000001", name: "BSS Test", timezone: "Europe/Zagreb" },
    period: { year: 2026, month: 7, from: "2026-07-01", to: "2026-07-31" },
    attendance: ["complete", "active", "incomplete"].map((status, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index + 2}`,
      workerId: "00000000-0000-4000-8000-000000000005", workerCode: "R-001", workerName: "Ana Župić",
      departmentId: "00000000-0000-4000-8000-000000000003", departmentName: "Operativa",
      scopeDepartmentId: "00000000-0000-4000-8000-000000000003",
      workDate: `2026-07-0${index + 1}`, shiftName: "Jutarnja", checkIn: null, checkOut: null,
      breakMinutes: 30, workedMinutes: 450, plannedMinutes: 450, status,
      calculationVersion: "attendance-v1", calculationId: null, revision: "1"
    })),
    approvedAbsences: [],
    corrections: []
  };
  const periodVersionId = "00000000-0000-4000-8000-000000000010";
  const locked = createLockedReportPreview(snapshot, periodVersionId, {
    organizationId: snapshot.organization.id, userId: "00000000-0000-4000-8000-000000000011",
    role: "admin", departmentIds: [], selfWorkerId: null, sessionId: "session-admin"
  }, { reportType: "monthly_summary", periodFrom: snapshot.period.from, periodTo: snapshot.period.to, limit: 100 });
  assert.deepEqual(locked.totals, { rowCount: 1, workedMinutes: 450, plannedMinutes: 450, balanceMinutes: 0 });
  assert.equal(locked.rows[0]?.dayCount, 1);
  assert.equal(locked.datasetVersion, periodVersionId);

  const datasetChecksumSha256 = snapshotChecksum(snapshot);
  const provenance = { datasetChecksumSha256, calculationVersions: ["attendance-v1"],
    templateVersion: "bss-report-v1.2", periodVersionId };
  const csv = await generateReportArtifact(locked, { ...input("csv"), periodVersionId }, provenance);
  const csvText = csv.content.toString("utf8");
  assert.match(csvText, new RegExp(`# dataset_checksum_sha256;${datasetChecksumSha256}`));
  assert.match(csvText, new RegExp(`# period_version_id;${periodVersionId}`));
  assert.match(csvText, /# classification;NOT_PAYROLL/);

  const xlsx = await generateReportArtifact(locked, { ...input("xlsx"), periodVersionId }, provenance);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx.content as never);
  const metadata = workbook.getWorksheet("Metapodaci");
  assert.ok(metadata);
  assert.equal(metadata.getCell("A2").value, "dataset_checksum_sha256");
  assert.equal(metadata.getCell("B2").value, datasetChecksumSha256);
  assert.equal(metadata.getCell("B5").value, periodVersionId);
  assert.equal(metadata.getCell("B6").value, "NOT_PAYROLL");
});
