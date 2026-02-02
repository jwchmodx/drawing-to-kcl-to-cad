'use client';

import React, { useState, useCallback } from 'react';
import {
  UserSettings,
  Theme,
  Unit,
  CameraSettings,
  ViewSettings,
  EditorSettings,
  DEFAULT_SETTINGS,
} from '@/lib/settingsManager';
import { RecentFile } from '@/lib/settingsManager';

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type SettingsTab = 'general' | 'view' | 'camera' | 'editor' | 'recent';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  recentFiles: RecentFile[];
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onUpdateCameraSettings: (updates: Partial<CameraSettings>) => void;
  onUpdateViewSettings: (updates: Partial<ViewSettings>) => void;
  onUpdateEditorSettings: (updates: Partial<EditorSettings>) => void;
  onSetTheme: (theme: Theme) => void;
  onSetUnit: (unit: Unit) => void;
  onResetSettings: () => void;
  onOpenRecentFile?: (file: RecentFile) => void;
  onRemoveRecentFile?: (name: string) => void;
  onClearRecentFiles?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'view', label: 'View', icon: 'visibility' },
  { id: 'camera', label: 'Camera', icon: 'videocam' },
  { id: 'editor', label: 'Editor', icon: 'code' },
  { id: 'recent', label: 'Recent', icon: 'history' },
];

// ═══════════════════════════════════════════════════════════════
// SETTINGS MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  recentFiles,
  onUpdateSettings,
  onUpdateCameraSettings,
  onUpdateViewSettings,
  onUpdateEditorSettings,
  onSetTheme,
  onSetUnit,
  onResetSettings,
  onOpenRecentFile,
  onRemoveRecentFile,
  onClearRecentFiles,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Icon name="settings" className="text-cyan" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icon name="close" className="text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-white/10 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-cyan/10 text-cyan'
                    : 'text-text-muted hover:bg-white/5 hover:text-text'
                }`}
              >
                <Icon name={tab.icon} className="text-lg" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <GeneralTab
                settings={settings}
                onSetTheme={onSetTheme}
                onSetUnit={onSetUnit}
              />
            )}
            {activeTab === 'view' && (
              <ViewTab
                viewSettings={settings.view}
                onUpdate={onUpdateViewSettings}
              />
            )}
            {activeTab === 'camera' && (
              <CameraTab
                cameraSettings={settings.camera}
                onUpdate={onUpdateCameraSettings}
              />
            )}
            {activeTab === 'editor' && (
              <EditorTab
                editorSettings={settings.editor}
                onUpdate={onUpdateEditorSettings}
              />
            )}
            {activeTab === 'recent' && (
              <RecentTab
                recentFiles={recentFiles}
                onOpenFile={onOpenRecentFile}
                onRemoveFile={onRemoveRecentFile}
                onClearAll={onClearRecentFiles}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={onResetSettings}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm bg-cyan/20 text-cyan hover:bg-cyan/30 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GENERAL TAB
// ═══════════════════════════════════════════════════════════════

interface GeneralTabProps {
  settings: UserSettings;
  onSetTheme: (theme: Theme) => void;
  onSetUnit: (unit: Unit) => void;
}

function GeneralTab({ settings, onSetTheme, onSetUnit }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <Section title="Appearance">
        <SettingRow label="Theme" description="Choose light or dark mode">
          <div className="flex gap-2">
            {(['light', 'dark'] as Theme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => onSetTheme(theme)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  settings.theme === theme
                    ? 'bg-cyan/10 border-cyan/50 text-cyan'
                    : 'border-white/10 text-text-muted hover:border-white/20'
                }`}
              >
                <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} className="text-lg" />
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>

      <Section title="Units">
        <SettingRow label="Default Unit" description="Unit used for measurements">
          <select
            value={settings.unit}
            onChange={(e) => onSetUnit(e.target.value as Unit)}
            className="bg-void border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:border-cyan/50 focus:outline-none min-w-[120px]"
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="m">Meters (m)</option>
            <option value="inch">Inches (inch)</option>
          </select>
        </SettingRow>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIEW TAB
// ═══════════════════════════════════════════════════════════════

interface ViewTabProps {
  viewSettings: ViewSettings;
  onUpdate: (updates: Partial<ViewSettings>) => void;
}

function ViewTab({ viewSettings, onUpdate }: ViewTabProps) {
  return (
    <div className="space-y-6">
      <Section title="Display Options">
        <ToggleRow
          label="Show Grid"
          description="Display grid in the 3D view"
          value={viewSettings.showGrid}
          onChange={(value) => onUpdate({ showGrid: value })}
        />
        <ToggleRow
          label="Show Axes"
          description="Display XYZ axes in the 3D view"
          value={viewSettings.showAxes}
          onChange={(value) => onUpdate({ showAxes: value })}
        />
        <ToggleRow
          label="Show Wireframe"
          description="Display wireframe overlay on models"
          value={viewSettings.showWireframe}
          onChange={(value) => onUpdate({ showWireframe: value })}
        />
      </Section>

      <Section title="Grid Settings">
        <SliderRow
          label="Grid Size"
          value={viewSettings.gridSize}
          min={10}
          max={500}
          step={10}
          onChange={(value) => onUpdate({ gridSize: value })}
        />
        <SliderRow
          label="Grid Divisions"
          value={viewSettings.gridDivisions}
          min={5}
          max={50}
          step={5}
          onChange={(value) => onUpdate({ gridDivisions: value })}
        />
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CAMERA TAB
// ═══════════════════════════════════════════════════════════════

interface CameraTabProps {
  cameraSettings: CameraSettings;
  onUpdate: (updates: Partial<CameraSettings>) => void;
}

function CameraTab({ cameraSettings, onUpdate }: CameraTabProps) {
  return (
    <div className="space-y-6">
      <Section title="Camera Controls">
        <SliderRow
          label="Rotate Speed"
          value={cameraSettings.rotateSpeed}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(value) => onUpdate({ rotateSpeed: value })}
        />
        <SliderRow
          label="Zoom Speed"
          value={cameraSettings.zoomSpeed}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(value) => onUpdate({ zoomSpeed: value })}
        />
        <SliderRow
          label="Pan Speed"
          value={cameraSettings.panSpeed}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(value) => onUpdate({ panSpeed: value })}
        />
      </Section>

      <Section title="Smoothing">
        <ToggleRow
          label="Enable Damping"
          description="Smooth camera movements"
          value={cameraSettings.enableDamping}
          onChange={(value) => onUpdate({ enableDamping: value })}
        />
        {cameraSettings.enableDamping && (
          <SliderRow
            label="Damping Factor"
            value={cameraSettings.dampingFactor}
            min={0.01}
            max={0.5}
            step={0.01}
            onChange={(value) => onUpdate({ dampingFactor: value })}
          />
        )}
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDITOR TAB
// ═══════════════════════════════════════════════════════════════

interface EditorTabProps {
  editorSettings: EditorSettings;
  onUpdate: (updates: Partial<EditorSettings>) => void;
}

function EditorTab({ editorSettings, onUpdate }: EditorTabProps) {
  return (
    <div className="space-y-6">
      <Section title="Text">
        <SliderRow
          label="Font Size"
          value={editorSettings.fontSize}
          min={10}
          max={24}
          step={1}
          unit="px"
          onChange={(value) => onUpdate({ fontSize: value })}
        />
        <SettingRow label="Tab Size" description="Number of spaces per tab">
          <div className="flex gap-2">
            {[2, 4].map((size) => (
              <button
                key={size}
                onClick={() => onUpdate({ tabSize: size })}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  editorSettings.tabSize === size
                    ? 'bg-cyan/10 border-cyan/50 text-cyan'
                    : 'border-white/10 text-text-muted hover:border-white/20'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </SettingRow>
        <ToggleRow
          label="Word Wrap"
          description="Wrap long lines in the editor"
          value={editorSettings.wordWrap}
          onChange={(value) => onUpdate({ wordWrap: value })}
        />
      </Section>

      <Section title="Auto Save">
        <ToggleRow
          label="Enable Auto Save"
          description="Automatically save your work"
          value={editorSettings.autoSave}
          onChange={(value) => onUpdate({ autoSave: value })}
        />
        {editorSettings.autoSave && (
          <SliderRow
            label="Save Interval"
            value={editorSettings.autoSaveInterval}
            min={1}
            max={30}
            step={1}
            unit="min"
            onChange={(value) => onUpdate({ autoSaveInterval: value })}
          />
        )}
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RECENT FILES TAB
// ═══════════════════════════════════════════════════════════════

interface RecentTabProps {
  recentFiles: RecentFile[];
  onOpenFile?: (file: RecentFile) => void;
  onRemoveFile?: (name: string) => void;
  onClearAll?: () => void;
}

function RecentTab({ recentFiles, onOpenFile, onRemoveFile, onClearAll }: RecentTabProps) {
  if (recentFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <Icon name="folder_open" className="text-4xl mb-3 opacity-50" />
        <p className="text-sm">No recent files</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted uppercase tracking-wider">
          Recently Opened Files
        </p>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2">
        {recentFiles.map((file) => (
          <div
            key={file.name}
            className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center flex-shrink-0">
              <Icon name="description" className="text-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text font-medium truncate">{file.name}</p>
              <p className="text-xs text-text-muted">
                {new Date(file.lastOpened).toLocaleDateString()}
              </p>
              {file.preview && (
                <p className="text-xs text-text-muted/50 truncate mt-1 font-mono">
                  {file.preview}
                </p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onOpenFile && (
                <button
                  onClick={() => onOpenFile(file)}
                  className="p-2 hover:bg-cyan/10 rounded-lg transition-colors"
                  title="Open"
                >
                  <Icon name="open_in_new" className="text-cyan text-sm" />
                </button>
              )}
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(file.name)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Icon name="close" className="text-red-400 text-sm" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <SettingRow label={label} description={description}>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-cyan' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </SettingRow>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text">{label}</p>
        <span className="text-sm text-cyan font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:bg-cyan/80 [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

export default SettingsModal;
