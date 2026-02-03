'use client';

import React, { useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface ImportedFile {
  name: string;
  type: 'stl' | 'kcl';
  data: {
    vertices?: [number, number, number][];
    indices?: number[];
    kclCode?: string;
  };
}

interface FileTreeProps {
  importedFiles: ImportedFile[];
  onFileImport: (file: File) => void;
  onFileSelect: (file: ImportedFile) => void;
  selectedFile: ImportedFile | null;
}

export function FileTree({ importedFiles, onFileImport, onFileSelect, selectedFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    chair: true,
    meshes: true,
    imported: true,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.name.endsWith('.stl') || file.name.endsWith('.kcl')) {
        onFileImport(file);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => onFileImport(file));
    }
  };

  return (
    <aside
      className={`w-60 flex flex-col bg-surface border-r border-white/5 shrink-0 ${isDragging ? 'ring-2 ring-cyan ring-inset' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
    >
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Explorer</span>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost p-1 rounded hover:bg-cyan/20 hover:text-cyan"
            title="Import STL/KCL"
          >
            <Icon name="upload_file" className="text-base" />
          </button>
          <button className="btn-ghost p-1 rounded">
            <Icon name="more_horiz" className="text-base" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.kcl"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          <button
            onClick={() => toggleExpand('chair')}
            className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
          >
            <Icon
              name={expanded['chair'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
              className="text-base text-text-dim"
            />
            <Icon name="inventory_2" className="text-base text-cyan" />
            <span className="text-[13px] text-text">Chair_v2</span>
          </button>

          {expanded['chair'] && (
            <div className="ml-4 border-l border-white/5 pl-2">
              <button
                onClick={() => toggleExpand('meshes')}
                className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
              >
                <Icon
                  name={expanded['meshes'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                  className="text-base text-text-dim"
                />
                <Icon name="polyline" className="text-base text-orange" />
                <span className="text-[13px] text-text-muted">Meshes</span>
              </button>
              {expanded['meshes'] && (
                <div className="ml-4 border-l border-white/5 pl-2">
                  {['Seat_Base', 'Back_Support', 'Armrest_L', 'Armrest_R'].map((mesh, i) => (
                    <button
                      key={mesh}
                      className={`tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md ${i === 0 ? 'active' : ''}`}
                    >
                      <Icon name="view_in_ar" className="text-base text-green" />
                      <span className="text-[13px] text-text-muted">{mesh}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md">
                <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
                <Icon name="texture" className="text-base text-cyan-dim" />
                <span className="text-[13px] text-text-muted">Materials</span>
              </button>
              <button className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md">
                <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
                <Icon name="lightbulb" className="text-base text-orange" />
                <span className="text-[13px] text-text-muted">Lights</span>
              </button>
            </div>
          )}

          {importedFiles.length > 0 && (
            <>
              <button
                onClick={() => toggleExpand('imported')}
                className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md mt-2"
              >
                <Icon
                  name={expanded['imported'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                  className="text-base text-text-dim"
                />
                <Icon name="cloud_upload" className="text-base text-green" />
                <span className="text-[13px] text-text">Imported ({importedFiles.length})</span>
              </button>
              {expanded['imported'] && (
                <div className="ml-4 border-l border-white/5 pl-2">
                  {importedFiles.map((file, i) => (
                    <button
                      key={`${file.name}-${i}`}
                      onClick={() => onFileSelect(file)}
                      className={`tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md ${
                        selectedFile?.name === file.name ? 'active bg-cyan/10' : ''
                      }`}
                    >
                      <Icon
                        name={file.type === 'stl' ? 'view_in_ar' : 'code'}
                        className={`text-base ${file.type === 'stl' ? 'text-orange' : 'text-cyan'}`}
                      />
                      <span className="text-[13px] text-text-muted truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {isDragging && (
            <div className="mt-4 p-4 border-2 border-dashed border-cyan/50 rounded-lg text-center">
              <Icon name="cloud_upload" className="text-2xl text-cyan mb-2" />
              <p className="text-xs text-cyan">Drop STL/KCL files here</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] text-text-dim">
          <span className="uppercase tracking-wider">Memory</span>
          <span className="font-mono text-cyan">2.4 / 8 GB</span>
        </div>
      </div>
    </aside>
  );
}
