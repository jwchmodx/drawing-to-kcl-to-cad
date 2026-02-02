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

// Boolean operations
export type BooleanOperation = 'union' | 'subtract' | 'intersect';

export interface BooleanSpec {
  id: string;
  operation: BooleanOperation;
  sourceAId: string;
  sourceBId: string;
}

// Chamfer (angled edge cut)
export interface ChamferSpec {
  id: string;
  sourceId: string;
  edgeIndex: number;
  distance: number;
}

// Revolve (rotational extrusion)
export interface RevolveSpec {
  id: string;
  profile: [number, number][];  // 2D points [x (radius), y (height)]
  axis: [number, number, number];
  center: [number, number, number];
  angle: number;  // degrees
  segments?: number;
}

// Linear pattern
export interface LinearPatternSpec {
  id: string;
  sourceId: string;
  direction: [number, number, number];
  count: number;
  spacing: number;
}

// Circular pattern
export interface CircularPatternSpec {
  id: string;
  sourceId: string;
  axis: [number, number, number];
  center: [number, number, number];
  count: number;
  angle?: number;  // degrees, default 360
}

// Shell (hollow out)
export interface ShellSpec {
  id: string;
  sourceId: string;
  thickness: number;
  openFaces?: number[];  // face indices to leave open
}

// Torus (donut)
export interface TorusSpec {
  id: string;
  majorRadius: number;
  minorRadius: number;
  center: [number, number, number];
  majorSegments?: number;
  minorSegments?: number;
}

// Helix (spiral)
export interface HelixSpec {
  id: string;
  radius: number;
  pitch: number;
  turns: number;
  tubeRadius: number;
  center: [number, number, number];
  segments?: number;
  tubeSegments?: number;
}

// Transform operations
export interface MirrorSpec {
  id: string;
  sourceId: string;
  plane: 'xy' | 'xz' | 'yz' | [number, number, number];
  keepOriginal?: boolean;
}

export interface ScaleSpec {
  id: string;
  sourceId: string;
  scale: number | [number, number, number];
  center?: [number, number, number];
}

export interface RotateSpec {
  id: string;
  sourceId: string;
  axis: [number, number, number];
  angle: number;
  center?: [number, number, number];
}

export interface TranslateSpec {
  id: string;
  sourceId: string;
  offset: [number, number, number];
}

export interface GeometrySpec {
  artifacts: string[];
  boxes: BoxSpec[];
  cylinders: CylinderSpec[];
  spheres: SphereSpec[];
  cones: ConeSpec[];
  extrudes: ExtrudeSpec[];
  fillets: FilletSpec[];
  booleans: BooleanSpec[];
  chamfers: ChamferSpec[];
  revolves: RevolveSpec[];
  linearPatterns: LinearPatternSpec[];
  circularPatterns: CircularPatternSpec[];
  shells: ShellSpec[];
  toruses: TorusSpec[];
  helixes: HelixSpec[];
  mirrors: MirrorSpec[];
  scales: ScaleSpec[];
  rotates: RotateSpec[];
  translates: TranslateSpec[];
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
