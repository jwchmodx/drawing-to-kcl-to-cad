'use client';

import React from 'react';
import type { EditMode } from '@/hooks/useDirectEdit';

// Icon component
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIRECT EDIT TOOLBAR
// ═══════════════════════════════════════════════════════════════

interface DirectEditToolbarProps {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  space: 'local' | 'world';
  onSpaceChange: (space: 'local' | 'world') => void;
  snapEnabled: boolean;
  onSnapChange: (enabled: boolean) => void;
  onApply?: () => void;
  onCancel?: () => void;
  hasSelection: boolean;
}

export function DirectEditToolbar({
  mode,
  onModeChange,
  space,
  onSpaceChange,
  snapEnabled,
  onSnapChange,
  onApply,
  onCancel,
  hasSelection,
}: DirectEditToolbarProps) {
  const modes: { id: EditMode; icon: string; label: string }[] = [
    { id: 'translate', icon: 'open_with', label: 'Move' },
    { id: 'rotate', icon: 'rotate_right', label: 'Rotate' },
    { id: 'scale', icon: 'aspect_ratio', label: 'Scale' },
  ];

  return (
    <div className="flex items-center gap-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-lg">
      {/* Mode Selection */}
      <div className="flex gap-1">
        {modes.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            disabled={!hasSelection}
            className={`p-2 rounded-lg transition-all ${
              mode === id
                ? 'bg-cyan text-void'
                : hasSelection
                ? 'text-text-muted hover:text-text hover:bg-white/5'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
            title={label}
          >
            <Icon name={icon} className="text-lg" />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Space Toggle */}
      <button
        onClick={() => onSpaceChange(space === 'local' ? 'world' : 'local')}
        disabled={!hasSelection}
        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
          hasSelection
            ? 'text-text-muted hover:text-text hover:bg-white/5'
            : 'text-text-muted/30 cursor-not-allowed'
        }`}
        title={`Space: ${space}`}
      >
        {space === 'local' ? 'Local' : 'World'}
      </button>

      {/* Snap Toggle */}
      <button
        onClick={() => onSnapChange(!snapEnabled)}
        disabled={!hasSelection}
        className={`p-2 rounded-lg transition-all ${
          snapEnabled
            ? 'bg-cyan/20 text-cyan'
            : hasSelection
            ? 'text-text-muted hover:text-text hover:bg-white/5'
            : 'text-text-muted/30 cursor-not-allowed'
        }`}
        title={`Snap: ${snapEnabled ? 'On' : 'Off'}`}
      >
        <Icon name="grid_4x4" className="text-lg" />
      </button>

      {(onApply || onCancel) && hasSelection && (
        <>
          <div className="w-px h-6 bg-white/10" />
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Cancel"
            >
              <Icon name="close" className="text-lg" />
            </button>
          )}
          
          {onApply && (
            <button
              onClick={onApply}
              className="p-2 rounded-lg text-text-muted hover:text-green-400 hover:bg-green-400/10 transition-all"
              title="Apply"
            >
              <Icon name="check" className="text-lg" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKETCH PLANE SELECTOR
// ═══════════════════════════════════════════════════════════════

interface SketchPlaneSelectorProps {
  selectedPlane: 'xy' | 'xz' | 'yz' | null;
  onSelectPlane: (plane: 'xy' | 'xz' | 'yz') => void;
  onCancel?: () => void;
}

export function SketchPlaneSelector({
  selectedPlane,
  onSelectPlane,
  onCancel,
}: SketchPlaneSelectorProps) {
  const planes: { id: 'xy' | 'xz' | 'yz'; label: string; color: string }[] = [
    { id: 'xy', label: 'Top (XY)', color: 'text-blue-400' },
    { id: 'xz', label: 'Front (XZ)', color: 'text-green-400' },
    { id: 'yz', label: 'Right (YZ)', color: 'text-red-400' },
  ];

  return (
    <div className="flex flex-col gap-2 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-lg min-w-48">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
        Select Sketch Plane
      </div>
      
      <div className="flex flex-col gap-1">
        {planes.map(({ id, label, color }) => (
          <button
            key={id}
            onClick={() => onSelectPlane(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
              selectedPlane === id
                ? 'bg-cyan/10 border border-cyan/30'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className={`w-3 h-3 rounded-sm ${color} bg-current opacity-50`} />
            <span className="text-sm text-text">{label}</span>
          </button>
        ))}
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-2 px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORM INFO DISPLAY
// ═══════════════════════════════════════════════════════════════

interface TransformInfoProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible?: boolean;
}

export function TransformInfo({
  position,
  rotation,
  scale,
  visible = true,
}: TransformInfoProps) {
  if (!visible) return null;

  const formatValue = (v: number) => v.toFixed(2);

  return (
    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg p-3 text-xs font-mono shadow-lg">
      <div className="grid grid-cols-4 gap-x-3 gap-y-1">
        <span className="text-text-muted">Pos:</span>
        <span className="text-cyan">{formatValue(position[0])}</span>
        <span className="text-green-400">{formatValue(position[1])}</span>
        <span className="text-red-400">{formatValue(position[2])}</span>
        
        <span className="text-text-muted">Rot:</span>
        <span className="text-cyan">{formatValue(rotation[0])}°</span>
        <span className="text-green-400">{formatValue(rotation[1])}°</span>
        <span className="text-red-400">{formatValue(rotation[2])}°</span>
        
        <span className="text-text-muted">Scale:</span>
        <span className="text-cyan">{formatValue(scale[0])}</span>
        <span className="text-green-400">{formatValue(scale[1])}</span>
        <span className="text-red-400">{formatValue(scale[2])}</span>
      </div>
    </div>
  );
}

export default DirectEditToolbar;
