'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'stl' | 'stl-binary' | 'step', filename: string) => void;
}

const FORMAT_OPTIONS = [
  { id: 'stl' as const, label: 'STL (ASCII)', icon: 'description' },
  { id: 'stl-binary' as const, label: 'STL (Binary)', icon: 'file_present' },
  { id: 'step' as const, label: 'STEP', icon: 'deployed_code' },
] as const;

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [filename, setFilename] = useState('model');
  const [format, setFormat] = useState<'stl' | 'stl-binary' | 'step'>('stl');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Icon name="file_download" className="text-cyan" />
          Export Model
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-void border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:border-cyan/50 focus:outline-none"
              placeholder="model"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                    format === f.id
                      ? 'bg-cyan/10 border-cyan/50 text-cyan'
                      : 'border-white/10 text-text-muted hover:border-white/20'
                  }`}
                >
                  <Icon name={f.icon} className="text-xl" />
                  <span className="text-[10px]">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-text-muted hover:text-text bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onExport(format, filename || 'model');
              onClose();
            }}
            className="flex-1 px-4 py-2 text-sm bg-cyan text-void font-medium rounded-lg hover:bg-cyan/90 transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
