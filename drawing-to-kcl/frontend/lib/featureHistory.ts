/**
 * Feature History - Manages parametric modeling features
 */

export type FeatureType = 
  | 'sketch'
  | 'extrude'
  | 'revolve'
  | 'fillet'
  | 'chamfer'
  | 'boolean'
  | 'pattern'
  | 'mirror'
  | 'shell'
  | 'import'
  | 'primitive';

export interface Feature {
  id: string;
  type: FeatureType;
  name: string;
  kclCode: string;
  enabled: boolean;
  timestamp: number;
  params: Record<string, unknown>;
}

export interface FeatureHistoryState {
  features: Feature[];
  currentIndex: number;
}

/**
 * Create a new feature
 */
export function createFeature(
  type: FeatureType,
  name: string,
  kclCode: string,
  params: Record<string, unknown> = {}
): Feature {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name,
    kclCode,
    enabled: true,
    timestamp: Date.now(),
    params,
  };
}

/**
 * Create initial feature history state
 */
export function createInitialFeatureHistoryState(): FeatureHistoryState {
  return {
    features: [],
    currentIndex: -1,
  };
}

/**
 * Add a feature to the history
 */
export function addFeature(
  state: FeatureHistoryState,
  feature: Feature
): FeatureHistoryState {
  // Remove any features after current index (branching)
  const newFeatures = [
    ...state.features.slice(0, state.currentIndex + 1),
    feature,
  ];
  
  return {
    features: newFeatures,
    currentIndex: newFeatures.length - 1,
  };
}

/**
 * Toggle a feature's enabled state
 */
export function toggleFeature(
  state: FeatureHistoryState,
  featureId: string,
  enabled: boolean
): FeatureHistoryState {
  return {
    ...state,
    features: state.features.map(f =>
      f.id === featureId ? { ...f, enabled } : f
    ),
  };
}

/**
 * Delete a feature
 */
export function deleteFeature(
  state: FeatureHistoryState,
  featureId: string
): FeatureHistoryState {
  const newFeatures = state.features.filter(f => f.id !== featureId);
  return {
    features: newFeatures,
    currentIndex: Math.min(state.currentIndex, newFeatures.length - 1),
  };
}

/**
 * Rename a feature
 */
export function renameFeature(
  state: FeatureHistoryState,
  featureId: string,
  newName: string
): FeatureHistoryState {
  return {
    ...state,
    features: state.features.map(f =>
      f.id === featureId ? { ...f, name: newName } : f
    ),
  };
}

/**
 * Jump to a specific feature index
 */
export function jumpToFeature(
  state: FeatureHistoryState,
  index: number
): FeatureHistoryState {
  return {
    ...state,
    currentIndex: Math.max(-1, Math.min(index, state.features.length - 1)),
  };
}

/**
 * Generate combined KCL code from all enabled features up to current index
 */
export function generateCombinedKCL(state: FeatureHistoryState): string {
  const enabledFeatures = state.features
    .slice(0, state.currentIndex + 1)
    .filter(f => f.enabled);
  
  return enabledFeatures.map(f => f.kclCode).join('\n');
}

/**
 * Get all features
 */
export function getAllFeatures(state: FeatureHistoryState): Feature[] {
  return state.features;
}

/**
 * Get current feature index
 */
export function getCurrentIndex(state: FeatureHistoryState): number {
  return state.currentIndex;
}
