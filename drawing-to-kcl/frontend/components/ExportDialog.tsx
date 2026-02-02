import React, { useState } from 'react';
import { 
  exportAndDownload, 
  ExportFormat, 
  FORMAT_INFO, 
  MeshData 
} from '../lib/exportEngine';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meshes: MeshData[];
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  meshes,
}) => {
  const [format, setFormat] = useState<ExportFormat>('glb');
  const [filename, setFilename] = useState('model');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    
    try {
      await exportAndDownload(meshes, { format, filename });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const hasMeshes = meshes && meshes.length > 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">모델 내보내기</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Filename input */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              파일명
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="model"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              파일 형식
            </label>
            <div className="space-y-2">
              {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((fmt) => (
                <label
                  key={fmt}
                  className={`flex items-start p-3 rounded-md cursor-pointer transition-colors ${
                    format === fmt 
                      ? 'bg-cyan-900/30 border border-cyan-500' 
                      : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={fmt}
                    checked={format === fmt}
                    onChange={() => setFormat(fmt)}
                    className="mt-0.5 mr-3 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {FORMAT_INFO[fmt].label}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {FORMAT_INFO[fmt].description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Mesh info */}
          <div className="text-sm text-zinc-400">
            {hasMeshes ? (
              <>내보낼 메시: {meshes.length}개</>
            ) : (
              <span className="text-amber-500">⚠️ 내보낼 메시가 없습니다</span>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-md text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleExport}
            disabled={!hasMeshes || isExporting || !filename.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                내보내는 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                내보내기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
