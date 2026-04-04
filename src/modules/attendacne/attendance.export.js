import ExcelJS from "exceljs";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a timestamp for display in exports.
 * @param {Date|string} dt
 * @returns {string}
 */
const fmtTime = (dt) => {
  if (!dt) return "—";
  try { return format(new Date(dt), "HH:mm"); } catch { return "—"; }
};

const fmtDate = (dt) => {
  if (!dt) return "—";
  try { return format(new Date(dt), "dd MMM yyyy"); } catch { return "—"; }
};

/**
 * Status display labels and colors for export formatting.
 */
const STATUS_CONFIG = {
  PRESENT:     { label: "Present",     hex: "22C55E" },
  LATE:        { label: "Late",        hex: "F59E0B" },
  EARLY_LEAVE: { label: "Early Leave", hex: "3B82F6" },
  ABSENT:      { label: "Absent",      hex: "EF4444" },
  PENDING:     { label: "Pending",     hex: "6B7280" },
};

const getStatusLabel = (status) => STATUS_CONFIG[status]?.label ?? status ?? "—";
const getStatusHex   = (status) => STATUS_CONFIG[status]?.hex   ?? "6B7280";

/**
 * Converts attendance rows into a flat array of export-friendly objects.
 * @param {Array} rows - DB rows from getAttendanceForExport
 */
const mapRows = (rows) =>
  rows.map((row, i) => ({
    no:          i + 1,
    empNo:       row.EMP_NO       ?? "—",
    name:        [row.TITLE, row.FIRST_NAME, row.LAST_NAME].filter(Boolean).join(" ") || "—",
    date:        fmtDate(row.ATTENDANCE_DATE),
    inTime:      fmtTime(row.IN_TIME),
    outTime:     fmtTime(row.OUT_TIME),
    shift:       row.SHIFT_NAME   ?? "—",
    shiftHours:  row.SHIFT_START && row.SHIFT_END ? `${row.SHIFT_START} – ${row.SHIFT_END}` : "—",
    status:      row.STATUS       ?? "—",
    statusLabel: getStatusLabel(row.STATUS),
    company:     row.COMPANY_NAME  ?? "—",
    location:    row.LOCATION_NAME ?? "—",
    payroll:     row.PAYROLL_FLAG  ?? "Y",
  }));

// ─────────────────────────────────────────────────────────────────────────────
//  CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a CSV string from attendance rows.
 * @param {Array}  rows    - Raw DB rows
 * @param {object} meta    - { dateLabel, companyName }
 * @returns {string}       - CSV content
 */
export const generateCSV = (rows, meta = {}) => {
  const mapped = mapRows(rows);

  const headers = [
    "#", "Emp No", "Employee Name", "Date",
    "In Time", "Out Time", "Shift", "Shift Hours",
    "Status", "Company", "Location", "Payroll",
  ];

  const lines = [
    // Meta header
    `# Attendance Report — ${meta.dateLabel ?? ""}`,
    `# Company: ${meta.companyName ?? "All"}`,
    `# Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    "",
    headers.join(","),
    ...mapped.map((r) => [
      r.no, r.empNo, `"${r.name}"`, r.date,
      r.inTime, r.outTime, `"${r.shift}"`, r.shiftHours,
      r.statusLabel, `"${r.company}"`, `"${r.location}"`, r.payroll,
    ].join(",")),
  ];

  return lines.join("\n");
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an Excel (.xlsx) buffer from attendance rows.
 * Uses ExcelJS for professional formatting with color-coded status cells.
 *
 * @param {Array}  rows    - Raw DB rows
 * @param {object} meta    - { dateLabel, companyName }
 * @returns {Buffer}       - Excel file buffer
 */
export const generateExcel = async (rows, meta = {}) => {
  const mapped  = mapRows(rows);
  const wb      = new ExcelJS.Workbook();
  const ws      = wb.addWorksheet("Attendance Report");

  // ── Workbook metadata ──────────────────────────────────────────────────
  wb.creator  = "HRMS System";
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Title row ──────────────────────────────────────────────────────────
  ws.mergeCells("A1:L1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `Attendance Report — ${meta.dateLabel ?? ""}`;
  titleCell.font  = { bold: true, size: 14, color: { argb: "FF1F2937" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // ── Meta row ───────────────────────────────────────────────────────────
  ws.mergeCells("A2:L2");
  const metaCell  = ws.getCell("A2");
  metaCell.value  = `Company: ${meta.companyName ?? "All"} | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total Records: ${mapped.length}`;
  metaCell.font   = { size: 10, color: { argb: "FF6B7280" }, italic: true };
  metaCell.alignment = { horizontal: "center" };
  ws.getRow(2).height = 20;

  ws.addRow([]); // Spacer

  // ── Column definitions ─────────────────────────────────────────────────
  ws.columns = [
    { key: "no",          header: "#",            width: 5  },
    { key: "empNo",       header: "Emp No",        width: 12 },
    { key: "name",        header: "Employee Name", width: 28 },
    { key: "date",        header: "Date",          width: 14 },
    { key: "inTime",      header: "In Time",       width: 10 },
    { key: "outTime",     header: "Out Time",      width: 10 },
    { key: "shift",       header: "Shift",         width: 18 },
    { key: "shiftHours",  header: "Shift Hours",   width: 14 },
    { key: "statusLabel", header: "Status",        width: 14 },
    { key: "company",     header: "Company",       width: 20 },
    { key: "location",    header: "Location",      width: 16 },
    { key: "payroll",     header: "Payroll",       width: 10 },
  ];

  // ── Header row styling ─────────────────────────────────────────────────
  const headerRow = ws.getRow(4);
  headerRow.values = ws.columns.map((c) => c.header);
  headerRow.eachCell((cell) => {
    cell.font         = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill         = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.alignment    = { horizontal: "center", vertical: "middle" };
    cell.border       = {
      top:    { style: "thin", color: { argb: "FF374151" } },
      bottom: { style: "thin", color: { argb: "FF374151" } },
    };
  });
  headerRow.height = 22;

  // ── Data rows ──────────────────────────────────────────────────────────
  mapped.forEach((row, idx) => {
    const dataRow = ws.addRow(row);
    const isEven  = idx % 2 === 0;

    // Zebra striping
    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font      = { size: 10 };
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
    });

    // Color-code the Status cell
    const statusCell = dataRow.getCell("statusLabel");
    const hex        = getStatusHex(row.status);
    statusCell.font  = { bold: true, color: { argb: `FF${hex}` }, size: 10 };

    dataRow.height = 18;
  });

  // ── Summary rows at the bottom ─────────────────────────────────────────
  ws.addRow([]);
  const counts = {
    PRESENT:     mapped.filter((r) => r.status === "PRESENT").length,
    LATE:        mapped.filter((r) => r.status === "LATE").length,
    EARLY_LEAVE: mapped.filter((r) => r.status === "EARLY_LEAVE").length,
    ABSENT:      mapped.filter((r) => r.status === "ABSENT").length,
  };

  const summaryRow = ws.addRow([
    "", "", `Total: ${mapped.length}`,
    "", "", "",
    `Present: ${counts.PRESENT}`,
    `Late: ${counts.LATE}`,
    `Early Leave: ${counts.EARLY_LEAVE}`,
    `Absent: ${counts.ABSENT}`,
  ]);
  summaryRow.font = { bold: true, size: 10 };

  return wb.xlsx.writeBuffer();
};

// ─────────────────────────────────────────────────────────────────────────────
//  PDF EXPORT
//  Company letterhead style using PDFKit
//  TODO: Add company logo support once file storage is available
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a PDF buffer in company letterhead style.
 * Uses PDFKit for layout.
 *
 * Layout:
 *   - Company name + report title (header)
 *   - Date range + generated date + total records
 *   - Attendance table with color-coded status
 *   - Summary footer
 *
 * TODO: Replace hardcoded company name with dynamic lookup from HR_COMPANY
 *       using companyId filter when available.
 *
 * @param {Array}  rows - Raw DB rows
 * @param {object} meta - { dateLabel, companyName }
 * @returns {Promise<Buffer>}
 */
export const generatePDF = async (rows, meta = {}) => {
  const PDFDocument = (await import("pdfkit")).default;
  const mapped = mapRows(rows);

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks = [];

    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW  = doc.page.width;
    const margin = 40;
    const usable = pageW - margin * 2;

    // ── HEADER ─────────────────────────────────────────────────────────
    // Company name
    doc
      .fontSize(18)
      .fillColor("#1F2937")
      .font("Helvetica-Bold")
      .text(meta.companyName ?? "HRMS", margin, margin, { align: "center", width: usable });

    // Report title
    doc
      .fontSize(13)
      .fillColor("#374151")
      .font("Helvetica")
      .text("Attendance Report", { align: "center", width: usable });

    // Meta line
    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .text(
        `Period: ${meta.dateLabel ?? "—"}   |   Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}   |   Total Records: ${mapped.length}`,
        { align: "center", width: usable }
      );

    // Divider
    const dividerY = doc.y + 8;
    doc
      .moveTo(margin, dividerY)
      .lineTo(pageW - margin, dividerY)
      .strokeColor("#E5E7EB")
      .lineWidth(1)
      .stroke();

    doc.moveDown(0.5);

    // ── TABLE HEADERS ──────────────────────────────────────────────────
    const colWidths = [30, 60, 120, 70, 55, 55, 80, 80, 70, 80, 80];
    const headers   = ["#", "Emp No", "Name", "Date", "In", "Out", "Shift", "Shift Hrs", "Status", "Company", "Location"];

    let x = margin;
    const headerY = doc.y;

    // Header background
    doc
      .rect(margin, headerY, usable, 18)
      .fill("#1F2937");

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
    headers.forEach((h, i) => {
      doc.text(h, x + 3, headerY + 5, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    doc.y = headerY + 20;

    // ── TABLE ROWS ─────────────────────────────────────────────────────
    const statusColors = {
      PRESENT:     "#16A34A",
      LATE:        "#D97706",
      EARLY_LEAVE: "#2563EB",
      ABSENT:      "#DC2626",
      PENDING:     "#6B7280",
    };

    mapped.forEach((row, idx) => {
      // Page break check
      if (doc.y > doc.page.height - 60) {
        doc.addPage({ margin: 40, size: "A4", layout: "landscape" });
      }

      const rowY    = doc.y;
      const rowH    = 16;
      const isEven  = idx % 2 === 0;

      // Zebra background
      if (isEven) {
        doc.rect(margin, rowY, usable, rowH).fill("#F9FAFB");
      }

      const cells = [
        row.no, row.empNo, row.name, row.date,
        row.inTime, row.outTime, row.shift, row.shiftHours,
        row.statusLabel, row.company, row.location,
      ];

      x = margin;
      doc.font("Helvetica").fontSize(8).fillColor("#374151");

      cells.forEach((cell, i) => {
        // Status cell gets special color
        if (i === 8) {
          doc.fillColor(statusColors[row.status] ?? "#374151");
          doc.font("Helvetica-Bold");
        } else {
          doc.fillColor("#374151");
          doc.font("Helvetica");
        }
        doc.text(String(cell ?? "—"), x + 3, rowY + 4, {
          width:    colWidths[i] - 4,
          ellipsis: true,
          lineBreak: false,
        });
        x += colWidths[i];
      });

      doc.y = rowY + rowH;
    });

    // ── SUMMARY FOOTER ─────────────────────────────────────────────────
    doc.moveDown(1);

    const counts = {
      PRESENT:     mapped.filter((r) => r.status === "PRESENT").length,
      LATE:        mapped.filter((r) => r.status === "LATE").length,
      EARLY_LEAVE: mapped.filter((r) => r.status === "EARLY_LEAVE").length,
      ABSENT:      mapped.filter((r) => r.status === "ABSENT").length,
    };

    doc
      .rect(margin, doc.y, usable, 20)
      .fill("#F3F4F6");

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#1F2937")
      .text(
        `Summary — Present: ${counts.PRESENT}  |  Late: ${counts.LATE}  |  Early Leave: ${counts.EARLY_LEAVE}  |  Absent: ${counts.ABSENT}`,
        margin + 8,
        doc.y - 18,
        { width: usable, align: "left" }
      );

    doc.end();
  });
};