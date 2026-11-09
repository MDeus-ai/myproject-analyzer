import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FolderAnalysisStats, FolderNode, PdfOptions, ProcessedFile } from '../types';
import { formatBytes, formatDate } from './fileHelpers';
import { flattenDirectoryInventory, generateTreeText } from './treeBuilder';

interface ColorPalette {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  secondary: [number, number, number];
  headerBg: [number, number, number];
  textColor: [number, number, number];
  mutedText: [number, number, number];
}

const colorThemes: Record<PdfOptions['themeColor'], ColorPalette> = {
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

/**
 * Sanitizes a string to ensure only standard printable ASCII characters are passed
 * to jsPDF's built-in fonts, avoiding encoding glitches like '% % %' from Unicode box chars.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u2500-\u257F]/g, '-') // replace any unicode box drawing chars with hyphens
    .replace(/•/g, '|')
    .replace(/[^\x20-\x7E\t\r\n]/g, ''); // strip any non-ASCII character codes
}

/**
 * Generates a clean vector PDF representing the folder's structure, tree, and files.
 */
export function generateFolderPdf(
  rootNode: FolderNode,
  stats: FolderAnalysisStats,
  _files: ProcessedFile[],
  options: PdfOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const palette = colorThemes[options.themeColor] || colorThemes.blue;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let cursorY = margin;

  // --- Header Banner ---
  doc.setFillColor(...palette.primary);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 28, 3, 3, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const rawTitle = options.title || `Directory Structure: ${stats.rootName}`;
  doc.text(sanitizeForPdf(rawTitle), margin + 8, cursorY + 11);

  // Subtitle / metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 240, 255);
  const generatedTimeStr = `Generated: ${formatDate(Date.now())}  |  Target Folder: ${stats.rootName}`;
  doc.text(sanitizeForPdf(generatedTimeStr), margin + 8, cursorY + 19);

  cursorY += 34;

  // --- Statistics Cards Row ---
  if (options.includeStats) {
    const cardWidth = (pageWidth - margin * 2 - 9) / 4;
    const cardHeight = 18;

    const statsData = [
      { label: 'Total Files', value: stats.totalFiles.toLocaleString() },
      { label: 'Subfolders', value: stats.totalFolders.toLocaleString() },
      { label: 'Total Size', value: formatBytes(stats.totalSize) },
      { label: 'Max Depth', value: `${stats.maxDepth} levels` },
    ];

    statsData.forEach((stat, idx) => {
      const cardX = margin + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, cursorY, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...palette.primary);
      doc.text(sanitizeForPdf(stat.value), cardX + cardWidth / 2, cursorY + 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...palette.mutedText);
      doc.text(sanitizeForPdf(stat.label), cardX + cardWidth / 2, cursorY + 14, { align: 'center' });
    });

    cursorY += 24;
  }

  // --- Section 1: Visual Directory Tree ---
  if (options.includeTree) {
    // Section Heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...palette.secondary);
    doc.text('Directory Hierarchy Tree', margin, cursorY);
    cursorY += 5;

    // Use safe ASCII format for PDF rendering (uses |-- and \-- which render cleanly without gibberish)
    const treeText = generateTreeText(rootNode, {
      includeSizes: options.includeSizes,
      includeFiles: true,
      style: 'ascii',
    });

    const lines = treeText.split('\n');
    const lineHeight = options.treeStyle === 'compact' ? 3.8 : 4.4;
    const fontSize = options.treeStyle === 'compact' ? 7.5 : 8.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(fontSize);

    // Render tree with automatic page breaks
    for (let i = 0; i < lines.length; i++) {
      if (cursorY + lineHeight > pageHeight - margin - 10) {
        doc.addPage();
        cursorY = margin + 10;
        doc.setFont('courier', 'normal');
        doc.setFontSize(fontSize);
      }

      const rawLine = lines[i];
      const cleanLine = sanitizeForPdf(rawLine);
      const isDir = cleanLine.includes('/') && !cleanLine.includes('(');

      if (isDir) {
        doc.setFont('courier', 'bold');
        doc.setTextColor(...palette.primary);
      } else {
        doc.setFont('courier', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      doc.text(cleanLine, margin + 2, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 8;
  }

  // --- Section 2: Detailed Inventory Table ---
  if (options.includeInventoryTable) {
    // Check if we need a fresh page for the table
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = margin + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...palette.secondary);
    doc.text('Complete File Inventory', margin, cursorY);
    cursorY += 4;

    const inventory = flattenDirectoryInventory(rootNode);

    const tableHeaders = [
      '#',
      'Directory Path',
      'File Name',
      'Ext',
      ...(options.includeSizes ? ['Size'] : []),
      ...(options.includeDates ? ['Last Modified'] : []),
    ];

    const tableRows = inventory.map(item => {
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
      margin: { left: margin, right: margin, top: margin + 8, bottom: margin + 8 },
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: palette.headerBg,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 14, halign: 'center' },
        ...(options.includeSizes ? { 4: { cellWidth: 20, halign: 'right' } } : {}),
        ...(options.includeDates ? { 5: { cellWidth: 32, halign: 'center' } } : {}),
      },
      didDrawPage: () => {
        // Footer on each table page
        const str = `Page ${doc.internal.pages.length - 1}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth - margin, pageHeight - 6, { align: 'right' });
        doc.text(
          `Directory Structure Report: ${sanitizeForPdf(stats.rootName)}`,
          margin,
          pageHeight - 6
        );
      },
    });
  }

  // Add page numbers to non-table pages if not already handled
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
    doc.text(
      `MyProject Analyzer`,
      margin,
      pageHeight - 6
    );
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
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
