/**
 * Measurement Engine for 3D CAD
 * Provides distance, angle, area, and volume measurements
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type MeasureUnit = 'mm' | 'cm' | 'm' | 'inch';

export interface MeasurePoint {
  x: number;
  y: number;
  z: number;
}

export interface DistanceMeasurement {
  type: 'distance';
  id: string;
  point1: MeasurePoint;
  point2: MeasurePoint;
  distance: number;
  unit: MeasureUnit;
}

export interface AngleMeasurement {
  type: 'angle';
  id: string;
  vertex: MeasurePoint;
  point1: MeasurePoint;
  point2: MeasurePoint;
  angle: number; // in degrees
}

export interface AreaMeasurement {
  type: 'area';
  id: string;
  meshId: string;
  faceIndex: number;
  area: number;
  unit: MeasureUnit;
  center: MeasurePoint;
  normal: MeasurePoint;
}

export interface VolumeMeasurement {
  type: 'volume';
  id: string;
  meshId: string;
  volume: number;
  unit: MeasureUnit;
  center: MeasurePoint;
}

export type Measurement = DistanceMeasurement | AngleMeasurement | AreaMeasurement | VolumeMeasurement;

export type MeasureMode = 'none' | 'distance' | 'angle' | 'area' | 'volume';

// ═══════════════════════════════════════════════════════════════
// UNIT CONVERSION
// ═══════════════════════════════════════════════════════════════

const UNIT_FACTORS: Record<MeasureUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
};

export function convertUnit(value: number, from: MeasureUnit, to: MeasureUnit): number {
  const inMm = value * UNIT_FACTORS[from];
  return inMm / UNIT_FACTORS[to];
}

export function formatDistance(value: number, unit: MeasureUnit): string {
  const decimals = unit === 'm' ? 4 : unit === 'cm' ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatArea(value: number, unit: MeasureUnit): string {
  const decimals = unit === 'm' ? 6 : unit === 'cm' ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}²`;
}

export function formatVolume(value: number, unit: MeasureUnit): string {
  const decimals = unit === 'm' ? 9 : unit === 'cm' ? 3 : 1;
  return `${value.toFixed(decimals)} ${unit}³`;
}

export function formatAngle(degrees: number): string {
  return `${degrees.toFixed(1)}°`;
}

// ═══════════════════════════════════════════════════════════════
// MEASUREMENT CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate distance between two 3D points
 */
export function calculateDistance(p1: MeasurePoint, p2: MeasurePoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle between three points (vertex at middle point)
 * Returns angle in degrees
 */
export function calculateAngle(p1: MeasurePoint, vertex: MeasurePoint, p2: MeasurePoint): number {
  const v1 = new THREE.Vector3(p1.x - vertex.x, p1.y - vertex.y, p1.z - vertex.z);
  const v2 = new THREE.Vector3(p2.x - vertex.x, p2.y - vertex.y, p2.z - vertex.z);
  
  v1.normalize();
  v2.normalize();
  
  const dot = v1.dot(v2);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angleRad = Math.acos(clampedDot);
  
  return THREE.MathUtils.radToDeg(angleRad);
}

/**
 * Calculate area of a triangle face
 */
export function calculateTriangleArea(v0: MeasurePoint, v1: MeasurePoint, v2: MeasurePoint): number {
  const a = new THREE.Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
  const b = new THREE.Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
  const cross = new THREE.Vector3().crossVectors(a, b);
  return cross.length() / 2;
}

/**
 * Calculate face area from mesh geometry
 */
export function calculateFaceArea(
  geometry: THREE.BufferGeometry,
  faceIndex: number
): { area: number; center: MeasurePoint; normal: MeasurePoint } {
  const position = geometry.getAttribute('position');
  const indices = geometry.index;
  
  let v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3;
  
  if (indices) {
    const i = faceIndex * 3;
    v0 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i));
    v1 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 1));
    v2 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 2));
  } else {
    const i = faceIndex * 3;
    v0 = new THREE.Vector3().fromBufferAttribute(position, i);
    v1 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    v2 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
  }
  
  // Calculate area using cross product
  const a = new THREE.Vector3().subVectors(v1, v0);
  const b = new THREE.Vector3().subVectors(v2, v0);
  const cross = new THREE.Vector3().crossVectors(a, b);
  const area = cross.length() / 2;
  
  // Calculate center
  const center = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3);
  
  // Calculate normal
  const normal = cross.normalize();
  
  return {
    area,
    center: { x: center.x, y: center.y, z: center.z },
    normal: { x: normal.x, y: normal.y, z: normal.z },
  };
}

/**
 * Calculate coplanar face area (group adjacent faces with same normal)
 */
export function calculateCoplanarFaceArea(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  tolerance: number = 0.01
): { area: number; center: MeasurePoint; normal: MeasurePoint; faceIndices: number[] } {
  const position = geometry.getAttribute('position');
  const indices = geometry.index;
  const faceCount = indices ? indices.count / 3 : position.count / 3;
  
  // Get the reference face normal
  const refFace = calculateFaceArea(geometry, faceIndex);
  const refNormal = new THREE.Vector3(refFace.normal.x, refFace.normal.y, refFace.normal.z);
  
  // Find all coplanar faces
  const coplanarFaces: number[] = [];
  let totalArea = 0;
  const centerSum = new THREE.Vector3();
  
  for (let i = 0; i < faceCount; i++) {
    const face = calculateFaceArea(geometry, i);
    const faceNormal = new THREE.Vector3(face.normal.x, face.normal.y, face.normal.z);
    
    // Check if normals are parallel (same direction or opposite)
    const dot = Math.abs(refNormal.dot(faceNormal));
    if (dot > 1 - tolerance) {
      // Check if on same plane
      let v0: THREE.Vector3;
      if (indices) {
        const idx = i * 3;
        v0 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(idx));
      } else {
        v0 = new THREE.Vector3().fromBufferAttribute(position, i * 3);
      }
      
      // Reference point from original face
      let refV0: THREE.Vector3;
      if (indices) {
        const idx = faceIndex * 3;
        refV0 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(idx));
      } else {
        refV0 = new THREE.Vector3().fromBufferAttribute(position, faceIndex * 3);
      }
      
      // Check distance to plane
      const toPoint = new THREE.Vector3().subVectors(v0, refV0);
      const distToPlane = Math.abs(toPoint.dot(refNormal));
      
      if (distToPlane < tolerance) {
        coplanarFaces.push(i);
        totalArea += face.area;
        centerSum.add(new THREE.Vector3(face.center.x, face.center.y, face.center.z).multiplyScalar(face.area));
      }
    }
  }
  
  // Calculate weighted center
  const weightedCenter = centerSum.divideScalar(totalArea);
  
  return {
    area: totalArea,
    center: { x: weightedCenter.x, y: weightedCenter.y, z: weightedCenter.z },
    normal: refFace.normal,
    faceIndices: coplanarFaces,
  };
}

/**
 * Calculate volume of a mesh using signed tetrahedron method
 */
export function calculateMeshVolume(geometry: THREE.BufferGeometry): { volume: number; center: MeasurePoint } {
  const position = geometry.getAttribute('position');
  const indices = geometry.index;
  const faceCount = indices ? indices.count / 3 : position.count / 3;
  
  let totalVolume = 0;
  const centerSum = new THREE.Vector3();
  let totalArea = 0;
  
  for (let i = 0; i < faceCount; i++) {
    let v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3;
    
    if (indices) {
      const idx = i * 3;
      v0 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(idx));
      v1 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(idx + 1));
      v2 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(idx + 2));
    } else {
      const idx = i * 3;
      v0 = new THREE.Vector3().fromBufferAttribute(position, idx);
      v1 = new THREE.Vector3().fromBufferAttribute(position, idx + 1);
      v2 = new THREE.Vector3().fromBufferAttribute(position, idx + 2);
    }
    
    // Signed volume of tetrahedron with origin
    const signedVolume = v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
    totalVolume += signedVolume;
    
    // Calculate face area for weighted center
    const a = new THREE.Vector3().subVectors(v1, v0);
    const b = new THREE.Vector3().subVectors(v2, v0);
    const cross = new THREE.Vector3().crossVectors(a, b);
    const area = cross.length() / 2;
    
    const faceCenter = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3);
    centerSum.add(faceCenter.multiplyScalar(area));
    totalArea += area;
  }
  
  const center = centerSum.divideScalar(totalArea);
  
  return {
    volume: Math.abs(totalVolume),
    center: { x: center.x, y: center.y, z: center.z },
  };
}

// ═══════════════════════════════════════════════════════════════
// MEASUREMENT MANAGER
// ═══════════════════════════════════════════════════════════════

let measurementIdCounter = 0;

export function generateMeasurementId(): string {
  return `measure_${++measurementIdCounter}`;
}

export function createDistanceMeasurement(
  p1: MeasurePoint,
  p2: MeasurePoint,
  unit: MeasureUnit = 'mm'
): DistanceMeasurement {
  const distance = calculateDistance(p1, p2);
  return {
    type: 'distance',
    id: generateMeasurementId(),
    point1: p1,
    point2: p2,
    distance: convertUnit(distance, 'mm', unit),
    unit,
  };
}

export function createAngleMeasurement(
  p1: MeasurePoint,
  vertex: MeasurePoint,
  p2: MeasurePoint
): AngleMeasurement {
  const angle = calculateAngle(p1, vertex, p2);
  return {
    type: 'angle',
    id: generateMeasurementId(),
    point1: p1,
    vertex,
    point2: p2,
    angle,
  };
}

export function createAreaMeasurement(
  geometry: THREE.BufferGeometry,
  faceIndex: number,
  meshId: string,
  unit: MeasureUnit = 'mm'
): AreaMeasurement {
  const { area, center, normal } = calculateCoplanarFaceArea(geometry, faceIndex);
  const convertedArea = convertUnit(convertUnit(area, 'mm', unit), 'mm', unit); // area is in mm²
  
  return {
    type: 'area',
    id: generateMeasurementId(),
    meshId,
    faceIndex,
    area: convertedArea,
    unit,
    center,
    normal,
  };
}

export function createVolumeMeasurement(
  geometry: THREE.BufferGeometry,
  meshId: string,
  unit: MeasureUnit = 'mm'
): VolumeMeasurement {
  const { volume, center } = calculateMeshVolume(geometry);
  // Convert volume (mm³ to target unit³)
  const factor = UNIT_FACTORS[unit];
  const convertedVolume = volume / (factor * factor * factor);
  
  return {
    type: 'volume',
    id: generateMeasurementId(),
    meshId,
    volume: convertedVolume,
    unit,
    center,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3D VISUALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a line geometry between two points
 */
export function createMeasureLine(p1: MeasurePoint, p2: MeasurePoint): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return geometry;
}

/**
 * Create an arc geometry for angle visualization
 */
export function createAngleArc(
  vertex: MeasurePoint,
  p1: MeasurePoint,
  p2: MeasurePoint,
  radius: number = 0.3,
  segments: number = 32
): THREE.BufferGeometry {
  const v = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
  const dir1 = new THREE.Vector3(p1.x - vertex.x, p1.y - vertex.y, p1.z - vertex.z).normalize();
  const dir2 = new THREE.Vector3(p2.x - vertex.x, p2.y - vertex.y, p2.z - vertex.z).normalize();
  
  // Calculate angle
  const angle = Math.acos(Math.max(-1, Math.min(1, dir1.dot(dir2))));
  
  // Create rotation axis
  const axis = new THREE.Vector3().crossVectors(dir1, dir2).normalize();
  if (axis.length() < 0.001) {
    // Parallel vectors, use any perpendicular axis
    axis.set(0, 1, 0);
    if (Math.abs(dir1.dot(axis)) > 0.99) {
      axis.set(1, 0, 0);
    }
  }
  
  const vertices: number[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = t * angle;
    
    // Rotate dir1 around axis by currentAngle
    const rotated = dir1.clone().applyAxisAngle(axis, currentAngle).multiplyScalar(radius);
    const point = v.clone().add(rotated);
    
    vertices.push(point.x, point.y, point.z);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

/**
 * Calculate midpoint between two points
 */
export function getMidpoint(p1: MeasurePoint, p2: MeasurePoint): MeasurePoint {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: (p1.z + p2.z) / 2,
  };
}

/**
 * Get point for label placement (offset from measurement)
 */
export function getLabelPosition(measurement: Measurement): MeasurePoint {
  switch (measurement.type) {
    case 'distance':
      return getMidpoint(measurement.point1, measurement.point2);
    case 'angle':
      return measurement.vertex;
    case 'area':
    case 'volume':
      return measurement.center;
  }
}
