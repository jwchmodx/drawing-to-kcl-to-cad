/**
 * Measurement Toolbar Component
 * Provides UI for selecting measurement modes and displaying results
 */

import React from 'react';
import { 
  MeasureMode, 
  Measurement, 
  MeasureUnit,
  formatDistance,
  formatArea,
  formatVolume,
  formatAngle
} from '@/lib/measureEngine';

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEASURE MODE BUTTON
// ═══════════════════════════════════════════════════════════════

interface MeasureModeButtonProps {
  mode: MeasureMode;
  icon: string;
  label: string;
  activeMode: MeasureMode;
  onClick: (mode: MeasureMode) => void;
  disabled?: boolean;
}

function MeasureModeButton({ mode, icon, label, activeMode, onClick, disabled }: MeasureModeButtonProps) {
  const isActive = activeMode === mode;
  
  return (
    <button
      onClick={() => onClick(isActive ? 'none' : mode)}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
        isActive
          ? 'bg-cyan text-void'
          : disabled
            ? 'text-text-dim cursor-not-allowed'
            : 'text-text-muted hover:text-text hover:bg-white/5'
      }`}
      title={label}
    >
      <Icon name={icon} className="text-base" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// UNIT SELECTOR
// ═══════════════════════════════════════════════════════════════

interface UnitSelectorProps {
  unit: MeasureUnit;
  onChange: (unit: MeasureUnit) => void;
}

function UnitSelector({ unit, onChange }: UnitSelectorProps) {
  const units: MeasureUnit[] = ['mm', 'cm', 'm', 'inch'];
  
  return (
    <div className="flex items-center gap-1 bg-void rounded-lg p-0.5 border border-white/5">
      {units.map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
            unit === u
              ? 'bg-white/10 text-cyan'
              : 'text-text-dim hover:text-text'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEASUREMENT RESULT ITEM
// ═══════════════════════════════════════════════════════════════

interface MeasurementItemProps {
  measurement: Measurement;
  onDelete: (id: string) => void;
  unit: MeasureUnit;
}

function MeasurementItem({ measurement, onDelete, unit }: MeasurementItemProps) {
  const getIcon = () => {
    switch (measurement.type) {
      case 'distance': return 'straighten';
      case 'angle': return 'architecture';
      case 'area': return 'square_foot';
      case 'volume': return 'deployed_code';
    }
  };
  
  const getValue = () => {
    switch (measurement.type) {
      case 'distance':
        return formatDistance(measurement.distance, unit);
      case 'angle':
        return formatAngle(measurement.angle);
      case 'area':
        return formatArea(measurement.area, unit);
      case 'volume':
        return formatVolume(measurement.volume, unit);
    }
  };
  
  const getLabel = () => {
    switch (measurement.type) {
      case 'distance': return 'Distance';
      case 'angle': return 'Angle';
      case 'area': return 'Area';
      case 'volume': return 'Volume';
    }
  };
  
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-void rounded-lg border border-white/5 group">
      <div className="flex items-center gap-2">
        <Icon name={getIcon()} className="text-base text-cyan" />
        <div>
          <div className="text-[10px] text-text-dim uppercase tracking-wider">{getLabel()}</div>
          <div className="text-sm font-mono text-text">{getValue()}</div>
        </div>
      </div>
      <button
        onClick={() => onDelete(measurement.id)}
        className="p-1 text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete measurement"
      >
        <Icon name="close" className="text-base" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PENDING POINTS INDICATOR
// ═══════════════════════════════════════════════════════════════

interface PendingPointsProps {
  mode: MeasureMode;
  pointCount: number;
}

function PendingPoints({ mode, pointCount }: PendingPointsProps) {
  const getRequiredPoints = () => {
    switch (mode) {
      case 'distance': return 2;
      case 'angle': return 3;
      default: return 0;
    }
  };
  
  const getInstructions = () => {
    switch (mode) {
      case 'distance':
        return pointCount === 0 
          ? 'Click first point' 
          : 'Click second point';
      case 'angle':
        if (pointCount === 0) return 'Click first point';
        if (pointCount === 1) return 'Click vertex point';
        return 'Click third point';
      case 'area':
        return 'Click on a face to measure area';
      case 'volume':
        return 'Click on an object to measure volume';
      default:
        return '';
    }
  };
  
  const required = getRequiredPoints();
  if (mode === 'none' || (required === 0 && mode !== 'area' && mode !== 'volume')) return null;
  
  return (
    <div className="px-3 py-2 bg-cyan/10 border border-cyan/20 rounded-lg">
      <div className="flex items-center gap-2 text-xs text-cyan">
        <Icon name="touch_app" className="text-base" />
        <span>{getInstructions()}</span>
        {required > 0 && (
          <span className="ml-auto text-[10px] text-cyan/70">
            {pointCount}/{required}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEASURE TOOLBAR MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface MeasureToolbarProps {
  mode: MeasureMode;
  onModeChange: (mode: MeasureMode) => void;
  measurements: Measurement[];
  onDeleteMeasurement: (id: string) => void;
  onClearAll: () => void;
  unit: MeasureUnit;
  onUnitChange: (unit: MeasureUnit) => void;
  pendingPointCount: number;
  disabled?: boolean;
}

export function MeasureToolbar({
  mode,
  onModeChange,
  measurements,
  onDeleteMeasurement,
  onClearAll,
  unit,
  onUnitChange,
  pendingPointCount,
  disabled = false,
}: MeasureToolbarProps) {
  const measureModes: { mode: MeasureMode; icon: string; label: string }[] = [
    { mode: 'distance', icon: 'straighten', label: 'Distance' },
    { mode: 'angle', icon: 'architecture', label: 'Angle' },
    { mode: 'area', icon: 'square_foot', label: 'Area' },
    { mode: 'volume', icon: 'deployed_code', label: 'Volume' },
  ];
  
  return (
    <div className="flex flex-col gap-3">
      {/* Mode Selection */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[10px] text-text-dim uppercase tracking-wider mr-1">Measure</div>
        {measureModes.map((m) => (
          <MeasureModeButton
            key={m.mode}
            mode={m.mode}
            icon={m.icon}
            label={m.label}
            activeMode={mode}
            onClick={onModeChange}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Unit Selector */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-text-dim uppercase tracking-wider">Unit</div>
        <UnitSelector unit={unit} onChange={onUnitChange} />
      </div>
      
      {/* Pending Points */}
      <PendingPoints mode={mode} pointCount={pendingPointCount} />
      
      {/* Measurements List */}
      {measurements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-text-dim uppercase tracking-wider">
              Results ({measurements.length})
            </div>
            <button
              onClick={onClearAll}
              className="text-[10px] text-text-dim hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {measurements.map((m) => (
              <MeasurementItem
                key={m.id}
                measurement={m}
                onDelete={onDeleteMeasurement}
                unit={unit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPACT MEASURE BUTTON (for toolbar integration)
// ═══════════════════════════════════════════════════════════════

export interface MeasureButtonProps {
  isActive: boolean;
  onClick: () => void;
  measurementCount: number;
}

export function MeasureButton({ isActive, onClick, measurementCount }: MeasureButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
        isActive
          ? 'bg-cyan text-void'
          : 'text-text-muted hover:text-text hover:bg-white/5 border border-white/5'
      }`}
      title="Measurement Tools"
    >
      <Icon name="straighten" className="text-base" />
      <span>Measure</span>
      {measurementCount > 0 && (
        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
          isActive ? 'bg-void/20 text-void' : 'bg-cyan/20 text-cyan'
        }`}>
          {measurementCount}
        </span>
      )}
    </button>
  );
}

export default MeasureToolbar;
