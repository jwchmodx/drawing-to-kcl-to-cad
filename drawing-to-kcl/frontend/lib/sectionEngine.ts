/**
 * sectionEngine.ts - Cross-section (Clipping Planes) Engine for Three.js
 * Supports XY, XZ, YZ planes with adjustable positions
 */

import * as THREE from 'three';

export type PlaneType = 'XY' | 'XZ' | 'YZ';

export interface SectionPlaneState {
  type: PlaneType;
  enabled: boolean;
  position: number; // Position along the normal axis
  flip: boolean; // Flip the clipping direction
}

export interface SectionEngineState {
  enabled: boolean;
  planes: {
    XY: SectionPlaneState;
    XZ: SectionPlaneState;
    YZ: SectionPlaneState;
  };
}

export interface SectionPlaneConfig {
  plane: THREE.Plane;
  helper: THREE.PlaneHelper;
  stencilGroup: THREE.Group;
}

/**
 * Get the normal vector for a plane type
 */
function getPlaneNormal(type: PlaneType, flip: boolean): THREE.Vector3 {
  const normals: Record<PlaneType, THREE.Vector3> = {
    XY: new THREE.Vector3(0, 0, 1),  // Normal along Z
    XZ: new THREE.Vector3(0, 1, 0),  // Normal along Y
    YZ: new THREE.Vector3(1, 0, 0),  // Normal along X
  };
  const normal = normals[type].clone();
  return flip ? normal.negate() : normal;
}

/**
 * Get the color for a plane type
 */
function getPlaneColor(type: PlaneType): number {
  const colors: Record<PlaneType, number> = {
    XY: 0x00aaff, // Blue for XY (Z normal)
    XZ: 0x00ff00, // Green for XZ (Y normal)
    YZ: 0xff0000, // Red for YZ (X normal)
  };
  return colors[type];
}

/**
 * Create default section engine state
 */
export function createDefaultSectionState(): SectionEngineState {
  return {
    enabled: false,
    planes: {
      XY: { type: 'XY', enabled: false, position: 0, flip: false },
      XZ: { type: 'XZ', enabled: false, position: 0, flip: false },
      YZ: { type: 'YZ', enabled: false, position: 0, flip: false },
    },
  };
}

/**
 * Section Engine class - manages clipping planes and visualization
 */
export class SectionEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clippingPlanes: Map<PlaneType, THREE.Plane> = new Map();
  private planeHelpers: Map<PlaneType, THREE.PlaneHelper> = new Map();
  private sectionMeshes: Map<PlaneType, THREE.Mesh> = new Map();
  private state: SectionEngineState;
  private bounds: THREE.Box3 | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.state = createDefaultSectionState();
    
    // Enable local clipping
    this.renderer.localClippingEnabled = true;
    
    // Initialize planes
    this.initializePlanes();
  }

  /**
   * Initialize clipping planes for all types
   */
  private initializePlanes(): void {
    const planeTypes: PlaneType[] = ['XY', 'XZ', 'YZ'];
    
    planeTypes.forEach(type => {
      const normal = getPlaneNormal(type, false);
      const plane = new THREE.Plane(normal, 0);
      this.clippingPlanes.set(type, plane);
      
      // Create plane helper (visual representation)
      const helper = new THREE.PlaneHelper(plane, 5, getPlaneColor(type));
      helper.visible = false;
      helper.name = `sectionHelper_${type}`;
      this.scene.add(helper);
      this.planeHelpers.set(type, helper);
    });
  }

  /**
   * Set the bounding box for the model (used to calculate plane ranges)
   */
  setBounds(bounds: THREE.Box3): void {
    this.bounds = bounds;
    
    // Update helper sizes based on bounds
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z) * 1.5;
    
    this.planeHelpers.forEach((helper, type) => {
      // Remove old helper and create new one with correct size
      this.scene.remove(helper);
      const plane = this.clippingPlanes.get(type)!;
      const newHelper = new THREE.PlaneHelper(plane, maxSize, getPlaneColor(type));
      newHelper.visible = helper.visible;
      newHelper.name = `sectionHelper_${type}`;
      this.scene.add(newHelper);
      this.planeHelpers.set(type, newHelper);
    });
  }

  /**
   * Get the min/max range for a plane position
   */
  getPlaneRange(type: PlaneType): { min: number; max: number } {
    if (!this.bounds) {
      return { min: -10, max: 10 };
    }
    
    const ranges: Record<PlaneType, { min: number; max: number }> = {
      XY: { min: this.bounds.min.z, max: this.bounds.max.z }, // Z axis
      XZ: { min: this.bounds.min.y, max: this.bounds.max.y }, // Y axis
      YZ: { min: this.bounds.min.x, max: this.bounds.max.x }, // X axis
    };
    
    const range = ranges[type];
    // Add some margin
    const margin = (range.max - range.min) * 0.1;
    return {
      min: range.min - margin,
      max: range.max + margin,
    };
  }

  /**
   * Update a specific plane's state
   */
  updatePlane(type: PlaneType, updates: Partial<SectionPlaneState>): void {
    const planeState = this.state.planes[type];
    Object.assign(planeState, updates);
    
    const plane = this.clippingPlanes.get(type)!;
    const helper = this.planeHelpers.get(type)!;
    
    // Update normal based on flip
    const normal = getPlaneNormal(type, planeState.flip);
    plane.normal.copy(normal);
    
    // Update position (constant is negative of position along normal)
    plane.constant = planeState.flip ? planeState.position : -planeState.position;
    
    // Update helper visibility
    helper.visible = this.state.enabled && planeState.enabled;
    
    // Update section surface
    this.updateSectionSurface(type);
    
    // Apply clipping planes to meshes
    this.applyClippingPlanes();
  }

  /**
   * Create/update the colored section surface
   */
  private updateSectionSurface(type: PlaneType): void {
    // Remove existing section mesh
    const existing = this.sectionMeshes.get(type);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.Material).dispose();
      this.sectionMeshes.delete(type);
    }
    
    if (!this.state.enabled || !this.state.planes[type].enabled || !this.bounds) {
      return;
    }
    
    // Create a plane geometry at the section position
    const planeState = this.state.planes[type];
    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z) * 1.2;
    
    const geometry = new THREE.PlaneGeometry(maxSize, maxSize);
    const material = new THREE.MeshBasicMaterial({
      color: getPlaneColor(type),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `sectionSurface_${type}`;
    mesh.renderOrder = 1;
    
    // Position and rotate based on plane type
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    
    switch (type) {
      case 'XY':
        mesh.position.set(center.x, center.y, planeState.position);
        // No rotation needed, already facing Z
        break;
      case 'XZ':
        mesh.position.set(center.x, planeState.position, center.z);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'YZ':
        mesh.position.set(planeState.position, center.y, center.z);
        mesh.rotation.y = Math.PI / 2;
        break;
    }
    
    this.scene.add(mesh);
    this.sectionMeshes.set(type, mesh);
  }

  /**
   * Apply clipping planes to all meshes in the scene
   */
  private applyClippingPlanes(): void {
    const activePlanes: THREE.Plane[] = [];
    
    if (this.state.enabled) {
      (['XY', 'XZ', 'YZ'] as PlaneType[]).forEach(type => {
        if (this.state.planes[type].enabled) {
          activePlanes.push(this.clippingPlanes.get(type)!);
        }
      });
    }
    
    // Apply to all meshes in the scene
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && !obj.name.startsWith('section')) {
        const material = obj.material as THREE.Material;
        if (material) {
          material.clippingPlanes = activePlanes.length > 0 ? activePlanes : null;
          material.clipShadows = true;
          material.needsUpdate = true;
        }
      }
    });
  }

  /**
   * Enable/disable section mode globally
   */
  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    
    // Update all helpers and surfaces
    (['XY', 'XZ', 'YZ'] as PlaneType[]).forEach(type => {
      const helper = this.planeHelpers.get(type)!;
      helper.visible = enabled && this.state.planes[type].enabled;
      this.updateSectionSurface(type);
    });
    
    this.applyClippingPlanes();
  }

  /**
   * Get current state
   */
  getState(): SectionEngineState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get all active clipping planes
   */
  getActiveClippingPlanes(): THREE.Plane[] {
    const planes: THREE.Plane[] = [];
    if (this.state.enabled) {
      (['XY', 'XZ', 'YZ'] as PlaneType[]).forEach(type => {
        if (this.state.planes[type].enabled) {
          planes.push(this.clippingPlanes.get(type)!);
        }
      });
    }
    return planes;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.planeHelpers.forEach(helper => {
      this.scene.remove(helper);
    });
    
    this.sectionMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    
    this.clippingPlanes.clear();
    this.planeHelpers.clear();
    this.sectionMeshes.clear();
  }
}

export default SectionEngine;
