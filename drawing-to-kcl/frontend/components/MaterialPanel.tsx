'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  MaterialPreset,
  MaterialProperties,
  MaterialCategory,
  PRESETS_BY_CATEGORY,
  getCategoryDisplayName,
  getCategoryIcon,
  DEFAULT_MATERIAL,
} from '../lib/materialPresets';
import { MaterialEngine, getMaterialEngine } from '../lib/materialEngine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MaterialPanelProps {
  selectedMeshId: string | null;
  onMaterialApply?: (meshId: string, materialId: string) => void;
  onMaterialUpdate?: (meshId: string, properties: Partial<MaterialProperties>) => void;
  onClose?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400 w-16">{label}</span>}
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-transparent"
        />
      </div>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          const val = e.target.value;
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            onChange(val);
          }
        }}
        className="w-20 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200"
        placeholder="#FFFFFF"
      />
    </div>
  );
};

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-16">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <span className="text-xs text-gray-300 w-10 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  );
};

interface PresetCardProps {
  preset: MaterialPreset;
  isSelected: boolean;
  onClick: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, isSelected, onClick }) => {
  const { color, metalness, roughness, opacity } = preset.properties;
  
  // Calculate a simple preview style
  const glossiness = 1 - roughness;
  const gradient = metalness > 0.5
    ? `linear-gradient(135deg, ${color} 0%, #ffffff ${40 + glossiness * 30}%, ${color} 100%)`
    : color;
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full p-2 rounded-lg border-2 transition-all
        hover:border-cyan-400 hover:bg-gray-700/50
        ${isSelected ? 'border-cyan-500 bg-gray-700' : 'border-gray-600 bg-gray-800'}
      `}
    >
      <div
        className="w-full h-10 rounded-md mb-1"
        style={{
          background: gradient,
          opacity: opacity,
        }}
      />
      <span className="text-xs text-gray-300 truncate block">{preset.name}</span>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const MaterialPanel: React.FC<MaterialPanelProps> = ({
  selectedMeshId,
  onMaterialApply,
  onMaterialUpdate,
  onClose,
  className = '',
}) => {
  const [engine] = useState<MaterialEngine>(() => getMaterialEngine());
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory>('metal');
  const [selectedPreset, setSelectedPreset] = useState<MaterialPreset | null>(null);
  const [customMode, setCustomMode] = useState(false);
  
  // Custom material properties
  const [customProps, setCustomProps] = useState<MaterialProperties>({
    color: DEFAULT_MATERIAL.properties.color,
    metalness: DEFAULT_MATERIAL.properties.metalness,
    roughness: DEFAULT_MATERIAL.properties.roughness,
    opacity: DEFAULT_MATERIAL.properties.opacity,
    transparent: false,
  });

  // Load current assignment when mesh is selected
  useEffect(() => {
    if (selectedMeshId) {
      const assignment = engine.getAssignment(selectedMeshId);
      if (assignment) {
        // Find the preset
        const allMaterials = engine.getAllMaterials();
        const preset = allMaterials.find(m => m.id === assignment.materialId);
        if (preset) {
          setSelectedPreset(preset);
          setCustomProps({
            ...preset.properties,
            ...assignment.customProperties,
          });
        }
      } else {
        setSelectedPreset(null);
        setCustomProps(DEFAULT_MATERIAL.properties);
      }
    }
  }, [selectedMeshId, engine]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: MaterialPreset) => {
    setSelectedPreset(preset);
    setCustomProps(preset.properties);
    setCustomMode(false);
  }, []);

  // Handle apply button
  const handleApply = useCallback(() => {
    if (!selectedMeshId) return;

    if (selectedPreset && !customMode) {
      // Apply preset
      engine.assignMaterial(selectedMeshId, selectedPreset.id);
      onMaterialApply?.(selectedMeshId, selectedPreset.id);
    } else {
      // Apply custom material
      const customMaterial = engine.addCustomMaterial('Custom', customProps);
      engine.assignMaterial(selectedMeshId, customMaterial.id);
      onMaterialApply?.(selectedMeshId, customMaterial.id);
    }
  }, [selectedMeshId, selectedPreset, customMode, customProps, engine, onMaterialApply]);

  // Handle live preview update
  const handlePropertyChange = useCallback((
    key: keyof MaterialProperties,
    value: string | number | boolean
  ) => {
    setCustomMode(true);
    const newProps = { ...customProps, [key]: value };
    
    // Auto-set transparent
    if (key === 'opacity') {
      newProps.transparent = (value as number) < 1;
    }
    
    setCustomProps(newProps);
    
    // Live preview
    if (selectedMeshId && onMaterialUpdate) {
      onMaterialUpdate(selectedMeshId, { [key]: value });
    }
  }, [customProps, selectedMeshId, onMaterialUpdate]);

  // Category buttons
  const categories: MaterialCategory[] = ['metal', 'plastic', 'wood', 'glass', 'rubber'];

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-100">Material</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Selected object indicator */}
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <span className="text-xs text-gray-400">
          {selectedMeshId ? (
            <>Selected: <span className="text-cyan-400">{selectedMeshId}</span></>
          ) : (
            <span className="text-yellow-500">No object selected</span>
          )}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-2 py-2 border-b border-gray-700 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`
              px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap
              ${selectedCategory === cat
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {getCategoryIcon(cat)} {getCategoryDisplayName(cat)}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div className="p-3 border-b border-gray-700 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {PRESETS_BY_CATEGORY[selectedCategory].map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={selectedPreset?.id === preset.id && !customMode}
              onClick={() => handlePresetSelect(preset)}
            />
          ))}
        </div>
      </div>

      {/* Custom properties */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-300">Properties</span>
          {customMode && (
            <span className="text-xs text-cyan-400">Custom Mode</span>
          )}
        </div>

        <ColorPicker
          label="Color"
          value={customProps.color}
          onChange={(v) => handlePropertyChange('color', v)}
        />

        <Slider
          label="Metallic"
          value={customProps.metalness}
          onChange={(v) => handlePropertyChange('metalness', v)}
        />

        <Slider
          label="Roughness"
          value={customProps.roughness}
          onChange={(v) => handlePropertyChange('roughness', v)}
        />

        <Slider
          label="Opacity"
          value={customProps.opacity}
          onChange={(v) => handlePropertyChange('opacity', v)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-700 bg-gray-800/50">
        <button
          onClick={handleApply}
          disabled={!selectedMeshId}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded transition-colors
            ${selectedMeshId
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Apply Material
        </button>
        <button
          onClick={() => {
            setSelectedPreset(null);
            setCustomProps(DEFAULT_MATERIAL.properties);
            setCustomMode(false);
            if (selectedMeshId) {
              engine.removeMaterialAssignment(selectedMeshId);
            }
          }}
          className="px-4 py-2 text-sm font-medium rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Material preview */}
      <div className="px-4 py-3 border-t border-gray-700">
        <span className="text-xs text-gray-400 block mb-2">Preview</span>
        <div 
          className="w-full h-16 rounded-lg border border-gray-600"
          style={{
            background: customProps.metalness > 0.5
              ? `linear-gradient(135deg, ${customProps.color} 0%, #ffffff ${40 + (1 - customProps.roughness) * 30}%, ${customProps.color} 100%)`
              : customProps.color,
            opacity: customProps.opacity,
          }}
        />
      </div>
    </div>
  );
};

export default MaterialPanel;
