/**
 * Geometry spec types used by geometryRuntime and artifactGraph.
 */

export interface BoxSpec {
  id: string;
  size: [number, number, number];
  center: [number, number, number];
}

export interface CylinderSpec {
  id: string;
  radius: number;
  height: number;
  center: [number, number, number];
  segments?: number;
}

export interface SphereSpec {
  id: string;
  radius: number;
  center: [number, number, number];
  widthSegments?: number;
  heightSegments?: number;
}

export interface ConeSpec {
  id: string;
  radius: number;
  height: number;
  center: [number, number, number];
  segments?: number;
}

export interface ExtrudeSpec {
  id: string;
  sourceId: string;
  face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
  distance: number;
}

export interface FilletSpec {
  id: string;
  sourceId: string;
  edgeIndex: number;
  radius: number;
  segments?: number;
}

export interface GeometrySpec {
  artifacts: string[];
  boxes: BoxSpec[];
  cylinders: CylinderSpec[];
  spheres: SphereSpec[];
  cones: ConeSpec[];
  extrudes: ExtrudeSpec[];
  fillets: FilletSpec[];
}

// Face reference for extrude operations
export interface FaceRef {
  solidId: string;
  face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
}

// Edge reference for fillet operations  
export interface EdgeRef {
  solidId: string;
  edgeIndex: number;
}
