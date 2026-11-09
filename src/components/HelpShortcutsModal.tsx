import React from 'react';
import {
  X,
  Keyboard,
  BookOpen,
  FolderMinus,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd/Ctrl + O', action: 'Open folder from computer' },
    { key: 'Cmd/Ctrl + S', action: 'Download flattened files ZIP archive' },
    { key: 'Cmd/Ctrl + P', action: 'Download structure PDF document' },
    { key: '1 / 2 / 3 / 4 / 5', action: 'Switch tabs (Files / Tree / PDF / Stats / CodeFile Analyzer)' },
    { key: 'Esc', action: 'Close any open drawer or modal' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-100 text-sm">
              Desktop Guide & Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* How It Works */}
          <div>
            <h4 className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] mb-3">
              Core Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                  <FolderMinus className="w-3.5 h-3.5" />
                  <span>Folder Stripper</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Recursively extracts every leaf file and flattens them into a single root directory.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Structure PDF</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Clean vector PDF with ASCII branch connectors, KPI metrics, and complete item inventory.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Smart Collisions</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Auto-disambiguates duplicate file names across subfolders via numbering or path prefixing.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                  <span>CodeFile Analyzer</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Identifies location from root, code file type, and bundles files into a single text document with metadata and end markers.
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] mb-3 flex items-center space-x-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Keyboard Shortcuts</span>
            </h4>
            <div className="space-y-1.5 font-mono">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80"
                >
                  <span className="text-slate-300 font-sans">{sc.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700 text-[10px]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
