import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { ReportArtifact, ReportExportWrite, ReportPreviewView } from "../services/contracts.js";

type GeneratedArtifact = ReportArtifact & { rowCount: number; officialMinutes: number };

const reportLabels: Record<ReportPreviewView["reportType"], string> = {
  monthly_summary: "Mjesečni sažetak",
  attendance_journal: "Dnevnik evidencije",
  exceptions: "Zapisi za provjeru",
  approved_absences: "Odobrene odsutnosti",
  correction_log: "Korekcije evidencije"
};

function cellText(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  return value;
}

function csvEscape(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function spreadsheetText(value: string | number | null): string {
  const text = cellText(value);
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function fileStem(input: ReportExportWrite): string {
  return `BSS_${input.reportType}_${input.periodFrom}_${input.periodTo}`.replace(/[^A-Za-z0-9._-]/g, "_");
}

function checksum(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function csvArtifact(preview: ReportPreviewView, input: ReportExportWrite): GeneratedArtifact {
  const rows = [
    preview.columns.map((column) => csvEscape(column.label)).join(";"),
    ...preview.rows.map((row) => preview.columns.map((column) => csvEscape(spreadsheetText(row[column.key] ?? null))).join(";"))
  ];
  const content = Buffer.from(`\uFEFF${rows.join("\r\n")}\r\n`, "utf8");
  return {
    content,
    mimeType: "text/csv; charset=utf-8",
    fileName: `${fileStem(input)}.csv`,
    checksumSha256: checksum(content),
    rowCount: preview.totals.rowCount,
    officialMinutes: preview.totals.workedMinutes
  };
}

async function xlsxArtifact(preview: ReportPreviewView, input: ReportExportWrite): Promise<GeneratedArtifact> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bognar Smart Systems";
  workbook.company = "Bognar Smart Systems";
  workbook.created = new Date();
  workbook.modified = new Date();
  const sheet = workbook.addWorksheet("Izvještaj", {
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  sheet.mergeCells(1, 1, 1, Math.max(preview.columns.length, 1));
  const title = sheet.getCell(1, 1);
  title.value = `BSS · ${reportLabels[preview.reportType]}`;
  title.font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FF0F3D36" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, Math.max(preview.columns.length, 1));
  const meta = sheet.getCell(2, 1);
  meta.value = `Razdoblje ${input.periodFrom} – ${input.periodTo} · Dataset ${preview.datasetVersion.slice(0, 12)}`;
  meta.font = { name: "Aptos", size: 10, color: { argb: "FF52605D" } };

  const headerRow = sheet.getRow(4);
  preview.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.label;
    cell.font = { name: "Aptos", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF0A554F" } } };
  });
  headerRow.height = 24;

  preview.rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 5);
    preview.columns.forEach((column, columnIndex) => {
      const value = row[column.key] ?? null;
      const cell = excelRow.getCell(columnIndex + 1);
      if (column.dataType === "minutes" && typeof value === "number") {
        cell.value = value / 60;
        cell.numFmt = '0.00 "h";[Red]-0.00 "h"';
      } else {
        cell.value = typeof value === "string" ? spreadsheetText(value) : value;
      }
      cell.font = { name: "Aptos", size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.fill = rowIndex % 2 === 1
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7F6" } }
        : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    });
  });

  const totalRowNumber = preview.rows.length + 6;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.getCell(1).value = `Ukupno redaka: ${preview.totals.rowCount}`;
  totalRow.getCell(1).font = { name: "Aptos", bold: true, color: { argb: "FF0F3D36" } };
  if (preview.columns.length > 1) {
    totalRow.getCell(2).value = `Odrađeno: ${(preview.totals.workedMinutes / 60).toFixed(2)} h`;
    totalRow.getCell(2).font = { name: "Aptos", bold: true };
  }
  if (preview.columns.length > 2) {
    totalRow.getCell(3).value = `Saldo: ${(preview.totals.balanceMinutes / 60).toFixed(2)} h`;
    totalRow.getCell(3).font = { name: "Aptos", bold: true };
  }

  sheet.views = [{ state: "frozen", ySplit: 4 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, preview.rows.length + 4), column: preview.columns.length } };
  preview.columns.forEach((column, index) => {
    const values = [column.label, ...preview.rows.map((row) => cellText(row[column.key] ?? null))];
    const width = Math.min(36, Math.max(12, ...values.map((value) => value.length + 2)));
    sheet.getColumn(index + 1).width = width;
  });
  sheet.headerFooter.oddFooter = "BSS · Povjerljivo · Stranica &P / &N";

  const content = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    content,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: `${fileStem(input)}.xlsx`,
    checksumSha256: checksum(content),
    rowCount: preview.totals.rowCount,
    officialMinutes: preview.totals.workedMinutes
  };
}

async function pdfArtifact(preview: ReportPreviewView, input: ReportExportWrite): Promise<GeneratedArtifact> {
  const require = createRequire(import.meta.url);
  const regularPath = require.resolve("@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff");
  const semiboldPath = require.resolve("@fontsource/noto-sans/files/noto-sans-latin-ext-600-normal.woff");
  const [regular, semibold] = await Promise.all([readFile(regularPath), readFile(semiboldPath)]);
  const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 30, info: { Title: reportLabels[preview.reportType], Author: "Bognar Smart Systems" } });
  document.registerFont("BSS Regular", regular);
  document.registerFont("BSS Semibold", semibold);
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.once("end", () => resolve(Buffer.concat(chunks)));
    document.once("error", reject);
  });

  const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
  const widths = preview.columns.map((column) => Math.max(60, Math.min(150, column.label.length * 7 + 42)));
  const factor = pageWidth / widths.reduce((sum, value) => sum + value, 0);
  const columnWidths = widths.map((width) => width * factor);
  const rowHeight = 20;

  const drawHeader = (): number => {
    document.font("BSS Semibold").fontSize(16).fillColor("#0f3d36").text(`BSS · ${reportLabels[preview.reportType]}`);
    document.font("BSS Regular").fontSize(8).fillColor("#52605d")
      .text(`Razdoblje ${input.periodFrom} – ${input.periodTo} · Dataset ${preview.datasetVersion.slice(0, 12)}`);
    let x = document.page.margins.left;
    const y = document.y + 10;
    preview.columns.forEach((column, index) => {
      document.rect(x, y, columnWidths[index] ?? 60, rowHeight).fill("#0f766e");
      document.font("BSS Semibold").fontSize(7).fillColor("#ffffff")
        .text(column.label, x + 4, y + 6, { width: (columnWidths[index] ?? 60) - 8, ellipsis: true });
      x += columnWidths[index] ?? 60;
    });
    return y + rowHeight;
  };

  let y = drawHeader();
  preview.rows.forEach((row, rowIndex) => {
    if (y + rowHeight > document.page.height - document.page.margins.bottom - 18) {
      document.addPage();
      y = drawHeader();
    }
    let x = document.page.margins.left;
    const background = rowIndex % 2 ? "#f3f7f6" : "#ffffff";
    preview.columns.forEach((column, index) => {
      const width = columnWidths[index] ?? 60;
      document.rect(x, y, width, rowHeight).fill(background);
      const value = row[column.key] ?? null;
      const formatted = column.dataType === "minutes" && typeof value === "number" ? `${(value / 60).toFixed(2)} h` : cellText(value);
      document.font("BSS Regular").fontSize(7).fillColor("#17211f")
        .text(formatted, x + 4, y + 6, { width: width - 8, ellipsis: true, lineBreak: false });
      x += width;
    });
    y += rowHeight;
  });
  document.font("BSS Semibold").fontSize(8).fillColor("#0f3d36")
    .text(`Ukupno redaka: ${preview.totals.rowCount} · Odrađeno: ${(preview.totals.workedMinutes / 60).toFixed(2)} h · Saldo: ${(preview.totals.balanceMinutes / 60).toFixed(2)} h`, document.page.margins.left, y + 10);
  document.font("BSS Regular").fontSize(7).fillColor("#52605d")
    .text("Bognar Smart Systems · Povjerljivi poslovni izvještaj", document.page.margins.left, document.page.height - 22, { align: "center", width: pageWidth });
  document.end();
  const content = await finished;
  return {
    content,
    mimeType: "application/pdf",
    fileName: `${fileStem(input)}.pdf`,
    checksumSha256: checksum(content),
    rowCount: preview.totals.rowCount,
    officialMinutes: preview.totals.workedMinutes
  };
}

export async function generateReportArtifact(preview: ReportPreviewView, input: ReportExportWrite): Promise<GeneratedArtifact> {
  if (input.format === "csv") return csvArtifact(preview, input);
  if (input.format === "xlsx") return xlsxArtifact(preview, input);
  return pdfArtifact(preview, input);
}
