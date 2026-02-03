'use client';

import { useState, useCallback } from 'react';

export type EditMode = 'select' | 'translate' | 'rotate' | 'scale' | 'pushpull';

export type SketchPlaneType = 'xy' | 'xz' | 'yz' | null;

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SelectedObject {
  meshId: string;
  faceIndex: number;
  currentTransform: Transform;
}

export interface DirectEditState {
  mode: EditMode;
  isActive: boolean;
  transform: Transform;
  initialTransform: Transform | null;
  selectedObject: SelectedObject | null;
  showGizmo: boolean;
  sketchPlane: { type: SketchPlaneType } | null;
  pushPullDelta: number;
}

const DEFAULT_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

export interface UseDirectEditOptions {
  onTransformChange?: (transform: Transform) => void;
  onModeChange?: (mode: EditMode) => void;
}

export interface UseDirectEditReturn {
  state: DirectEditState;
  setMode: (mode: EditMode) => void;
  startEdit: (initialTransform?: Transform) => void;
  updateTransform: (transform: Partial<Transform> | Transform) => void;
  applyEdit: () => Transform;
  cancelEdit: () => void;
  reset: () => void;
  selectObject: (meshId: string, faceIndex: number) => void;
  clearSelection: () => void;
  resetTransform: () => void;
  updatePushPull: (delta: number) => void;
  endPushPull: () => void;
  setSketchPlaneFromType: (plane: SketchPlaneType) => void;
}

export function useDirectEdit(options: UseDirectEditOptions = {}): UseDirectEditReturn {
  const { onTransformChange, onModeChange } = options;

  const [state, setState] = useState<DirectEditState>({
    mode: 'select',
    isActive: false,
    transform: { ...DEFAULT_TRANSFORM },
    initialTransform: null,
    selectedObject: null,
    showGizmo: false,
    sketchPlane: null,
    pushPullDelta: 0,
  });

  const setMode = useCallback((mode: EditMode) => {
    setState((prev) => ({ ...prev, mode, showGizmo: mode !== 'select' && prev.selectedObject !== null }));
    onModeChange?.(mode);
  }, [onModeChange]);

  const startEdit = useCallback((initialTransform?: Transform) => {
    const transform = initialTransform || { ...DEFAULT_TRANSFORM };
    setState((prev) => ({
      ...prev,
      isActive: true,
      transform,
      initialTransform: { ...transform },
    }));
  }, []);

  const updateTransform = useCallback((partial: Partial<Transform> | Transform) => {
    const update = (prev: DirectEditState) => {
      const newTransform = { ...prev.transform, ...partial };
      onTransformChange?.(newTransform);
      return {
        ...prev,
        transform: newTransform,
        selectedObject: prev.selectedObject
          ? { ...prev.selectedObject, currentTransform: newTransform }
          : null,
      };
    };
    setState(update);
  }, [onTransformChange]);

  const applyEdit = useCallback((): Transform => {
    const appliedTransform = { ...state.transform };
    setState((prev) => ({
      ...prev,
      isActive: false,
      initialTransform: null,
    }));
    return appliedTransform;
  }, [state.transform]);

  const cancelEdit = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      transform: prev.initialTransform || { ...DEFAULT_TRANSFORM },
      initialTransform: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      mode: 'select',
      isActive: false,
      transform: { ...DEFAULT_TRANSFORM },
      initialTransform: null,
      selectedObject: null,
      showGizmo: false,
      sketchPlane: null,
      pushPullDelta: 0,
    });
  }, []);

  const selectObject = useCallback((meshId: string, faceIndex: number) => {
    setState((prev) => ({
      ...prev,
      selectedObject: {
        meshId,
        faceIndex,
        currentTransform: { ...prev.transform },
      },
      showGizmo: prev.mode !== 'select',
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedObject: null,
      showGizmo: false,
    }));
  }, []);

  const resetTransform = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transform: prev.initialTransform || { ...DEFAULT_TRANSFORM },
      selectedObject: prev.selectedObject
        ? { ...prev.selectedObject, currentTransform: prev.initialTransform || { ...DEFAULT_TRANSFORM } }
        : null,
      showGizmo: false,
    }));
  }, []);

  const updatePushPull = useCallback((delta: number) => {
    setState((prev) => ({ ...prev, pushPullDelta: delta }));
  }, []);

  const endPushPull = useCallback(() => {
    setState((prev) => ({ ...prev, pushPullDelta: 0 }));
  }, []);

  const setSketchPlaneFromType = useCallback((plane: SketchPlaneType) => {
    setState((prev) => ({
      ...prev,
      sketchPlane: plane ? { type: plane } : null,
    }));
  }, []);

  return {
    state,
    setMode,
    startEdit,
    updateTransform,
    applyEdit,
    cancelEdit,
    reset,
    selectObject,
    clearSelection,
    resetTransform,
    updatePushPull,
    endPushPull,
    setSketchPlaneFromType,
  };
}

export default useDirectEdit;
