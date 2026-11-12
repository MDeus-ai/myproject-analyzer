import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FolderAnalysisStats,
  FolderNode,
  PdfOptions,
  PdfTreeFont,
  ProcessedFile,
} from "@myproject/core/types";
import { formatBytes, formatDate } from "@myproject/core/fileHelpers";
import {
  flattenDirectoryInventory,
  generateTreeRows,
  TreeRow,
} from "@myproject/core/treeBuilder";

type RGB = [number, number, number];

interface ColorPalette {
  primary: RGB;
  primaryLight: RGB;
  secondary: RGB;
  headerBg: RGB;
  textColor: RGB;
  mutedText: RGB;
}

const colorThemes: Record<PdfOptions["themeColor"], ColorPalette> = {
  blue: {
    primary: [37, 99, 235], // #2563eb
    primaryLight: [239, 246, 255],
    secondary: [30, 41, 59],
    headerBg: [37, 99, 235],
    textColor: [15, 23, 42],
    mutedText: [100, 116, 139],
  },
  indigo: {
    primary: [79, 70, 229], // #4f46e5
    primaryLight: [238, 242, 255],
    secondary: [30, 41, 59],
    headerBg: [79, 70, 229],
    textColor: [15, 23, 42],
    mutedText: [100, 116, 139],
  },
  emerald: {
    primary: [5, 150, 105], // #059669
    primaryLight: [236, 253, 245],
    secondary: [30, 41, 59],
    headerBg: [5, 150, 105],
    textColor: [15, 23, 42],
    mutedText: [100, 116, 139],
  },
  amber: {
    primary: [217, 119, 6], // #d97706
    primaryLight: [254, 243, 199],
    secondary: [30, 41, 59],
    headerBg: [217, 119, 6],
    textColor: [15, 23, 42],
    mutedText: [100, 116, 139],
  },
};

/** Maps the user-facing font option to jsPDF's built-in font names. */
const TREE_FONT_MAP: Record<PdfTreeFont, "courier" | "helvetica" | "times"> = {
  mono: "courier",
  sans: "helvetica",
  serif: "times",
};

const MM_PER_PT = 0.3528;

/* Neutral document shades — mirror the Page Sheet View card styling. */
const SLATE_50: RGB = [248, 250, 252];
const SLATE_200: RGB = [226, 232, 240];
const SLATE_300: RGB = [203, 213, 225];
const SLATE_400: RGB = [148, 163, 184];
const SLATE_700: RGB = [51, 65, 85];

/**
 * Sanitizes a string to ensure only standard printable ASCII characters are passed
 * to jsPDF's built-in fonts, avoiding encoding glitches like '% % %' from Unicode box chars.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[─-╿]/g, "-") // replace any unicode box drawing chars with hyphens
    .replace(/•/g, "|")
    .replace(/[^\x20-\x7E\t\r\n]/g, ""); // strip any non-ASCII character codes
}

/**
 * Draws a section heading with the same hairline underline rule used by the
 * Page Sheet View, plus an optional muted right-aligned label.
 * Returns the Y position content should start at.
 */
function drawSectionHeading(
  doc: jsPDF,
  title: string,
  margin: number,
  y: number,
  contentWidth: number,
  palette: ColorPalette,
  rightLabel?: string,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...palette.secondary);
  doc.text(sanitizeForPdf(title), margin, y);

  if (rightLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_400);
    doc.text(sanitizeForPdf(rightLabel), margin + contentWidth, y, {
      align: "right",
    });
  }

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.8, margin + contentWidth, y + 1.8);

  return y + 6.5;
}

/**
 * Generates a clean vector PDF representing the folder's structure, tree, and files.
 */
export function generateFolderPdf(
  rootNode: FolderNode,
  stats: FolderAnalysisStats,
  _files: ProcessedFile[],
  options: PdfOptions,
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const palette = colorThemes[options.themeColor] || colorThemes.blue;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const footerRuleY = pageHeight - 10;
  const bottomLimit = footerRuleY - 3; // content never enters the footer zone
  const contentTop = margin + 4;
  let cursorY = margin;

  // --- Header Banner ---
  doc.setFillColor(...palette.primary);
  doc.roundedRect(margin, cursorY, contentWidth, 28, 3, 3, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const rawTitle = options.title || `Directory Structure: ${stats.rootName}`;
  doc.text(sanitizeForPdf(rawTitle), margin + 8, cursorY + 11);

  // Subtitle / metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 240, 255);
  const generatedTimeStr = `Generated: ${formatDate(Date.now())}  |  Target Folder: ${stats.rootName}`;
  doc.text(sanitizeForPdf(generatedTimeStr), margin + 8, cursorY + 19);

  cursorY += 34;

  // --- Statistics Cards Row ---
  if (options.includeStats) {
    const cardWidth = (contentWidth - 9) / 4;
    const cardHeight = 18;

    const statsData = [
      { label: "Total Files", value: stats.totalFiles.toLocaleString() },
      { label: "Subfolders", value: stats.totalFolders.toLocaleString() },
      { label: "Total Size", value: formatBytes(stats.totalSize) },
      { label: "Max Depth", value: `${stats.maxDepth} levels` },
    ];

    statsData.forEach((stat, idx) => {
      const cardX = margin + idx * (cardWidth + 3);
      doc.setFillColor(...SLATE_50);
      doc.setDrawColor(...SLATE_200);
      doc.roundedRect(cardX, cursorY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...palette.primary);
      doc.text(sanitizeForPdf(stat.value), cardX + cardWidth / 2, cursorY + 8, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...palette.mutedText);
      doc.text(
        sanitizeForPdf(stat.label),
        cardX + cardWidth / 2,
        cursorY + 14,
        { align: "center" },
      );
    });

    cursorY += 24;
  }

  // --- Section 1: Visual Directory Tree (vector-rendered, card-contained) ---
  if (options.includeTree) {
    cursorY = drawSectionHeading(
      doc,
      "Directory Hierarchy Tree",
      margin,
      cursorY,
      contentWidth,
      palette,
      `${stats.totalFiles} files, ${stats.totalFolders} folders`,
    );

    const rows = generateTreeRows(rootNode, { includeFiles: true });

    // Typography — fully user-configurable.
    const treeFont = TREE_FONT_MAP[options.treeFont] || "helvetica";
    const fontSize = options.treeFontSize || 9.5; // pt
    const fontMm = fontSize * MM_PER_PT;
    const isCompact = options.treeStyle === "compact";
    const rowH = fontMm * (isCompact ? 1.5 : 1.8);
    const indent = Math.max(4, fontMm * 1.45); // horizontal step per depth level
    const cardPadX = 5;
    const cardPadY = 3.5;
    const guideW = 0.32; // connector line thickness
    const tickLen = 2.4; // horizontal elbow length
    const baseX = margin + cardPadX;
    const cardRight = margin + contentWidth;

    const renderRow = (row: TreeRow, rowTop: number): void => {
      const rowMidY = rowTop + rowH / 2;
      const rowFont = row.isRoot ? fontSize + 0.5 : fontSize;
      const rowFontMm = rowFont * MM_PER_PT;
      const baselineY = rowMidY + rowFontMm * 0.36;

      // --- Vector connector lines (crisp at any zoom, no font encoding risk) ---
      doc.setFillColor(...SLATE_300);
      if (!row.isRoot) {
        // Ancestor vertical guides
        for (let g = 0; g < row.guides.length; g++) {
          if (row.guides[g]) {
            doc.rect(baseX + g * indent, rowTop, guideW, rowH, "F");
          }
        }
        // Own connector: vertical segment + horizontal elbow tick
        const cx = baseX + (row.depth - 1) * indent;
        doc.rect(cx, rowTop, guideW, row.isLast ? rowH / 2 : rowH, "F");
        doc.rect(cx, rowMidY - guideW / 2, tickLen, guideW, "F");
      }

      const textX = row.isRoot
        ? baseX
        : baseX + (row.depth - 1) * indent + tickLen + 1.6;

      // --- Size suffix (measured first so the name can be truncated to fit) ---
      const sizeFont = Math.max(6.5, fontSize - 1.5);
      const sizeSuffix =
        !row.isRoot && options.includeSizes
          ? ` (${formatBytes(row.size)})`
          : "";

      doc.setFont(treeFont, "normal");
      doc.setFontSize(sizeFont);
      const suffixW = sizeSuffix ? doc.getTextWidth(sizeSuffix) : 0;

      // --- Name (truncated with ellipsis so it never escapes the card) ---
      doc.setFont(treeFont, row.isDirectory ? "bold" : "normal");
      doc.setFontSize(rowFont);
      let nameText = sanitizeForPdf(row.name);
      const availW = cardRight - cardPadX - 1 - textX - suffixW;
      if (doc.getTextWidth(nameText) > availW) {
        while (
          nameText.length > 1 &&
          doc.getTextWidth(`${nameText}...`) > availW
        ) {
          nameText = nameText.slice(0, -1);
        }
        nameText = `${nameText}...`;
      }

      doc.setTextColor(...(row.isDirectory ? palette.primary : SLATE_700));
      doc.text(nameText, textX, baselineY);
      const nameW = doc.getTextWidth(nameText);

      if (sizeSuffix) {
        doc.setFont(treeFont, "normal");
        doc.setFontSize(sizeFont);
        doc.setTextColor(...SLATE_400);
        doc.text(sizeSuffix, textX + nameW + 0.6, baselineY);
      }
    };

    // Paginate the tree into per-page card segments
    let rowIndex = 0;
    let segTop = cursorY;
    while (rowIndex < rows.length) {
      // Guarantee a sensible minimum segment height, else start a fresh page
      if (segTop + cardPadY * 2 + rowH * 6 > bottomLimit) {
        doc.addPage();
        segTop = contentTop;
      }

      // Continuation caption above cards on subsequent pages
      if (rowIndex > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...SLATE_400);
        doc.text("Directory Hierarchy Tree (continued)", margin, segTop + 0.5);
        segTop += 4;
      }

      const fit = Math.max(
        1,
        Math.floor((bottomLimit - segTop - cardPadY * 2) / rowH),
      );
      const segCount = Math.min(fit, rows.length - rowIndex);
      const segHeight = segCount * rowH + cardPadY * 2;

      // Card background — matches the sheet's rounded slate-50 container
      doc.setFillColor(...SLATE_50);
      doc.setDrawColor(...SLATE_200);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, segTop, contentWidth, segHeight, 2, 2, "FD");

      let rowTop = segTop + cardPadY;
      for (let k = 0; k < segCount; k++) {
        renderRow(rows[rowIndex + k], rowTop);
        rowTop += rowH;
      }
      rowIndex += segCount;
      segTop += segHeight;

      if (rowIndex < rows.length) {
        doc.addPage();
        segTop = contentTop;
      }
    }

    cursorY = segTop + 8;
  }

  // --- Section 2: Detailed Inventory Table ---
  if (options.includeInventoryTable) {
    // Check if we need a fresh page for the table
    if (cursorY > bottomLimit - 40) {
      doc.addPage();
      cursorY = contentTop;
    }

    cursorY = drawSectionHeading(
      doc,
      "Complete File Inventory",
      margin,
      cursorY,
      contentWidth,
      palette,
      `${stats.totalFiles} entries`,
    );

    const inventory = flattenDirectoryInventory(rootNode);
    const treeFont = TREE_FONT_MAP[options.treeFont] || "helvetica";
    const tableBodySize = Math.max(
      7,
      Math.min(10, (options.treeFontSize || 9.5) - 0.5),
    );

    const tableHeaders = [
      "#",
      "Directory Path",
      "File Name",
      "Ext",
      ...(options.includeSizes ? ["Size"] : []),
      ...(options.includeDates ? ["Last Modified"] : []),
    ];

    const tableRows = inventory.map((item) => {
      const row: string[] = [
        item.index.toString(),
        sanitizeForPdf(item.directory),
        sanitizeForPdf(item.filename),
        sanitizeForPdf(item.extension.toUpperCase()),
      ];
      if (options.includeSizes) {
        row.push(sanitizeForPdf(formatBytes(item.size)));
      }
      if (options.includeDates) {
        row.push(sanitizeForPdf(formatDate(item.lastModified)));
      }
      return row;
    });

    autoTable(doc, {
      startY: cursorY,
      margin: {
        left: margin,
        right: margin,
        top: contentTop,
        bottom: margin + 10,
      },
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      styles: {
        font: treeFont,
      },
      headStyles: {
        font: "helvetica",
        fillColor: palette.headerBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: Math.max(7.5, tableBodySize + 0.5),
      },
      bodyStyles: {
        fontSize: tableBodySize,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: SLATE_50,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: "auto", fontStyle: "bold" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 14, halign: "center" },
        ...(options.includeSizes
          ? { 4: { cellWidth: 20, halign: "right" } }
          : {}),
        ...(options.includeDates
          ? { 5: { cellWidth: 32, halign: "center" } }
          : {}),
      },
    });
  }

  // --- Uniform footer on every page (single pass: no overlapping stamps) ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.2);
    doc.line(margin, footerRuleY, pageWidth - margin, footerRuleY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_400);
    doc.text(
      sanitizeForPdf(
        `MyProject Analyzer  |  Directory Structure Report: ${stats.rootName}`,
      ),
      margin,
      pageHeight - 6,
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  return doc;
}

/**
 * Helper to download the generated PDF to disk.
 */
export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename);
}

/**
 * Helper to generate a data URL / Blob URL for live previewing inside an iframe.
 */
export function getPdfBlobUrl(doc: jsPDF): string {
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
