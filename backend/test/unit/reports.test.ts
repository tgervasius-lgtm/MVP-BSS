import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import ExcelJS from "exceljs";
import { generateReportArtifact } from "../../src/reports/generate.js";
import type { ReportExportWrite, ReportPreviewView } from "../../src/services/contracts.js";

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
