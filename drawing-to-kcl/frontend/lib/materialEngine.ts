/**
 * Material Engine for Forge 3D CAD
 * Handles material creation, management, and application to Three.js meshes
 */

import * as THREE from 'three';
import {
  MaterialProperties,
  MaterialPreset,
  DEFAULT_MATERIAL,
  PRESET_BY_ID,
  ALL_PRESETS,
  createCustomMaterial,
} from './materialPresets';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ObjectMaterialAssignment {
  meshId: string;
  materialId: string;
  customProperties?: Partial<MaterialProperties>;
}

export interface MaterialEngineState {
  assignments: Map<string, ObjectMaterialAssignment>;
  customMaterials: Map<string, MaterialPreset>;
}

// ═══════════════════════════════════════════════════════════════
// MATERIAL ENGINE CLASS
// ═══════════════════════════════════════════════════════════════

export class MaterialEngine {
  private assignments: Map<string, ObjectMaterialAssignment>;
  private customMaterials: Map<string, MaterialPreset>;
  private threeMaterials: Map<string, THREE.MeshStandardMaterial>;

  constructor() {
    this.assignments = new Map();
    this.customMaterials = new Map();
    this.threeMaterials = new Map();
  }

  // ═════════════════════════════════════════════════════════════
  // MATERIAL CREATION
  // ═════════════════════════════════════════════════════════════

  /**
   * Create a Three.js material from properties
   */
  createThreeMaterial(properties: MaterialProperties): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(properties.color),
      metalness: properties.metalness,
      roughness: properties.roughness,
      opacity: properties.opacity,
      transparent: properties.transparent || properties.opacity < 1,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    if (properties.emissive) {
      material.emissive = new THREE.Color(properties.emissive);
      material.emissiveIntensity = properties.emissiveIntensity ?? 1;
    }

    // Ensure proper depth handling for transparent materials
    if (material.transparent) {
      material.depthWrite = false;
    }

    return material;
  }

  /**
   * Get or create a cached Three.js material for a preset
   */
  getThreeMaterialForPreset(presetId: string): THREE.MeshStandardMaterial {
    // Check cache
    if (this.threeMaterials.has(presetId)) {
      return this.threeMaterials.get(presetId)!.clone();
    }

    // Find preset
    const preset = PRESET_BY_ID[presetId] ?? this.customMaterials.get(presetId);
    if (!preset) {
      console.warn(`Material preset not found: ${presetId}, using default`);
      return this.createThreeMaterial(DEFAULT_MATERIAL.properties);
    }

    // Create and cache
    const material = this.createThreeMaterial(preset.properties);
    this.threeMaterials.set(presetId, material);
    
    return material.clone();
  }

  /**
   * Get material for a specific mesh
   */
  getMaterialForMesh(meshId: string): THREE.MeshStandardMaterial {
    const assignment = this.assignments.get(meshId);
    
    if (!assignment) {
      return this.createThreeMaterial(DEFAULT_MATERIAL.properties);
    }

    // Get base material
    const baseMaterial = this.getThreeMaterialForPreset(assignment.materialId);

    // Apply custom overrides if any
    if (assignment.customProperties) {
      this.applyCustomProperties(baseMaterial, assignment.customProperties);
    }

    return baseMaterial;
  }

  /**
   * Apply custom property overrides to a material
   */
  private applyCustomProperties(
    material: THREE.MeshStandardMaterial,
    properties: Partial<MaterialProperties>
  ): void {
    if (properties.color !== undefined) {
      material.color.set(properties.color);
    }
    if (properties.metalness !== undefined) {
      material.metalness = properties.metalness;
    }
    if (properties.roughness !== undefined) {
      material.roughness = properties.roughness;
    }
    if (properties.opacity !== undefined) {
      material.opacity = properties.opacity;
      material.transparent = properties.opacity < 1;
      material.depthWrite = properties.opacity >= 1;
    }
    if (properties.emissive !== undefined) {
      material.emissive.set(properties.emissive);
    }
    if (properties.emissiveIntensity !== undefined) {
      material.emissiveIntensity = properties.emissiveIntensity;
    }
    material.needsUpdate = true;
  }

  // ═════════════════════════════════════════════════════════════
  // ASSIGNMENT MANAGEMENT
  // ═════════════════════════════════════════════════════════════

  /**
   * Assign a material to a mesh
   */
  assignMaterial(
    meshId: string,
    materialId: string,
    customProperties?: Partial<MaterialProperties>
  ): void {
    this.assignments.set(meshId, {
      meshId,
      materialId,
      customProperties,
    });
  }

  /**
   * Remove material assignment from a mesh (reverts to default)
   */
  removeMaterialAssignment(meshId: string): void {
    this.assignments.delete(meshId);
  }

  /**
   * Get current assignment for a mesh
   */
  getAssignment(meshId: string): ObjectMaterialAssignment | undefined {
    return this.assignments.get(meshId);
  }

  /**
   * Get all assignments
   */
  getAllAssignments(): ObjectMaterialAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Clear all assignments
   */
  clearAllAssignments(): void {
    this.assignments.clear();
  }

  // ═════════════════════════════════════════════════════════════
  // CUSTOM MATERIALS
  // ═════════════════════════════════════════════════════════════

  /**
   * Add a custom material
   */
  addCustomMaterial(name: string, properties: Partial<MaterialProperties>): MaterialPreset {
    const preset = createCustomMaterial(name, properties);
    this.customMaterials.set(preset.id, preset);
    return preset;
  }

  /**
   * Update a custom material
   */
  updateCustomMaterial(id: string, properties: Partial<MaterialProperties>): boolean {
    const existing = this.customMaterials.get(id);
    if (!existing) return false;

    const updated: MaterialPreset = {
      ...existing,
      properties: {
        ...existing.properties,
        ...properties,
        transparent: properties.transparent ?? (properties.opacity !== undefined ? properties.opacity < 1 : existing.properties.transparent),
      },
    };

    this.customMaterials.set(id, updated);
    
    // Invalidate cached Three.js material
    this.threeMaterials.delete(id);
    
    return true;
  }

  /**
   * Remove a custom material
   */
  removeCustomMaterial(id: string): boolean {
    this.threeMaterials.delete(id);
    return this.customMaterials.delete(id);
  }

  /**
   * Get all custom materials
   */
  getCustomMaterials(): MaterialPreset[] {
    return Array.from(this.customMaterials.values());
  }

  /**
   * Get all available materials (presets + custom)
   */
  getAllMaterials(): MaterialPreset[] {
    return [...ALL_PRESETS, ...this.getCustomMaterials()];
  }

  // ═════════════════════════════════════════════════════════════
  // THREE.JS INTEGRATION
  // ═════════════════════════════════════════════════════════════

  /**
   * Apply materials to a Three.js scene
   */
  applyToScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const meshId = object.userData.meshId;
        if (meshId) {
          const newMaterial = this.getMaterialForMesh(meshId);
          
          // Dispose old material if different
          if (object.material !== newMaterial) {
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            }
            object.material = newMaterial;
          }
        }
      }
    });
  }

  /**
   * Apply material to a specific mesh
   */
  applyToMesh(mesh: THREE.Mesh): void {
    const meshId = mesh.userData.meshId;
    if (!meshId) return;

    const newMaterial = this.getMaterialForMesh(meshId);
    
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
    mesh.material = newMaterial;
  }

  /**
   * Update material on a mesh in real-time (for live preview)
   */
  updateMeshMaterialLive(
    mesh: THREE.Mesh,
    properties: Partial<MaterialProperties>
  ): void {
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) {
      return;
    }
    this.applyCustomProperties(mesh.material, properties);
  }

  // ═════════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═════════════════════════════════════════════════════════════

  /**
   * Export state for saving
   */
  exportState(): MaterialEngineState {
    return {
      assignments: new Map(this.assignments),
      customMaterials: new Map(this.customMaterials),
    };
  }

  /**
   * Import state from saved data
   */
  importState(state: MaterialEngineState): void {
    this.assignments = new Map(state.assignments);
    this.customMaterials = new Map(state.customMaterials);
    
    // Clear cached materials since custom materials may have changed
    this.threeMaterials.clear();
  }

  /**
   * Export to JSON-serializable format
   */
  toJSON(): {
    assignments: ObjectMaterialAssignment[];
    customMaterials: MaterialPreset[];
  } {
    return {
      assignments: Array.from(this.assignments.values()),
      customMaterials: Array.from(this.customMaterials.values()),
    };
  }

  /**
   * Import from JSON format
   */
  fromJSON(data: {
    assignments?: ObjectMaterialAssignment[];
    customMaterials?: MaterialPreset[];
  }): void {
    this.assignments.clear();
    this.customMaterials.clear();
    this.threeMaterials.clear();

    if (data.assignments) {
      for (const assignment of data.assignments) {
        this.assignments.set(assignment.meshId, assignment);
      }
    }

    if (data.customMaterials) {
      for (const preset of data.customMaterials) {
        this.customMaterials.set(preset.id, preset);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════

  /**
   * Dispose all cached materials
   */
  dispose(): void {
    for (const material of this.threeMaterials.values()) {
      material.dispose();
    }
    this.threeMaterials.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let materialEngineInstance: MaterialEngine | null = null;

/**
 * Get the global material engine instance
 */
export function getMaterialEngine(): MaterialEngine {
  if (!materialEngineInstance) {
    materialEngineInstance = new MaterialEngine();
  }
  return materialEngineInstance;
}

/**
 * Reset the global material engine (useful for testing)
 */
export function resetMaterialEngine(): void {
  if (materialEngineInstance) {
    materialEngineInstance.dispose();
    materialEngineInstance = null;
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Interpolate between two colors
 */
export function lerpColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
  
  return rgbToHex(r, g, b);
}
