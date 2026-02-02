/**
 * SketchToolbar - 2D Sketch Tool Selection UI
 */

import React from 'react';
import { SketchTool, SketchPlane, SketchState } from '../lib/sketchEngine';

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR PROPS
// ═══════════════════════════════════════════════════════════════
export interface SketchToolbarProps {
  isSketchMode: boolean;
  onEnterSketchMode: () => void;
  onExitSketchMode: () => void;
  currentTool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  currentPlane: SketchPlane;
  onPlaneChange: (plane: SketchPlane) => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  onFinishSketch: () => void;
  canFinish: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PLANE SELECTOR
// ═══════════════════════════════════════════════════════════════
interface PlaneSelectorProps {
  currentPlane: SketchPlane;
  onPlaneChange: (plane: SketchPlane) => void;
}

function PlaneSelector({ currentPlane, onPlaneChange }: PlaneSelectorProps) {
  const planes: { id: SketchPlane; label: string; icon: string }[] = [
    { id: 'XY', label: 'XY (Top)', icon: 'layers' },
    { id: 'XZ', label: 'XZ (Front)', icon: 'crop_landscape' },
    { id: 'YZ', label: 'YZ (Side)', icon: 'crop_portrait' },
  ];

  return (
    <div className="flex items-center gap-1">
      {planes.map((plane) => (
        <button
          key={plane.id}
          onClick={() => onPlaneChange(plane.id)}
          className={`px-2 py-1 text-xs font-medium rounded transition-all ${
            currentPlane === plane.id
              ? 'bg-cyan text-void'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
          title={plane.label}
        >
          {plane.id}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOL BUTTON
// ═══════════════════════════════════════════════════════════════
interface ToolButtonProps {
  tool: SketchTool;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ tool, icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
        isActive
          ? 'bg-cyan text-void'
          : 'text-text-muted hover:text-text hover:bg-white/5'
      }`}
      title={label}
    >
      <Icon name={icon} className="text-lg" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN TOOLBAR
// ═══════════════════════════════════════════════════════════════
export function SketchToolbar({
  isSketchMode,
  onEnterSketchMode,
  onExitSketchMode,
  currentTool,
  onToolChange,
  currentPlane,
  onPlaneChange,
  gridVisible,
  onToggleGrid,
  snapEnabled,
  onToggleSnap,
  onFinishSketch,
  canFinish,
}: SketchToolbarProps) {
  const tools: { tool: SketchTool; icon: string; label: string }[] = [
    { tool: 'select', icon: 'near_me', label: 'Select (V)' },
    { tool: 'line', icon: 'show_chart', label: 'Line (L)' },
    { tool: 'rectangle', icon: 'rectangle', label: 'Rectangle (R)' },
    { tool: 'circle', icon: 'circle', label: 'Circle (C)' },
    { tool: 'arc', icon: 'looks', label: 'Arc (A)' },
    { tool: 'polyline', icon: 'polyline', label: 'Polyline (P)' },
    { tool: 'spline', icon: 'gesture', label: 'Spline (S)' },
  ];

  // Sketch mode entry button (shown when NOT in sketch mode)
  if (!isSketchMode) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 z-10">
        <button
          onClick={onEnterSketchMode}
          className="flex items-center gap-2 px-4 py-2 bg-cyan text-void font-medium rounded-lg hover:bg-cyan/90 transition-colors"
        >
          <Icon name="draw" className="text-lg" />
          <span className="text-sm">New Sketch</span>
        </button>
      </div>
    );
  }

  // Full sketch toolbar (shown when IN sketch mode)
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface/95 backdrop-blur-xl border border-cyan/30 rounded-xl p-1.5 z-10 shadow-lg shadow-cyan/10">
      {/* Sketch Mode Badge */}
      <div className="flex items-center gap-2 px-3 py-1 bg-cyan/10 border border-cyan/20 rounded-lg">
        <div className="w-2 h-2 bg-cyan rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-cyan">SKETCH MODE</span>
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Plane Selector */}
      <PlaneSelector currentPlane={currentPlane} onPlaneChange={onPlaneChange} />

      <div className="w-px h-6 bg-white/10" />

      {/* Drawing Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <ToolButton
            key={t.tool}
            tool={t.tool}
            icon={t.icon}
            label={t.label}
            isActive={currentTool === t.tool}
            onClick={() => onToolChange(t.tool)}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* View Options */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleGrid}
          className={`p-2 rounded-lg transition-all ${
            gridVisible
              ? 'bg-white/10 text-cyan'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
          title={`Grid ${gridVisible ? 'ON' : 'OFF'}`}
        >
          <Icon name="grid_on" className="text-lg" />
        </button>
        <button
          onClick={onToggleSnap}
          className={`p-2 rounded-lg transition-all ${
            snapEnabled
              ? 'bg-white/10 text-cyan'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
          title={`Snap ${snapEnabled ? 'ON' : 'OFF'}`}
        >
          <Icon name="filter_center_focus" className="text-lg" />
        </button>
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onFinishSketch}
          disabled={!canFinish}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
            canFinish
              ? 'bg-green text-void hover:bg-green/90'
              : 'bg-white/5 text-text-dim cursor-not-allowed'
          }`}
          title="Finish Sketch (Enter)"
        >
          <Icon name="check" className="text-lg" />
          <span>Finish</span>
        </button>
        <button
          onClick={onExitSketchMode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-text-muted hover:text-text hover:bg-white/10 rounded-lg font-medium text-sm transition-all"
          title="Cancel Sketch (Esc)"
        >
          <Icon name="close" className="text-lg" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKETCH INFO PANEL
// ═══════════════════════════════════════════════════════════════
interface SketchInfoPanelProps {
  sketchState: SketchState;
  cursorPosition: { x: number; y: number } | null;
}

export function SketchInfoPanel({ sketchState, cursorPosition }: SketchInfoPanelProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-sm border border-white/10 rounded-lg p-3 z-10">
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Plane:</span>
          <span className="text-cyan font-mono">{sketchState.plane.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Elements:</span>
          <span className="text-cyan font-mono">{sketchState.elements.length}</span>
        </div>
        {sketchState.selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Selected:</span>
            <span className="text-orange font-mono">{sketchState.selectedIds.length}</span>
          </div>
        )}
        {cursorPosition && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <span className="text-text-muted">Cursor:</span>
            <span className="text-green font-mono">
              ({cursorPosition.x.toFixed(2)}, {cursorPosition.y.toFixed(2)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKETCH FINISH DIALOG
// ═══════════════════════════════════════════════════════════════
interface SketchFinishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExtrude: (distance: number) => void;
  onRevolve: (angle: number) => void;
  onSaveProfile: (name: string) => void;
}

export function SketchFinishDialog({
  isOpen,
  onClose,
  onExtrude,
  onRevolve,
  onSaveProfile,
}: SketchFinishDialogProps) {
  const [extrudeDistance, setExtrudeDistance] = React.useState(1);
  const [revolveAngle, setRevolveAngle] = React.useState(360);
  const [profileName, setProfileName] = React.useState('sketch1');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-96 shadow-2xl">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Icon name="draw" className="text-cyan" />
          Finish Sketch
        </h2>

        <div className="space-y-4">
          {/* Extrude Option */}
          <div className="p-3 border border-white/10 rounded-lg hover:border-cyan/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="open_in_new" className="text-lg text-cyan" />
                <span className="text-sm font-medium text-text">Extrude</span>
              </div>
              <button
                onClick={() => onExtrude(extrudeDistance)}
                className="px-3 py-1 bg-cyan text-void text-xs font-medium rounded hover:bg-cyan/90 transition-colors"
              >
                Apply
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(parseFloat(e.target.value) || 1)}
                className="w-16 bg-void border border-white/10 rounded px-2 py-1 text-xs text-cyan font-mono text-right"
              />
            </div>
          </div>

          {/* Revolve Option */}
          <div className="p-3 border border-white/10 rounded-lg hover:border-orange/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="360" className="text-lg text-orange" />
                <span className="text-sm font-medium text-text">Revolve</span>
              </div>
              <button
                onClick={() => onRevolve(revolveAngle)}
                className="px-3 py-1 bg-orange text-void text-xs font-medium rounded hover:bg-orange/90 transition-colors"
              >
                Apply
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="360"
                step="1"
                value={revolveAngle}
                onChange={(e) => setRevolveAngle(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                value={revolveAngle}
                onChange={(e) => setRevolveAngle(parseFloat(e.target.value) || 360)}
                className="w-16 bg-void border border-white/10 rounded px-2 py-1 text-xs text-orange font-mono text-right"
              />
              <span className="text-xs text-text-muted">°</span>
            </div>
          </div>

          {/* Save as Profile Option */}
          <div className="p-3 border border-white/10 rounded-lg hover:border-green/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="save" className="text-lg text-green" />
                <span className="text-sm font-medium text-text">Save as Profile</span>
              </div>
              <button
                onClick={() => onSaveProfile(profileName)}
                className="px-3 py-1 bg-green text-void text-xs font-medium rounded hover:bg-green/90 transition-colors"
              >
                Save
              </button>
            </div>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name"
              className="w-full bg-void border border-white/10 rounded px-2 py-1.5 text-sm text-text"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-text-muted hover:text-text bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SketchToolbar;
