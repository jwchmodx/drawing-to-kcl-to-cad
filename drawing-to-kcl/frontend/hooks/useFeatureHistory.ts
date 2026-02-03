'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Feature,
  FeatureType,
  FeatureHistoryState,
  createFeature,
  createInitialFeatureHistoryState,
  addFeature,
  toggleFeature,
  deleteFeature,
  renameFeature,
  jumpToFeature,
  generateCombinedKCL,
  getAllFeatures,
  getCurrentIndex,
} from '@/lib/featureHistory';

export interface UseFeatureHistoryOptions {
  onKCLChange?: (kclCode: string) => void;
}

export interface UseFeatureHistoryReturn {
  features: Feature[];
  currentIndex: number;
  activeFeatureId: string | null;
  addFeature: (type: FeatureType, name: string, kclCode: string, params?: Record<string, unknown>) => void;
  addFromKCL: (kclCode: string, name: string) => void;
  toggleFeature: (id: string, enabled: boolean) => void;
  deleteFeature: (id: string) => void;
  renameFeature: (id: string, newName: string) => void;
  jumpTo: (index: number) => void;
  getCombinedKCL: () => string;
  getFeatureIndex: (featureId: string) => number;
  getFeatureById: (featureId: string) => Feature | undefined;
  rollback: (index: number) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  deleteFeatureById: (id: string) => void;
  toggleSuppress: (id: string) => void;
  duplicate: (id: string) => void;
}

export function useFeatureHistory(options: UseFeatureHistoryOptions = {}): UseFeatureHistoryReturn {
  const { onKCLChange } = options;
  const [state, setState] = useState<FeatureHistoryState>(createInitialFeatureHistoryState);
  const onKCLChangeRef = useRef(onKCLChange);
  
  useEffect(() => {
    onKCLChangeRef.current = onKCLChange;
  }, [onKCLChange]);

  const handleAddFeature = useCallback(
    (type: FeatureType, name: string, kclCode: string, params: Record<string, unknown> = {}) => {
      const feature = createFeature(type, name, kclCode, params);
      setState(prev => {
        const newState = addFeature(prev, feature);
        const combinedKCL = generateCombinedKCL(newState);
        setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
        return newState;
      });
    },
    []
  );

  const handleToggleFeature = useCallback((id: string, enabled: boolean) => {
    setState(prev => {
      const newState = toggleFeature(prev, id, enabled);
      const combinedKCL = generateCombinedKCL(newState);
      setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
      return newState;
    });
  }, []);

  const handleDeleteFeature = useCallback((id: string) => {
    setState(prev => {
      const newState = deleteFeature(prev, id);
      const combinedKCL = generateCombinedKCL(newState);
      setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
      return newState;
    });
  }, []);

  const handleRenameFeature = useCallback((id: string, newName: string) => {
    setState(prev => renameFeature(prev, id, newName));
  }, []);

  const handleJumpTo = useCallback((index: number) => {
    setState(prev => {
      const newState = jumpToFeature(prev, index);
      const combinedKCL = generateCombinedKCL(newState);
      setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
      return newState;
    });
  }, []);

  const getCombinedKCL = useCallback(() => {
    return generateCombinedKCL(state);
  }, [state]);

  const addFromKCL = useCallback((kclCode: string, name: string) => {
    handleAddFeature('sketch', name, kclCode);
  }, [handleAddFeature]);

  const getFeatureIndex = useCallback((featureId: string) => {
    return state.features.findIndex((f) => f.id === featureId);
  }, [state.features]);

  const getFeatureById = useCallback((featureId: string) => {
    return state.features.find((f) => f.id === featureId);
  }, [state.features]);

  const rollback = useCallback((index: number) => {
    setState((prev) => {
      const newState = jumpToFeature(prev, index);
      const combinedKCL = generateCombinedKCL(newState);
      setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
      return newState;
    });
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const features = [...prev.features];
      const [removed] = features.splice(fromIndex, 1);
      features.splice(toIndex, 0, removed);
      const newIndex = prev.currentIndex === fromIndex
        ? toIndex
        : prev.currentIndex < fromIndex && prev.currentIndex >= toIndex
        ? prev.currentIndex + 1
        : prev.currentIndex > fromIndex && prev.currentIndex <= toIndex
        ? prev.currentIndex - 1
        : prev.currentIndex;
      const newState = { features, currentIndex: newIndex };
      const combinedKCL = generateCombinedKCL(newState);
      setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
      return newState;
    });
  }, []);

  const deleteFeatureById = useCallback((id: string) => {
    handleDeleteFeature(id);
  }, [handleDeleteFeature]);

  const toggleSuppress = useCallback((id: string) => {
    const feat = state.features.find((f) => f.id === id);
    if (feat) handleToggleFeature(id, !feat.enabled);
  }, [state.features, handleToggleFeature]);

  const duplicate = useCallback((id: string) => {
    const feat = state.features.find((f) => f.id === id);
    if (feat) {
      const dup = createFeature(feat.type, `${feat.name} (copy)`, feat.kclCode, feat.params);
      setState((prev) => {
        const idx = prev.features.findIndex((f) => f.id === id);
        const baseState = {
          features: prev.features.slice(0, idx + 1),
          currentIndex: idx,
        };
        const newState = addFeature(baseState, dup);
        const combinedKCL = generateCombinedKCL(newState);
        setTimeout(() => onKCLChangeRef.current?.(combinedKCL), 0);
        return newState;
      });
    }
  }, [state.features]);

  const currentFeature = state.features[state.currentIndex];
  const activeFeatureId = currentFeature?.id ?? null;

  return {
    features: getAllFeatures(state),
    currentIndex: getCurrentIndex(state),
    activeFeatureId,
    addFeature: handleAddFeature,
    addFromKCL,
    toggleFeature: handleToggleFeature,
    deleteFeature: handleDeleteFeature,
    renameFeature: handleRenameFeature,
    jumpTo: handleJumpTo,
    getCombinedKCL,
    getFeatureIndex,
    getFeatureById,
    rollback,
    reorder,
    deleteFeatureById,
    toggleSuppress,
    duplicate,
  };
}

export default useFeatureHistory;
