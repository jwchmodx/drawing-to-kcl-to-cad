'use client';

import React, { useState, useCallback, useRef } from 'react';
import { KclPreview3D, FaceSelection, KclPreview3DRef, ViewType } from '@/components/KclPreview3D';
import { useDirectEdit, EditMode, Transform } from '@/hooks/useDirectEdit';
import { DirectEditToolbar, SketchPlaneSelector, TransformInfo } from '@/components/TransformGizmo';
import { generateTransformedKcl, updateExtrudeHeight } from '@/lib/kclGenerator';
import { exportToSTL, exportToSTLBinary, exportToSTEP } from '@/lib/geometryRuntime';
import { kclCodeToPreview, type PreviewResult } from '@/lib/kclToPreview';
import { KCLErrorDisplay, ParseStatus, ErrorToast } from '@/components/KCLErrorDisplay';
import dynamic from 'next/dynamic';

// Monaco Editor는 SSR이 안 되므로 dynamic import
const KCLCodeEditor = dynamic(() => import('@/components/KCLCodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-void text-text-muted">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      에디터 로딩 중...
    </div>
  ),
});
import type { KCLError } from '@/lib/kclErrorHandler';
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
import { useShortcuts } from '@/hooks/useShortcuts';
import { ShortcutHelp, ShortcutHelpButton } from '@/components/ShortcutHelp';
import { MeasureToolbar, MeasureButton } from '@/components/MeasureToolbar';
import { useMeasurement, MeasureClickInfo } from '@/lib/useMeasurement';
import { MeasureMode, Measurement, MeasureUnit } from '@/lib/measureEngine';
// Timeline and Feature History
import { Timeline } from '@/components/Timeline';
import { useFeatureHistory } from '@/hooks/useFeatureHistory';
import { Feature, FeatureType } from '@/lib/featureHistory';
// Dimensional Constraints
import {
  DimensionalConstraint,
  solveConstraints,
} from '@/lib/dimensionalConstraints';

import { Header, SidebarNav } from '@/components/layout';
import { ExportModal } from '@/components/modals';
import { FileTree, type ImportedFile } from '@/components/panels';
import { Icon } from '@/components/ui/Icon';

// ═══════════════════════════════════════════════════════════════
// VIEWPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
interface ViewportProps {
  preview: { meshes: { id?: string | null; vertices: [number, number, number][]; indices: number[] }[] } | null;
  onApplyOperation?: (operation: string, params: Record<string, number | string>) => void;
  onSketchComplete?: (kclCode: string) => void;
  preview3DRef?: React.RefObject<KclPreview3DRef>;
  currentView?: ViewType;
  onTransformApply?: (meshId: string, transform: Transform) => void;
  onPushPullApply?: (meshId: string, heightDelta: number) => void;
  // Dimensional constraints
  dimensionalConstraints?: DimensionalConstraint[];
  onConstraintAdd?: (constraint: DimensionalConstraint) => void;
  onConstraintUpdate?: (constraintId: string, value: number) => void;
  onConstraintDelete?: (constraintId: string) => void;
  dimensionMode?: boolean;
  onDimensionModeChange?: (active: boolean) => void;
}

function Viewport({ 
  preview, 
  onApplyOperation, 
  onSketchComplete, 
  preview3DRef, 
  currentView, 
  onTransformApply, 
  onPushPullApply,
  dimensionalConstraints = [],
  onConstraintAdd,
  onConstraintUpdate,
  onConstraintDelete,
  dimensionMode = false,
  onDimensionModeChange,
}: ViewportProps) {
  const [activeTool, setActiveTool] = useState('select');
  const [editMode, setEditMode] = useState(false);
  const [selectedFace, setSelectedFace] = useState<FaceSelection | null>(null);
  const [extrudeDistance, setExtrudeDistance] = useState(1);
  const [filletRadius, setFilletRadius] = useState(0.2);
  const hasPreview = preview && preview.meshes && preview.meshes.length > 0;
  
  // Direct Edit State
  const directEdit = useDirectEdit();
  const [gizmoSpace, setGizmoSpace] = useState<'local' | 'world'>('world');
  const [gizmoSnap, setGizmoSnap] = useState(false);
  const [selectedMeshId, setSelectedMeshId] = useState<string | null>(null);
  const [pushPullPreviewDelta, setPushPullPreviewDelta] = useState(0);

  // Sketch Mode State
  const [isSketchMode, setIsSketchMode] = useState(false);
  const [sketchState, setSketchState] = useState<SketchState>(createInitialSketchState());
  const [cursorPosition, setCursorPosition] = useState<Point2D | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('Viewport');

  // Measurement State
  const measurement = useMeasurement();
  const [showMeasurePanel, setShowMeasurePanel] = useState(false);

  // Section panel visibility (단면 보기)
  const [showSectionPanel, setShowSectionPanel] = useState(true);

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

  // Handle measurement toggle
  const handleMeasureToggle = useCallback(() => {
    const newActive = !measurement.state.isActive;
    if (newActive) {
      setEditMode(false);
      setActiveTool('select');
      setShowMeasurePanel(true);
    } else {
      setShowMeasurePanel(false);
    }
    measurement.toggleActive();
  }, [measurement]);

  const handleFaceSelect = useCallback((selection: FaceSelection | null) => {
    setSelectedFace(selection);
    if (selection?.meshId) {
      setSelectedMeshId(selection.meshId);
      directEdit.selectObject(selection.meshId, 0);
    }
  }, [directEdit]);

  // Direct edit mode change handler
  const handleDirectEditModeChange = useCallback((mode: EditMode) => {
    directEdit.setMode(mode);
    if (mode !== 'select') {
      setEditMode(true);
    }
  }, [directEdit]);

  // Transform change handler
  const handleTransformChange = useCallback((transform: Transform) => {
    directEdit.updateTransform(transform);
  }, [directEdit]);

  // Transform end handler - apply to KCL
  const handleTransformEnd = useCallback((transform: Transform) => {
    if (selectedMeshId && onTransformApply) {
      onTransformApply(selectedMeshId, transform);
    }
  }, [selectedMeshId, onTransformApply]);

  // Push/Pull handlers
  const handlePushPullDrag = useCallback((delta: number) => {
    setPushPullPreviewDelta(delta);
    directEdit.updatePushPull(delta);
  }, [directEdit]);

  const handlePushPullEnd = useCallback((delta: number) => {
    if (selectedMeshId && onPushPullApply) {
      onPushPullApply(selectedMeshId, delta);
    }
    setPushPullPreviewDelta(0);
    directEdit.endPushPull();
  }, [selectedMeshId, onPushPullApply, directEdit]);

  // Apply transform and reset
  const handleApplyTransform = useCallback(() => {
    if (directEdit.state.selectedObject && onTransformApply) {
      onTransformApply(
        directEdit.state.selectedObject.meshId,
        directEdit.state.selectedObject.currentTransform
      );
    }
    directEdit.clearSelection();
    setSelectedMeshId(null);
  }, [directEdit, onTransformApply]);

  // Cancel transform
  const handleCancelTransform = useCallback(() => {
    directEdit.resetTransform();
    directEdit.clearSelection();
    setSelectedMeshId(null);
  }, [directEdit]);

  // Keyboard shortcuts for direct edit
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editMode || !hasPreview) return;
      
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'g':
          e.preventDefault();
          handleDirectEditModeChange('translate');
          break;
        case 'r':
          e.preventDefault();
          handleDirectEditModeChange('rotate');
          break;
        case 's':
          e.preventDefault();
          handleDirectEditModeChange('scale');
          break;
        case 'p':
          e.preventDefault();
          handleDirectEditModeChange('pushpull');
          break;
        case 'escape':
          e.preventDefault();
          handleCancelTransform();
          handleDirectEditModeChange('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, hasPreview, handleDirectEditModeChange, handleCancelTransform]);

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

  // Sketch Mode Handlers
  const handleEnterSketchMode = useCallback(() => {
    setIsSketchMode(true);
    setEditMode(false);
    setSelectedFace(null);
    setSketchState(createInitialSketchState());
    setActiveTab('Sketch');
  }, []);

  const handleExitSketchMode = useCallback(() => {
    setIsSketchMode(false);
    setSketchState(createInitialSketchState());
    setCursorPosition(null);
    setActiveTab('Viewport');
  }, []);

  const handleToolChange = useCallback((tool: SketchTool) => {
    setSketchState(prev => ({ ...prev, currentTool: tool }));
  }, []);

  const handlePlaneChange = useCallback((plane: SketchPlane) => {
    setSketchState(prev => ({
      ...prev,
      plane: getDefaultPlaneConfig(plane),
    }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setSketchState(prev => ({ ...prev, gridVisible: !prev.gridVisible }));
  }, []);

  const handleToggleSnap = useCallback(() => {
    setSketchState(prev => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, []);

  const handleFinishSketch = useCallback(() => {
    if (sketchState.elements.length > 0) {
      setShowFinishDialog(true);
    }
  }, [sketchState.elements.length]);

  const handleExtrudeSketch = useCallback((distance: number) => {
    const kclCode = generateExtrudeFromSketchKCL(
      sketchState.elements,
      sketchState.plane,
      distance,
      `sketch_${Date.now()}`
    );
    if (onSketchComplete) {
      onSketchComplete(kclCode);
    }
    setShowFinishDialog(false);
    handleExitSketchMode();
  }, [sketchState, onSketchComplete, handleExitSketchMode]);

  const handleRevolveSketch = useCallback((angle: number) => {
    // TODO: Implement revolve
    const profileName = `sketch_${Date.now()}`;
    const profileKCL = generateSketchProfileKCL(sketchState.elements, sketchState.plane, profileName);
    const kclCode = `${profileKCL}\nlet ${profileName}_revolve = revolve(${profileName}, angle: ${angle})`;
    if (onSketchComplete) {
      onSketchComplete(kclCode);
    }
    setShowFinishDialog(false);
    handleExitSketchMode();
  }, [sketchState, onSketchComplete, handleExitSketchMode]);

  const handleSaveProfile = useCallback((name: string) => {
    const kclCode = generateSketchProfileKCL(sketchState.elements, sketchState.plane, name);
    if (onSketchComplete) {
      onSketchComplete(kclCode);
    }
    setShowFinishDialog(false);
    handleExitSketchMode();
  }, [sketchState, onSketchComplete, handleExitSketchMode]);

  return (
    <main className="flex-1 relative flex flex-col bg-void min-w-0 min-h-0">
      {/* Sketch Mode Toolbar (when in sketch mode) */}
      {isSketchMode ? (
        <SketchToolbar
          isSketchMode={isSketchMode}
          onEnterSketchMode={handleEnterSketchMode}
          onExitSketchMode={handleExitSketchMode}
          currentTool={sketchState.currentTool}
          onToolChange={handleToolChange}
          currentPlane={sketchState.plane.type}
          onPlaneChange={handlePlaneChange}
          gridVisible={sketchState.gridVisible}
          onToggleGrid={handleToggleGrid}
          snapEnabled={sketchState.snapEnabled}
          onToggleSnap={handleToggleSnap}
          onFinishSketch={handleFinishSketch}
          canFinish={sketchState.elements.length > 0}
        />
      ) : (
        /* Normal Floating Toolbar */
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 z-10 glow-cyan">
          {/* Sketch Mode Entry Button */}
          <button
            onClick={handleEnterSketchMode}
            className="flex items-center gap-2 px-3 py-2 bg-green/20 text-green hover:bg-green/30 rounded-lg transition-all"
            title="New Sketch (2D Drawing)"
          >
            <Icon name="draw" className="text-lg" />
            <span className="text-xs font-medium">Sketch</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

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

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Measurement Button */}
          <MeasureButton
            isActive={measurement.state.isActive}
            onClick={handleMeasureToggle}
            measurementCount={measurement.state.measurements.length}
          />
        </div>
      )}

      {/* Face Selection Panel */}
      {editMode && selectedFace && !isSketchMode && (
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

      {/* Direct Edit Toolbar */}
      {editMode && !isSketchMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <DirectEditToolbar
            mode={directEdit.state.mode}
            onModeChange={handleDirectEditModeChange}
            space={gizmoSpace}
            onSpaceChange={setGizmoSpace}
            snapEnabled={gizmoSnap}
            onSnapChange={setGizmoSnap}
            onApply={handleApplyTransform}
            onCancel={handleCancelTransform}
            hasSelection={selectedMeshId !== null}
          />
        </div>
      )}

      {/* Transform Info Panel */}
      {editMode && !isSketchMode && directEdit.state.selectedObject && (
        <div className="absolute top-20 left-4 z-10">
          <TransformInfo
            position={directEdit.state.selectedObject.currentTransform.position}
            rotation={directEdit.state.selectedObject.currentTransform.rotation}
            scale={directEdit.state.selectedObject.currentTransform.scale}
          />
        </div>
      )}

      {/* Push/Pull Preview */}
      {directEdit.state.mode === 'pushpull' && pushPullPreviewDelta !== 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-surface/95 border border-cyan/30 rounded-lg">
          <span className="text-xs text-cyan font-mono">
            Push/Pull: {pushPullPreviewDelta > 0 ? '+' : ''}{pushPullPreviewDelta.toFixed(2)}
          </span>
        </div>
      )}

      {/* Sketch Plane Selector */}
      {editMode && !isSketchMode && directEdit.state.mode === 'pushpull' && !selectedFace && (
        <div className="absolute bottom-20 right-4 z-10">
          <SketchPlaneSelector
            selectedPlane={directEdit.state.sketchPlane?.type ?? null}
            onSelectPlane={(plane) => directEdit.setSketchPlaneFromType(plane)}
          />
        </div>
      )}

      {/* Edit Mode Indicator */}
      {editMode && !isSketchMode && (
        <div className="absolute top-4 left-4 bg-orange/20 border border-orange/30 rounded-lg px-3 py-1.5 z-10">
          <span className="text-xs font-medium text-orange">EDIT MODE</span>
          <span className="text-xs text-text-muted ml-2">Click faces to select</span>
        </div>
      )}

      {/* Measurement Mode Indicator */}
      {measurement.state.isActive && !isSketchMode && (
        <div className="absolute top-4 left-4 bg-cyan/20 border border-cyan/30 rounded-lg px-3 py-1.5 z-10">
          <span className="text-xs font-medium text-cyan">MEASURE MODE</span>
          <span className="text-xs text-text-muted ml-2">
            {measurement.state.mode === 'distance' && 'Click two points'}
            {measurement.state.mode === 'angle' && 'Click three points'}
            {measurement.state.mode === 'area' && 'Click a face'}
            {measurement.state.mode === 'volume' && 'Click an object'}
            {measurement.state.mode === 'none' && 'Select a measurement type'}
          </span>
        </div>
      )}

      {/* Measurement Panel */}
      {showMeasurePanel && !isSketchMode && (
        <div className="absolute top-20 left-4 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 z-10 w-72">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Measurements</div>
            <button 
              onClick={() => setShowMeasurePanel(false)}
              className="p-1 text-text-dim hover:text-text transition-colors"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
          <MeasureToolbar
            mode={measurement.state.mode}
            onModeChange={measurement.setMode}
            measurements={measurement.state.measurements}
            onDeleteMeasurement={measurement.deleteMeasurement}
            onClearAll={measurement.clearAllMeasurements}
            unit={measurement.state.unit}
            onUnitChange={measurement.setUnit}
            pendingPointCount={measurement.state.pendingPoints.length}
            disabled={!hasPreview}
          />
        </div>
      )}

      {/* Viewport / Sketch Canvas */}
      <div className="flex-1 relative overflow-hidden viewport-grid flex items-center justify-center">
        {isSketchMode ? (
          /* 2D Sketch Canvas */
          <div className="w-full h-full">
            <SketchCanvas
              sketchState={sketchState}
              onStateChange={setSketchState}
              onCursorMove={setCursorPosition}
              constraints={dimensionalConstraints}
              onConstraintAdd={onConstraintAdd}
              onConstraintUpdate={onConstraintUpdate}
              onConstraintDelete={onConstraintDelete}
              dimensionMode={dimensionMode}
              onDimensionModeChange={onDimensionModeChange}
            />
            <SketchInfoPanel
              sketchState={sketchState}
              cursorPosition={cursorPosition}
            />
            {/* Dimension Mode Info */}
            {dimensionMode && (
              <div className="absolute top-2 right-4 bg-blue-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium z-20">
                Press D to add dimension to selected element
              </div>
            )}
          </div>
        ) : hasPreview ? (
          <div className="w-full h-full">
            <KclPreview3D
              ref={preview3DRef}
              preview={preview}
              editMode={editMode}
              selectedFace={selectedFace}
              onFaceSelect={handleFaceSelect}
              directEditMode={directEdit.state.mode}
              showGizmo={directEdit.state.showGizmo}
              selectedMeshId={selectedMeshId}
              onTransformChange={handleTransformChange}
              onTransformEnd={handleTransformEnd}
              onPushPullDrag={handlePushPullDrag}
              onPushPullEnd={handlePushPullEnd}
              onMeshSelect={setSelectedMeshId}
              showSectionControls={showSectionPanel}
              onSectionPanelClose={() => setShowSectionPanel(false)}
            />
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-gradient-radial from-cyan/10 via-transparent to-transparent blur-3xl" />
            <div className="text-center text-text-muted relative z-10">
              <Icon name="view_in_ar" className="text-6xl mb-4 text-cyan/30" />
              <p className="text-sm">KCL 코드를 입력하거나 스케치를 시작하세요</p>
              <p className="text-xs mt-2 text-text-dim">위의 <strong className="text-green">Sketch</strong> 버튼을 클릭해서 2D 스케치 시작</p>
              <p className="text-xs mt-2 text-text-dim font-mono">또는 KCL 코드 입력: box(size: [1, 2, 3], center: [0, 0, 0])</p>
            </div>
          </div>
        )}

        {/* Bottom Left Info */}
        {!isSketchMode && (
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
        )}

        {/* Camera Controls */}
        {!isSketchMode && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            {!showSectionPanel && (
              <button
                onClick={() => setShowSectionPanel(true)}
                className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text hover:border-cyan/30 transition-colors"
                title="단면 보기 패널 표시"
              >
                <Icon name="view_agenda" className="text-lg" />
              </button>
            )}
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
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-white/5 bg-surface/80 backdrop-blur-sm px-4 shrink-0">
        <div className="flex gap-1">
          {['Viewport', 'Sketch', 'Wireframe', 'Node Editor'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'Sketch' && !isSketchMode) {
                  handleEnterSketchMode();
                } else if (tab !== 'Sketch') {
                  handleExitSketchMode();
                }
                setActiveTab(tab);
              }}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab
                  ? tab === 'Sketch' ? 'text-green' : 'text-cyan'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab === 'Sketch' ? 'bg-green' : 'bg-cyan'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sketch Finish Dialog */}
      <SketchFinishDialog
        isOpen={showFinishDialog}
        onClose={() => setShowFinishDialog(false)}
        onExtrude={handleExtrudeSketch}
        onRevolve={handleRevolveSketch}
        onSaveProfile={handleSaveProfile}
      />
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
  onValidate?: (errors: KCLError[], warnings: KCLError[]) => void;
}

function ChatPanel({ onSubmitCode, kclCode, onValidate }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'ai' | 'code'>('code'); // 기본 코드 모드
  const [editorCode, setEditorCode] = useState('// KCL 코드를 입력하세요\n// Ctrl+Enter로 실행\n\nlet myBox = box(50, 30, 20)\n');
  const [editorErrors, setEditorErrors] = useState<KCLError[]>([]);
  const [editorWarnings, setEditorWarnings] = useState<KCLError[]>([]);

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

      {/* 코드 모드: Monaco Editor */}
      {mode === 'code' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <KCLCodeEditor
              value={editorCode}
              onChange={setEditorCode}
              onValidate={(errors, warnings) => {
                setEditorErrors(errors);
                setEditorWarnings(warnings);
                onValidate?.(errors, warnings);
              }}
              onRun={(code) => onSubmitCode(code)}
            />
          </div>
          
          {/* 에러 요약 */}
          {(editorErrors.length > 0 || editorWarnings.length > 0) && (
            <div className="border-t border-white/5 bg-surface/50 px-3 py-2 max-h-32 overflow-y-auto">
              {editorErrors.map((err, i) => (
                <div key={`err-${i}`} className="flex items-start gap-2 text-xs py-1">
                  <span className="text-red-400">●</span>
                  <span className="text-red-400">Line {err.line}:</span>
                  <span className="text-text-muted flex-1">{err.message}</span>
                </div>
              ))}
              {editorWarnings.map((warn, i) => (
                <div key={`warn-${i}`} className="flex items-start gap-2 text-xs py-1">
                  <span className="text-yellow-400">●</span>
                  <span className="text-yellow-400">Line {warn.line}:</span>
                  <span className="text-text-muted flex-1">{warn.message}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* 실행 버튼 */}
          <div className="border-t border-white/5 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editorErrors.length === 0 ? (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <Icon name="check_circle" className="text-sm" /> 유효한 코드
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 text-xs">
                  <Icon name="error" className="text-sm" /> {editorErrors.length}개 오류
                </span>
              )}
            </div>
            <button
              onClick={() => onSubmitCode(editorCode)}
              disabled={editorErrors.length > 0}
              className="btn-primary px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="play_arrow" className="text-base" />
              실행
            </button>
          </div>
        </div>
      )}

      {/* AI 모드: 채팅 UI */}
      {mode === 'ai' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Icon name="auto_awesome" className="text-4xl text-text-dim mb-3" />
                <p className="text-sm text-text-muted">만들고 싶은 3D 모델을 설명하세요</p>
                <p className="text-xs text-text-dim mt-2">예: "간단한 테이블 만들어줘"</p>
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
                      <button
                        onClick={() => {
                          setEditorCode(msg.content);
                          setMode('code');
                        }}
                        className="mt-2 text-xs text-text-muted hover:text-cyan flex items-center gap-1"
                      >
                        <Icon name="edit" className="text-sm" />
                        에디터에서 편집
                      </button>
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
          </div>

          <div className="p-4 border-t border-white/5 shrink-0">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="command-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-text placeholder:text-text-dim resize-none h-24 disabled:opacity-50"
                placeholder='"간단한 의자 만들어줘" 또는 "테이블과 의자"'
              />
              <div className="absolute bottom-3 right-3">
                <button 
                  className="btn-primary p-2 rounded-lg disabled:opacity-50" 
                  aria-label="Generate"
                  onClick={handleSubmit}
                  disabled={isLoading || !message.trim()}
                >
                  <Icon name="auto_awesome" className="text-lg" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-dim">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
                <span className="ml-1">to run</span>
              </div>
            </div>
          </div>
        </>
      )}
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
  const previewDataRef = useRef<PreviewResult | null>(null);
  
  // 에러 상태
  const [parseErrors, setParseErrors] = useState<KCLError[]>([]);
  const [parseWarnings, setParseWarnings] = useState<KCLError[]>([]);
  const [showErrors, setShowErrors] = useState(true);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [selectedImportedFile, setSelectedImportedFile] = useState<ImportedFile | null>(null);
  const [historyPanelCollapsed, setHistoryPanelCollapsed] = useState(false);
  const prevKclCodeRef = useRef('');
  
  // Refs for shortcuts
  const preview3DRef = useRef<KclPreview3DRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentView, setCurrentView] = useState<ViewType>('perspective');
  
  // Feature History (Timeline)
  const featureHistory = useFeatureHistory({
    onKCLChange: useCallback((kcl: string) => {
      // When feature timeline changes, update the preview
      setKclCode(kcl);
      try {
        const newPreview = kclCodeToPreview(kcl);
        previewDataRef.current = newPreview;
        setPreview({ meshes: newPreview.meshes });
      } catch (error) {
        console.error('KCL parsing error on feature change:', error);
      }
    }, []),
  });
  
  // Dimensional Constraints
  const [dimensionalConstraints, setDimensionalConstraints] = useState<DimensionalConstraint[]>([]);
  const [dimensionMode, setDimensionMode] = useState(false);

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

  // Shortcut handlers
  const handleSave = useCallback(() => {
    if (!kclCode) return;
    const blob = new Blob([kclCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.kcl';
    a.click();
    URL.revokeObjectURL(url);
  }, [kclCode]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    preview3DRef.current?.setView(view);
    setCurrentView(view);
  }, []);

  const handleFocus = useCallback(() => {
    preview3DRef.current?.focusOnSelection();
  }, []);

  // Keyboard shortcuts hook
  const { showHelp, setShowHelp } = useShortcuts({
    onSave: handleSave,
    onOpen: handleOpen,
    onUndo: history.undo,
    onRedo: history.redo,
    onEscape: useCallback(() => {
      setShowHelp(false);
    }, []),
    onFocus: handleFocus,
    onViewChange: handleViewChange,
    enabled: true,
  });

  // Handle file input change for Open shortcut
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.kcl')) {
      file.text().then(text => {
        updateKclCodeWithHistory(text, `Open ${file.name}`);
        try {
          const newPreview = kclCodeToPreview(text);
          previewDataRef.current = newPreview;
          setPreview({ meshes: newPreview.meshes });
        } catch (error) {
          console.error('KCL parse error:', error);
        }
      });
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [updateKclCodeWithHistory]);

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

  const handleSubmitCode = useCallback((code: string, label?: string) => {
    updateKclCodeWithHistory(code, label || 'AI Generated Code');
    
    // 에러 처리가 포함된 파싱
    const result = kclCodeToPreview(code);
    previewDataRef.current = result;
    
    // 에러/경고 상태 업데이트
    setParseErrors(result.errors);
    setParseWarnings(result.warnings);
    setShowErrors(result.errors.length > 0 || result.warnings.length > 0);
    
    if (result.success) {
      setPreview({ meshes: result.meshes });
      console.log(`✅ KCL 파싱 성공: ${result.meshes.length}개 메시 생성`);
    } else {
      setPreview(null);
      console.error('❌ KCL 파싱 실패:', result.errors.map(e => e.message).join(', '));
    }
  }, [updateKclCodeWithHistory]);

  // Handle transform apply from direct edit
  const handleTransformApply = useCallback((meshId: string, transform: Transform) => {
    if (!kclCode) return;
    
    // Calculate delta from default transform
    const delta = {
      position: transform.position,
      rotation: transform.rotation,
      scale: transform.scale,
    };
    
    const newCode = generateTransformedKcl(kclCode, delta);
    handleSubmitCode(newCode, `Transform ${meshId}`);
  }, [kclCode, handleSubmitCode]);

  // Handle push/pull apply from direct edit
  const handlePushPullApply = useCallback((meshId: string, heightDelta: number) => {
    if (!kclCode) return;
    
    // For now, we'll update the extrude height in the code
    // This is a simplified version - in production you'd need to identify the specific extrude
    const extrudeMatch = kclCode.match(/extrude\s*\([^)]+,\s*distance\s*:\s*([-\d.e]+)\s*\)/);
    if (extrudeMatch) {
      const newCode = updateExtrudeHeight(kclCode, heightDelta);
      handleSubmitCode(newCode, `Push/Pull ${heightDelta > 0 ? '+' : ''}${heightDelta.toFixed(2)}`);
    }
  }, [kclCode, handleSubmitCode]);

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
      handleSubmitCode(newCode, 'Extrude');
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
      handleSubmitCode(newCode, 'Apply Fillet');
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

  // Handle constraint changes
  const handleConstraintAdd = useCallback((constraint: DimensionalConstraint) => {
    setDimensionalConstraints(prev => [...prev, constraint]);
  }, []);
  
  const handleConstraintUpdate = useCallback((constraintId: string, value: number) => {
    setDimensionalConstraints(prev => 
      prev.map(c => c.id === constraintId ? { ...c, value } : c)
    );
    // TODO: Solve constraints and update geometry
  }, []);
  
  const handleConstraintDelete = useCallback((constraintId: string) => {
    setDimensionalConstraints(prev => prev.filter(c => c.id !== constraintId));
  }, []);

  // Handle sketch complete with feature history
  const handleSketchCompleteWithHistory = useCallback((code: string) => {
    handleSubmitCode(code, 'Sketch Complete');
    // Add to feature history
    featureHistory.addFromKCL(code, 'New Sketch');
  }, [handleSubmitCode, featureHistory]);

  return (
    <>
      {/* Hidden file input for Open shortcut */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".kcl"
        className="hidden"
        onChange={handleFileInputChange}
      />
      
      <Header onExportClick={() => setShowExportModal(true)} />
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex flex-1 overflow-hidden min-h-0">
          <SidebarNav />
          <FileTree 
            importedFiles={importedFiles}
            onFileImport={handleFileImport}
            onFileSelect={handleFileSelect}
            selectedFile={selectedImportedFile}
          />
          <Viewport 
            preview={preview} 
            onApplyOperation={handleApplyOperation} 
            onSketchComplete={handleSketchCompleteWithHistory}
            preview3DRef={preview3DRef}
            currentView={currentView}
            onTransformApply={handleTransformApply}
            onPushPullApply={handlePushPullApply}
            // Dimensional constraints
            dimensionalConstraints={dimensionalConstraints}
            onConstraintAdd={handleConstraintAdd}
            onConstraintUpdate={handleConstraintUpdate}
            onConstraintDelete={handleConstraintDelete}
            dimensionMode={dimensionMode}
            onDimensionModeChange={setDimensionMode}
          />
          <HistoryPanel
            entries={history.entries}
            currentIndex={history.currentIndex}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
            onJumpTo={history.jumpTo}
            isCollapsed={historyPanelCollapsed}
            onToggleCollapse={() => setHistoryPanelCollapsed(prev => !prev)}
          />
          <ChatPanel 
            onSubmitCode={handleSubmitCode} 
            kclCode={kclCode}
            onValidate={(errors, warnings) => {
              setParseErrors(errors);
              setParseWarnings(warnings);
            }}
          />
        </div>
        
        {/* Feature Timeline */}
        <Timeline
          features={featureHistory.features}
          currentIndex={featureHistory.currentIndex}
          activeFeatureId={featureHistory.activeFeatureId}
          onFeatureClick={(featureId) => {
            const index = featureHistory.getFeatureIndex(featureId);
            if (index !== -1) {
              featureHistory.rollback(index);
            }
          }}
          onFeatureDoubleClick={(featureId) => {
            // Open edit modal for the feature
            const feature = featureHistory.getFeatureById(featureId);
            if (feature) {
              console.log('Edit feature:', feature);
              // TODO: Open feature edit modal
            }
          }}
          onReorder={featureHistory.reorder}
          onDelete={featureHistory.deleteFeatureById}
          onToggleSuppress={featureHistory.toggleSuppress}
          onDuplicate={featureHistory.duplicate}
          onRollbackTo={featureHistory.rollback}
        />
        
        {/* KCL 파싱 에러 표시 */}
        {showErrors && (parseErrors.length > 0 || parseWarnings.length > 0) && (
          <KCLErrorDisplay
            errors={parseErrors}
            warnings={parseWarnings}
            onDismiss={() => setShowErrors(false)}
            onErrorClick={(error) => {
              // 에러 클릭 시 해당 라인으로 이동 (향후 구현)
              console.log('Error clicked:', error);
            }}
          />
        )}
      </div>
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
      
      {/* Keyboard shortcuts help */}
      <ShortcutHelpButton onClick={() => setShowHelp(true)} />
      <ShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
