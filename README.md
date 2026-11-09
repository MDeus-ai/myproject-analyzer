# MyProject Analyzer 🗂️⚡

A desktop-grade project analyzer and asset exporter built with **React 19**, **TypeScript**, and **Tailwind CSS v4**.

MyProject Analyzer allows developers to inspect nested codebases, strip away inner subfolders to extract pure flat files, export publication-grade hierarchy structure PDFs and high-DPI images without font encoding issues, and bundle codefiles with precise location and type metadata.

---

## ✨ Key Features

### 1. 🗂️ Flat File Stripper
- Recursively ingests folders via native file dialog (`webkitdirectory`) or drag-and-drop.
- Strips all inner directory paths to place every file at the root level.
- **Collision Management**:
  - `Auto-number`: Automatically resolves duplicate names (e.g. `notes.txt`, `notes (1).txt`).
  - `Prefix-path`: Preserves directory context in the filename (e.g. `docs_notes.txt`, `src_notes.txt`).
  - `Overwrite`: Keeps the latest encountered file.
- **One-Click Flat ZIP**: Download the entire flattened file collection in a single zip archive without any subfolders.

### 2. 🌲 Directory Tree Visualizer
- Interactive hierarchy explorer displaying folder depth, item counts, and cumulative byte sizes.
- Filter by file category (Code, Docs, Images, Data, Config).
- Collapsible branches with search filtering.

### 3. 📄 Structure PDF Architect (No Gibberish / Clean Fonts)
- Generates professional multi-page vector PDFs containing:
  - Metric summary cards (Total files, subfolder count, aggregate size, max depth).
  - Directory branch tree rendered using WinAnsi-safe ASCII connectors (`|-- `, `\-- `, `|   `) ensuring zero Unicode font corruption or `% % %` artifacts.
  - Comprehensive item inventory table with relative paths, extensions, file sizes, and modification dates.
- Customizable theme accent colors (Blue, Indigo, Emerald, Amber).

### 4. 🖼️ High-Res Image Export (PNG & JPEG)
- Native SVG ForeignObject rendering preserving all modern Tailwind v4 color spaces (`oklch()`).
- One-click export to 2x high-DPI PNG or JPEG images for documentation, Slack, or GitHub issues.

### 5. 💻 CodeFile Analyzer (Location & Type Bundler)
- **Relative Location Detection**: Identifies exact path from the project root (e.g., `src/components/ui/Button.tsx`).
- **File Type & Language Identification**: Recognizes 35+ formats including `.html`, `.tsx`, `.ts`, `.js`, `.jsx`, `.py`, `.css`, `.json`, `.sh`, `.sql`, `.yaml`, `.md`, `.env`, and more.
- **Structured 3-Part Output Format**:
  1. **Top Metadata**: File location in project, file name, file type, line count, and byte size.
  2. **Code Body**: Unmodified, pristine code contents.
  3. **End Marker**: Explicit indicator of file completion (`END OF FILE: <relative_path>`).
- **Multi-File Combiner**:
  - Select files individually, by language extension, or via presets (`All Code`, `Frontend Only`, `Backend Only`).
  - Generates a unified master text file with an automatic Table of Contents, line numbers, and token count estimator.
  - Copy to clipboard or download as `.txt` / `.md`.

### 6. 🛡️ Heavy Folder Auto-Exclusion & Pre-Import Warning
- Automatically detects heavy dependency, version control, and build directories (`node_modules`, `.git`, `dist`, `build`, `.next`, `__pycache__`, `.venv`, `vendor`).
- **Pre-Import Modal Warning**: Displays an interactive checklist with item counts and descriptions *before* the project is imported into memory, protecting against browser freezes and cluttered files.
- **Selective Override**: Check or uncheck individual detected folders or choose "Include Everything" if needed.
- **Live Exclusion Status Pill**: Top desktop header displays the number of excluded folders and skipped items with one-click review.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/myproject-analyzer.git

# Navigate into the project directory
cd myproject-analyzer

# Install dependencies
npm install
```

### Development

Run the Vite local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Create an optimized static build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Image Generation**: [html-to-image](https://github.com/bubkoo/html-to-image)
- **Archive Bundling**: [JSZip](https://stuk.github.io/jszip/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Project Structure

```text
├── index.html                   # Entry HTML with meta & fonts
├── package.json                 # Project dependencies & scripts
├── vite.config.ts               # Vite configuration
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Application shell & state manager
│   ├── index.css                # Global Tailwind CSS imports
│   ├── types/
│   │   └── index.ts             # Core TypeScript interfaces
│   ├── utils/
│   │   ├── codeAnalyzer.ts      # CodeFile Analyzer core logic
│   │   ├── treeBuilder.ts       # Hierarchy builder & ASCII tree formatter
│   │   ├── pdfGenerator.ts      # Multi-page vector PDF architect
│   │   ├── imageExporter.ts     # High-DPI PNG/JPEG image renderer
│   │   ├── collisionResolver.ts # File renaming collision strategies
│   │   ├── folderReader.ts      # Recursive drag-and-drop & folder picker
│   │   ├── zipExporter.ts       # Flat ZIP archive generator
│   │   ├── fileHelpers.ts       # Byte sizing & file category helpers
│   │   └── sampleProject.ts     # Demo project mock files for instant preview
│   └── components/
│       ├── DesktopHeader.tsx    # macOS style desktop titlebar & navigation
│       ├── FlatFilesView.tsx    # Stripped flat files viewer with collision controls
│       ├── DirectoryTreeView.tsx# Nested hierarchy tree viewer
│       ├── PdfArchitectView.tsx # PDF & Image generator preview & controls
│       ├── CodeAnalyzerView.tsx # CodeFile Analyzer workspace & bundler
│       ├── AnalyticsView.tsx    # Extension distribution & collision audit
│       ├── FilePreviewModal.tsx # Quick file preview modal
│       └── HelpShortcutsModal.tsx # Keyboard shortcuts & guide modal
```

---

## 📄 License

MIT License. Free for personal and commercial use.
