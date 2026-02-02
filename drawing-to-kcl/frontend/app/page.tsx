'use client';

import React, { useState, useCallback, useRef } from 'react';
import { KclPreview3D, FaceSelection } from '@/components/KclPreview3D';
import { buildGeometrySpecFromKcl, exportToSTL, exportToSTLBinary, exportToSTEP } from '@/lib/geometryRuntime';
import { buildArtifactGraphFromGeometry, extractMeshes } from '@/lib/types/artifactGraph';
import { importSTLFile, meshToApproximateKCL, normalizeMesh } from '@/lib/stlImporter';
import { SketchCanvas } from '@/components/SketchCanvas';
import { SketchToolbar, SketchInfoPanel, SketchFinishDialog } from '@/components/SketchToolbar';
import { 
  SketchState, 
  SketchTool, 
  SketchPlane,
  Point2D,
  createInitialSketchState,
  getDefaultPlaneConfig,
  generateSketchProfileKCL,
  generateExtrudeFromSketchKCL,
} from '@/lib/sketchEngine';
import { useHistory, detectChangeLabel } from '@/hooks/useHistory';
import { HistoryPanel } from '@/components/HistoryPanel';

// KCL 코드를 프리뷰 데이터로 변환
function kclCodeToPreview(kclCode: string) {
  const spec = buildGeometrySpecFromKcl(kclCode);
  const graph = buildArtifactGraphFromGeometry(spec);
  const meshes = extractMeshes(graph);
  return { 
    meshes: meshes.map(m => ({ 
      id: m.id, 
      vertices: m.vertices as [number, number, number][], 
      indices: m.indices 
    })),
    spec,
    graph
  };
}

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORT MODAL
// ═══════════════════════════════════════════════════════════════
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'stl' | 'stl-binary' | 'step', filename: string) => void;
}

function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
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
              {[
                { id: 'stl' as const, label: 'STL (ASCII)', icon: 'description' },
                { id: 'stl-binary' as const, label: 'STL (Binary)', icon: 'file_present' },
                { id: 'step' as const, label: 'STEP', icon: 'deployed_code' },
              ].map((f) => (
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

// ═══════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════
interface HeaderProps {
  onExportClick: () => void;
}

function Header({ onExportClick }: HeaderProps) {
  const [activeMode, setActiveMode] = useState('design');

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-surface border-b border-white/5 shrink-0 z-50">
      {/* Left: Logo + Menu */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="relative size-7 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan/20 rounded-md blur-sm" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text">FORGE</span>
          <span className="text-[10px] font-medium text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">BETA</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <nav className="flex items-center gap-1">
          {['File', 'Edit', 'Model', 'Render', 'Help'].map((item) => (
            <button
              key={item}
              className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text hover:bg-white/5 rounded transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* Center: Mode Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div className="flex bg-void rounded-lg p-0.5 border border-white/5">
          {[
            { id: 'design', label: 'Design', icon: 'edit' },
            { id: 'simulate', label: 'Simulate', icon: 'play_arrow' },
            { id: 'render', label: 'Render', icon: 'photo_camera' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeMode === mode.id
                  ? 'bg-cyan text-void'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon name={mode.icon} className="text-sm" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted bg-void border border-white/5 rounded-lg hover:border-white/10 hover:text-text transition-all">
          <Icon name="search" className="text-sm" />
          <span>Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/5 rounded border border-white/10">⌘K</kbd>
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button 
          onClick={onExportClick}
          className="btn-primary flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
        >
          <Icon name="file_download" className="text-sm" />
          Export
        </button>

        <div className="flex gap-1">
          <button className="btn-ghost p-2 rounded-lg" aria-label="Settings">
            <Icon name="settings" className="text-lg" />
          </button>
          <button className="btn-ghost p-2 rounded-lg" aria-label="Account">
            <Icon name="account_circle" className="text-lg" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAV COMPONENT
// ═══════════════════════════════════════════════════════════════
function SidebarNav() {
  const [activeItem, setActiveItem] = useState('files');

  const items = [
    { id: 'home', icon: 'home' },
    { id: 'files', icon: 'folder_open' },
    { id: 'objects', icon: 'deployed_code' },
    { id: 'layers', icon: 'layers' },
    { id: 'materials', icon: 'palette' },
  ];

  const bottomItems = [
    { id: 'extensions', icon: 'extension' },
    { id: 'settings', icon: 'tune' },
  ];

  return (
    <aside className="w-12 flex flex-col items-center py-3 gap-1 bg-surface border-r border-white/5 shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveItem(item.id)}
          className={`p-2.5 rounded-lg transition-all ${
            activeItem === item.id
              ? 'bg-cyan/10 text-cyan'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
        >
          <Icon name={item.icon} className="text-xl" />
        </button>
      ))}

      <div className="flex-1" />

      {bottomItems.map((item) => (
        <button
          key={item.id}
          className="p-2.5 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
        >
          <Icon name={item.icon} className="text-xl" />
        </button>
      ))}
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE TREE COMPONENT
// ═══════════════════════════════════════════════════════════════
interface ImportedFile {
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

function FileTree({ importedFiles, onFileImport, onFileSelect, selectedFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'chair': true,
    'meshes': true,
    'imported': true,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.name.endsWith('.stl') || file.name.endsWith('.kcl')) {
        onFileImport(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => onFileImport(file));
    }
  };

  return (
    <aside 
      className={`w-60 flex flex-col bg-surface border-r border-white/5 shrink-0 ${isDragging ? 'ring-2 ring-cyan ring-inset' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
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
            <Icon name={expanded['chair'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} className="text-base text-text-dim" />
            <Icon name="inventory_2" className="text-base text-cyan" />
            <span className="text-[13px] text-text">Chair_v2</span>
          </button>

          {expanded['chair'] && (
            <div className="ml-4 border-l border-white/5 pl-2">
              <button
                onClick={() => toggleExpand('meshes')}
                className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
              >
                <Icon name={expanded['meshes'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} className="text-base text-text-dim" />
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

          {/* Imported Files Section */}
          {importedFiles.length > 0 && (
            <>
              <button
                onClick={() => toggleExpand('imported')}
                className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md mt-2"
              >
                <Icon name={expanded['imported'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} className="text-base text-text-dim" />
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

          {/* Drop Zone Hint */}
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

// ═══════════════════════════════════════════════════════════════
// VIEWPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
interface ViewportProps {
  preview: { meshes: { id?: string | null; vertices: [number, number, number][]; indices: number[] }[] } | null;
  onApplyOperation?: (operation: string, params: Record<string, number | string>) => void;
}

function Viewport({ preview, onApplyOperation }: ViewportProps) {
  const [activeTool, setActiveTool] = useState('select');
  const [editMode, setEditMode] = useState(false);
  const [selectedFace, setSelectedFace] = useState<FaceSelection | null>(null);
  const [extrudeDistance, setExtrudeDistance] = useState(1);
  const [filletRadius, setFilletRadius] = useState(0.2);
  const hasPreview = preview && preview.meshes && preview.meshes.length > 0;

  const tools = [
    { id: 'select', icon: 'near_me', label: 'Select (View Mode)' },
    { id: 'edit', icon: 'edit', label: 'Edit Mode' },
  ];

  const editTools = [
    { id: 'extrude', icon: 'open_in_new', label: 'Extrude (Push/Pull)' },
    { id: 'fillet', icon: 'rounded_corner', label: 'Fillet' },
    { id: 'move_face', icon: 'open_with', label: 'Move Face' },
  ];

  const viewTools = [
    { id: 'grid', icon: 'grid_on', label: 'Toggle Grid' },
    { id: 'snap', icon: 'filter_center_focus', label: 'Snap' },
    { id: 'orthographic', icon: 'crop_free', label: 'Orthographic' },
  ];

  const handleFaceSelect = useCallback((selection: FaceSelection | null) => {
    setSelectedFace(selection);
  }, []);

  const handleApplyExtrude = useCallback(() => {
    if (selectedFace && onApplyOperation) {
      onApplyOperation('extrude', {
        meshId: selectedFace.meshId || 'mesh_0',
        faceIndex: selectedFace.faceIndex,
        distance: extrudeDistance,
        normalX: selectedFace.normal[0],
        normalY: selectedFace.normal[1],
        normalZ: selectedFace.normal[2],
      });
      setSelectedFace(null);
    }
  }, [selectedFace, extrudeDistance, onApplyOperation]);

  const handleApplyFillet = useCallback(() => {
    if (selectedFace && onApplyOperation) {
      onApplyOperation('fillet', {
        meshId: selectedFace.meshId || 'mesh_0',
        radius: filletRadius,
      });
      setSelectedFace(null);
    }
  }, [selectedFace, filletRadius, onApplyOperation]);

  return (
    <main className="flex-1 relative flex flex-col bg-void min-w-0 min-h-0">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 z-10 glow-cyan">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTool(tool.id);
              setEditMode(tool.id === 'edit');
              if (tool.id !== 'edit') setSelectedFace(null);
            }}
            className={`p-2 rounded-lg transition-all ${
              activeTool === tool.id
                ? 'bg-cyan text-void'
                : 'text-text-muted hover:text-text hover:bg-white/5'
            }`}
            title={tool.label}
          >
            <Icon name={tool.icon} className="text-lg" />
          </button>
        ))}

        {editMode && (
          <>
            <div className="w-px h-6 bg-white/10 mx-1" />
            {editTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-2 rounded-lg transition-all ${
                  activeTool === tool.id
                    ? 'bg-orange text-void'
                    : 'text-text-muted hover:text-text hover:bg-white/5'
                }`}
                title={tool.label}
              >
                <Icon name={tool.icon} className="text-lg" />
              </button>
            ))}
          </>
        )}

        <div className="w-px h-6 bg-white/10 mx-1" />

        {viewTools.map((tool) => (
          <button
            key={tool.id}
            className="p-2 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
            title={tool.label}
          >
            <Icon name={tool.icon} className="text-lg" />
          </button>
        ))}
      </div>

      {/* Face Selection Panel */}
      {editMode && selectedFace && (
        <div className="absolute top-20 right-4 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 z-10 w-64">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Selected Face</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Face Index:</span>
              <span className="text-cyan font-mono">{selectedFace.faceIndex}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Normal:</span>
              <span className="text-cyan font-mono text-xs">
                [{selectedFace.normal.map(n => n.toFixed(2)).join(', ')}]
              </span>
            </div>
          </div>
          
          {activeTool === 'extrude' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="text-xs text-text-muted uppercase tracking-wider">Extrude Distance</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={extrudeDistance}
                  onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-cyan font-mono w-12 text-right">{extrudeDistance.toFixed(1)}</span>
              </div>
              <button
                onClick={handleApplyExtrude}
                className="w-full mt-3 btn-primary py-2 rounded-lg text-sm font-medium"
              >
                Apply Extrude
              </button>
            </div>
          )}

          {activeTool === 'fillet' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="text-xs text-text-muted uppercase tracking-wider">Fillet Radius</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={filletRadius}
                  onChange={(e) => setFilletRadius(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-cyan font-mono w-12 text-right">{filletRadius.toFixed(2)}</span>
              </div>
              <button
                onClick={handleApplyFillet}
                className="w-full mt-3 btn-primary py-2 rounded-lg text-sm font-medium"
              >
                Apply Fillet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Mode Indicator */}
      {editMode && (
        <div className="absolute top-4 left-4 bg-orange/20 border border-orange/30 rounded-lg px-3 py-1.5 z-10">
          <span className="text-xs font-medium text-orange">EDIT MODE</span>
          <span className="text-xs text-text-muted ml-2">Click faces to select</span>
        </div>
      )}

      {/* Viewport Grid / 3D Preview */}
      <div className="flex-1 relative overflow-hidden viewport-grid flex items-center justify-center">
        {hasPreview ? (
          <div className="w-full h-full">
            <KclPreview3D 
              preview={preview} 
              editMode={editMode}
              selectedFace={selectedFace}
              onFaceSelect={handleFaceSelect}
            />
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-gradient-radial from-cyan/10 via-transparent to-transparent blur-3xl" />
            <div className="text-center text-text-muted relative z-10">
              <Icon name="view_in_ar" className="text-6xl mb-4 text-cyan/30" />
              <p className="text-sm">KCL 코드를 입력하면 3D 프리뷰가 표시됩니다</p>
              <p className="text-xs mt-2 text-text-dim font-mono">예: let myBox = box(size: [1, 2, 3], center: [0, 0, 0])</p>
              <p className="text-xs mt-1 text-text-dim font-mono">cylinder(radius: 0.5, height: 2, center: [0, 0, 0])</p>
              <p className="text-xs mt-1 text-text-dim font-mono">sphere(radius: 1, center: [0, 0, 0])</p>
              <p className="text-xs mt-1 text-text-dim font-mono">cone(radius: 0.5, height: 2, center: [0, 0, 0])</p>
            </div>
          </div>
        )}

        {/* Bottom Left Info */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
            <div className="size-2 rounded-full bg-green animate-pulse" />
            <span className="text-[11px] font-mono text-text-muted">60 FPS</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] font-mono text-text-muted">
              {hasPreview ? `${preview.meshes.length} mesh` : '0 mesh'}
            </span>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="add" className="text-lg" />
          </button>
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="remove" className="text-lg" />
          </button>
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="crop_free" className="text-lg" />
          </button>
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-white/5 bg-surface/80 backdrop-blur-sm px-4 shrink-0">
        <div className="flex gap-1">
          {['Viewport', 'Wireframe', 'Node Editor', 'UV Map'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                i === 0
                  ? 'text-cyan'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAT PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════
interface Message {
  type: 'user' | 'ai' | 'system';
  content: string;
  kclCode?: string;
  time: string;
  isLoading?: boolean;
}

interface ChatPanelProps {
  onSubmitCode: (code: string) => void;
  kclCode: string;
}

function ChatPanel({ onSubmitCode, kclCode }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'ai' | 'code'>('ai');

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage: Message = {
      type: 'user',
      content: message.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    const inputText = message.trim();
    setMessage('');

    if (mode === 'code') {
      onSubmitCode(inputText);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-kcl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API 오류');
      }

      const aiMessage: Message = {
        type: 'ai',
        content: data.kclCode,
        kclCode: data.kclCode,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMessage]);
      onSubmitCode(data.kclCode);
    } catch (error) {
      const errorMessage: Message = {
        type: 'system',
        content: `오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside className="w-80 flex flex-col bg-surface border-l border-white/5 shrink-0">
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name={mode === 'ai' ? 'auto_awesome' : 'code'} className="text-lg text-cyan" />
          </div>
          <span className="text-sm font-semibold text-text">{mode === 'ai' ? 'AI Assistant' : 'KCL Editor'}</span>
        </div>
        <div className="flex gap-1">
          <button 
            className={`p-1.5 rounded transition-colors ${mode === 'ai' ? 'bg-cyan/20 text-cyan' : 'btn-ghost'}`}
            onClick={() => setMode('ai')}
            title="AI 모드"
          >
            <Icon name="auto_awesome" className="text-base" />
          </button>
          <button 
            className={`p-1.5 rounded transition-colors ${mode === 'code' ? 'bg-cyan/20 text-cyan' : 'btn-ghost'}`}
            onClick={() => setMode('code')}
            title="코드 모드"
          >
            <Icon name="code" className="text-base" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Icon name={mode === 'ai' ? 'auto_awesome' : 'terminal'} className="text-4xl text-text-dim mb-3" />
            <p className="text-sm text-text-muted">
              {mode === 'ai' ? '만들고 싶은 3D 모델을 설명하세요' : 'KCL 코드를 입력하세요'}
            </p>
            <p className="text-xs text-text-dim mt-2">
              {mode === 'ai' 
                ? '예: "간단한 테이블 만들어줘"' 
                : '예: let box1 = box(size: [2, 1, 1], center: [0, 0, 0])'}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className="animate-fade-in-up flex flex-col gap-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {msg.type === 'user' && (
                <div className="message-user rounded-2xl rounded-tr-md px-4 py-3">
                  <p className="text-[13px] text-text">{msg.content}</p>
                </div>
              )}
              {msg.type === 'ai' && (
                <div className="message-ai rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="smart_toy" className="text-sm text-cyan" />
                    <span className="text-[10px] text-text-muted uppercase">AI Generated</span>
                  </div>
                  <pre className="text-[12px] text-cyan font-mono whitespace-pre-wrap overflow-x-auto">{msg.content}</pre>
                </div>
              )}
              {msg.type === 'system' && (
                <div className="px-4 py-2 bg-red/10 border border-red/20 rounded-lg">
                  <p className="text-[12px] text-red">{msg.content}</p>
                </div>
              )}
              <span className="text-[10px] text-text-dim font-mono self-end">{msg.time}</span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-3 bg-surface rounded-2xl">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[12px] text-text-muted">KCL 코드 생성 중...</span>
          </div>
        )}

        {kclCode && messages.length > 0 && !isLoading && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-full">
              <Icon name="check_circle" className="text-sm text-green" />
              <span className="text-[11px] text-green font-medium">3D 프리뷰 생성됨</span>
            </div>
          </div>
        )}
      </div>

      {kclCode && (
        <div className="px-4 py-2 border-t border-white/5 bg-void/50">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Current Code</div>
          <pre className="text-[11px] text-cyan font-mono bg-black/30 p-2 rounded overflow-x-auto max-h-20 overflow-y-auto">{kclCode}</pre>
        </div>
      )}

      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="command-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-text placeholder:text-text-dim resize-none h-28 disabled:opacity-50"
            placeholder={mode === 'ai' 
              ? '"간단한 의자 만들어줘" 또는 "테이블과 의자"' 
              : 'let myBox = box(size: [1, 2, 3], center: [0, 0, 0])'}
          />
          <div className="absolute bottom-3 right-3">
            <button 
              className="btn-primary p-2 rounded-lg disabled:opacity-50" 
              aria-label={mode === 'ai' ? 'Generate' : 'Run'}
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
            >
              <Icon name={mode === 'ai' ? 'auto_awesome' : 'play_arrow'} className="text-lg" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-cyan animate-pulse-glow" />
            <span className="text-[10px] font-mono text-text-dim">kcl-runtime</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-dim">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
            <span className="ml-1">to run</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function Page() {
  const [kclCode, setKclCode] = useState('');
  const [preview, setPreview] = useState<{ meshes: { id?: string | null; vertices: [number, number, number][]; indices: number[] }[] } | null>(null);
  const [operationCount, setOperationCount] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const previewDataRef = useRef<ReturnType<typeof kclCodeToPreview> | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [selectedImportedFile, setSelectedImportedFile] = useState<ImportedFile | null>(null);
  const [historyPanelCollapsed, setHistoryPanelCollapsed] = useState(false);
  const prevKclCodeRef = useRef('');

  // History hook - handles undo/redo state and keyboard shortcuts
  const history = useHistory({
    onCodeChange: useCallback((code: string) => {
      // When history changes (undo/redo), update the preview
      setKclCode(code);
      try {
        const newPreview = kclCodeToPreview(code);
        previewDataRef.current = newPreview;
        setPreview({ meshes: newPreview.meshes });
      } catch (error) {
        console.error('KCL parsing error on history change:', error);
        setPreview(null);
      }
    }, []),
  });

  // Helper to update KCL code with history tracking
  const updateKclCodeWithHistory = useCallback((newCode: string, label?: string) => {
    const changeLabel = label || detectChangeLabel(prevKclCodeRef.current, newCode);
    prevKclCodeRef.current = newCode;
    setKclCode(newCode);
    history.pushState(newCode, changeLabel);
  }, [history]);

  // Handle file import (STL or KCL)
  const handleFileImport = useCallback(async (file: File) => {
    try {
      if (file.name.endsWith('.stl')) {
        const mesh = await importSTLFile(file);
        const normalizedMesh = normalizeMesh(mesh);
        const kclApprox = meshToApproximateKCL(mesh, file.name.replace('.stl', ''));
        
        const importedFile: ImportedFile = {
          name: file.name,
          type: 'stl',
          data: {
            vertices: normalizedMesh.vertices,
            indices: normalizedMesh.indices,
            kclCode: kclApprox,
          }
        };
        
        setImportedFiles(prev => [...prev, importedFile]);
        
        // Show the imported mesh directly
        setPreview({
          meshes: [{
            id: file.name,
            vertices: normalizedMesh.vertices,
            indices: normalizedMesh.indices,
          }]
        });
        
        // Also set approximate KCL code with history
        updateKclCodeWithHistory(kclApprox, `Import ${file.name}`);
        
      } else if (file.name.endsWith('.kcl')) {
        const text = await file.text();
        
        const importedFile: ImportedFile = {
          name: file.name,
          type: 'kcl',
          data: { kclCode: text }
        };
        
        setImportedFiles(prev => [...prev, importedFile]);
        updateKclCodeWithHistory(text, `Import ${file.name}`);
        
        // Parse and preview
        try {
          const newPreview = kclCodeToPreview(text);
          previewDataRef.current = newPreview;
          setPreview({ meshes: newPreview.meshes });
        } catch (e) {
          console.error('KCL parse error:', e);
        }
      }
    } catch (error) {
      console.error('File import error:', error);
      alert(`Failed to import ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [updateKclCodeWithHistory]);

  // Handle selecting an imported file
  const handleFileSelect = useCallback((file: ImportedFile) => {
    setSelectedImportedFile(file);
    
    if (file.type === 'stl' && file.data.vertices && file.data.indices) {
      setPreview({
        meshes: [{
          id: file.name,
          vertices: file.data.vertices,
          indices: file.data.indices,
        }]
      });
      if (file.data.kclCode) {
        setKclCode(file.data.kclCode);
      }
    } else if (file.type === 'kcl' && file.data.kclCode) {
      setKclCode(file.data.kclCode);
      try {
        const newPreview = kclCodeToPreview(file.data.kclCode);
        previewDataRef.current = newPreview;
        setPreview({ meshes: newPreview.meshes });
      } catch (e) {
        console.error('KCL parse error:', e);
      }
    }
  }, []);

  const handleSubmitCode = useCallback((code: string) => {
    updateKclCodeWithHistory(code, 'AI Generated Code');
    try {
      const newPreview = kclCodeToPreview(code);
      previewDataRef.current = newPreview;
      setPreview({ meshes: newPreview.meshes });
    } catch (error) {
      console.error('KCL parsing error:', error);
      setPreview(null);
    }
  }, [updateKclCodeWithHistory]);

  const handleApplyOperation = useCallback((operation: string, params: Record<string, number | string>) => {
    if (operation === 'extrude') {
      const lines = kclCode.split('\n').filter(l => l.trim());
      
      const distance = params.distance as number || 1;
      const normalX = params.normalX as number || 0;
      const normalY = params.normalY as number || 1;
      const normalZ = params.normalZ as number || 0;
      
      let faceName: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back' = 'top';
      if (Math.abs(normalY) > 0.9) faceName = normalY > 0 ? 'top' : 'bottom';
      else if (Math.abs(normalX) > 0.9) faceName = normalX > 0 ? 'right' : 'left';
      else if (Math.abs(normalZ) > 0.9) faceName = normalZ > 0 ? 'front' : 'back';
      
      const boxNames: string[] = [];
      lines.forEach(line => {
        const match = line.match(/let\s+(\w+)\s*=/);
        if (match) boxNames.push(match[1]);
      });
      
      const sourceName = boxNames[0] || 'box1';
      const newVarName = `extruded_${operationCount}`;
      
      const newLine = `let ${newVarName} = extrude(${sourceName}.face.${faceName}, distance: ${distance.toFixed(2)})`;
      const newCode = kclCode + '\n' + newLine;
      
      setOperationCount(prev => prev + 1);
      handleSubmitCode(newCode);
    } else if (operation === 'fillet') {
      const radius = params.radius as number || 0.2;
      
      const boxNames: string[] = [];
      kclCode.split('\n').forEach(line => {
        const match = line.match(/let\s+(\w+)\s*=/);
        if (match) boxNames.push(match[1]);
      });
      
      const sourceName = boxNames[0] || 'box1';
      const newVarName = `filleted_${operationCount}`;
      
      const newLine = `let ${newVarName} = fillet(${sourceName}.edge[0], radius: ${radius.toFixed(2)})`;
      const newCode = kclCode + '\n' + newLine;
      
      setOperationCount(prev => prev + 1);
      handleSubmitCode(newCode);
    }
  }, [kclCode, operationCount, handleSubmitCode]);

  const handleExport = useCallback((format: 'stl' | 'stl-binary' | 'step', filename: string) => {
    if (!previewDataRef.current) return;
    
    const meshes = previewDataRef.current.meshes.map(m => ({
      vertices: m.vertices as number[][],
      indices: m.indices,
    }));
    
    let content: string | ArrayBuffer;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'stl':
        content = exportToSTL(meshes, filename);
        mimeType = 'text/plain';
        extension = '.stl';
        break;
      case 'stl-binary':
        content = exportToSTLBinary(meshes);
        mimeType = 'application/octet-stream';
        extension = '.stl';
        break;
      case 'step':
        content = exportToSTEP(meshes, filename);
        mimeType = 'text/plain';
        extension = '.step';
        break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + extension;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // URL 파라미터로 초기 코드 로드 (테스트용)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        handleSubmitCode(decodeURIComponent(code));
      }
    }
  }, [handleSubmitCode]);

  return (
    <>
      <Header onExportClick={() => setShowExportModal(true)} />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <SidebarNav />
        <FileTree 
          importedFiles={importedFiles}
          onFileImport={handleFileImport}
          onFileSelect={handleFileSelect}
          selectedFile={selectedImportedFile}
        />
        <Viewport preview={preview} onApplyOperation={handleApplyOperation} />
        <ChatPanel onSubmitCode={handleSubmitCode} kclCode={kclCode} />
      </div>
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </>
  );
}
