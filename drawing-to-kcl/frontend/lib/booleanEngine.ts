/**
 * Boolean Engine - CSG Operations for 3D geometry
 * 
 * Supports:
 * - union(a, b): Combine two solids
 * - subtract(a, b): Remove b from a
 * - intersect(a, b): Keep only overlapping volume
 * 
 * Uses three-bvh-csg for efficient boolean operations
 */

import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

export interface BooleanResult {
  vertices: number[][];
  indices: number[];
  normals: number[][];
}

// ═══════════════════════════════════════════════════════════════
// CSG EVALUATOR (singleton for performance)
// ═══════════════════════════════════════════════════════════════

let evaluator: Evaluator | null = null;

function getEvaluator(): Evaluator {
  if (!evaluator) {
    evaluator = new Evaluator();
  }
  return evaluator;
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY CONVERSION
// ═══════════════════════════════════════════════════════════════

/**
 * Convert our vertex/index format to Three.js BufferGeometry
 */
export function toBufferGeometry(
  vertices: number[][],
  indices: number[],
  normals?: number[][]
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  // Flatten vertices
  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i][0];
    positions[i * 3 + 1] = vertices[i][1];
    positions[i * 3 + 2] = vertices[i][2];
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Set indices
  geometry.setIndex(indices);
  
  // Set or compute normals
  if (normals && normals.length === vertices.length) {
    const normalArray = new Float32Array(normals.length * 3);
    for (let i = 0; i < normals.length; i++) {
      normalArray[i * 3] = normals[i][0];
      normalArray[i * 3 + 1] = normals[i][1];
      normalArray[i * 3 + 2] = normals[i][2];
    }
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
  } else {
    geometry.computeVertexNormals();
  }
  
  return geometry;
}

/**
 * Convert Three.js BufferGeometry back to our format
 */
export function fromBufferGeometry(geometry: THREE.BufferGeometry): BooleanResult {
  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');
  const indexAttr = geometry.getIndex();
  
  const vertices: number[][] = [];
  const normals: number[][] = [];
  const indices: number[] = [];
  
  // Extract vertices
  for (let i = 0; i < positionAttr.count; i++) {
    vertices.push([
      positionAttr.getX(i),
      positionAttr.getY(i),
      positionAttr.getZ(i)
    ]);
  }
  
  // Extract normals
  if (normalAttr) {
    for (let i = 0; i < normalAttr.count; i++) {
      normals.push([
        normalAttr.getX(i),
        normalAttr.getY(i),
        normalAttr.getZ(i)
      ]);
    }
  }
  
  // Extract indices
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(indexAttr.getX(i));
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positionAttr.count; i++) {
      indices.push(i);
    }
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// PRIMITIVE GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a box geometry
 */
export function createBoxGeometry(
  size: [number, number, number],
  center: [number, number, number]
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geometry.translate(center[0], center[1], center[2]);
  return geometry;
}

/**
 * Create a cylinder geometry
 */
export function createCylinderGeometry(
  radius: number,
  height: number,
  center: [number, number, number],
  segments: number = 32
): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
  geometry.translate(center[0], center[1], center[2]);
  return geometry;
}

/**
 * Create a sphere geometry
 */
export function createSphereGeometry(
  radius: number,
  center: [number, number, number],
  widthSegments: number = 32,
  heightSegments: number = 16
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  geometry.translate(center[0], center[1], center[2]);
  return geometry;
}

/**
 * Create a cone geometry
 */
export function createConeGeometry(
  radius: number,
  height: number,
  center: [number, number, number],
  segments: number = 32
): THREE.BufferGeometry {
  const geometry = new THREE.ConeGeometry(radius, height, segments);
  geometry.translate(center[0], center[1], center[2]);
  return geometry;
}

// ═══════════════════════════════════════════════════════════════
// BOOLEAN OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Perform a boolean operation on two geometries
 */
export function performBoolean(
  geometryA: THREE.BufferGeometry,
  geometryB: THREE.BufferGeometry,
  operation: BooleanOperation
): BooleanResult {
  const csgEvaluator = getEvaluator();
  
  // Create brushes from geometries
  const brushA = new Brush(geometryA);
  const brushB = new Brush(geometryB);
  
  // Update matrix world for proper transformation
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  
  // Select operation type
  let opType: number;
  switch (operation) {
    case 'union':
      opType = ADDITION;
      break;
    case 'subtract':
      opType = SUBTRACTION;
      break;
    case 'intersect':
      opType = INTERSECTION;
      break;
    default:
      opType = ADDITION;
  }
  
  // Perform the boolean operation
  const result = csgEvaluator.evaluate(brushA, brushB, opType);
  
  // Convert result back to our format
  return fromBufferGeometry(result.geometry);
}

/**
 * Union: Combine two solids into one
 */
export function union(
  verticesA: number[][],
  indicesA: number[],
  normalsA: number[][],
  verticesB: number[][],
  indicesB: number[],
  normalsB: number[][]
): BooleanResult {
  const geomA = toBufferGeometry(verticesA, indicesA, normalsA);
  const geomB = toBufferGeometry(verticesB, indicesB, normalsB);
  return performBoolean(geomA, geomB, 'union');
}

/**
 * Subtract: Remove solid B from solid A
 */
export function subtract(
  verticesA: number[][],
  indicesA: number[],
  normalsA: number[][],
  verticesB: number[][],
  indicesB: number[],
  normalsB: number[][]
): BooleanResult {
  const geomA = toBufferGeometry(verticesA, indicesA, normalsA);
  const geomB = toBufferGeometry(verticesB, indicesB, normalsB);
  return performBoolean(geomA, geomB, 'subtract');
}

/**
 * Intersect: Keep only the overlapping volume
 */
export function intersect(
  verticesA: number[][],
  indicesA: number[],
  normalsA: number[][],
  verticesB: number[][],
  indicesB: number[],
  normalsB: number[][]
): BooleanResult {
  const geomA = toBufferGeometry(verticesA, indicesA, normalsA);
  const geomB = toBufferGeometry(verticesB, indicesB, normalsB);
  return performBoolean(geomA, geomB, 'intersect');
}

// ═══════════════════════════════════════════════════════════════
// HIGH-LEVEL HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Union two primitive shapes directly
 */
export function unionPrimitives(
  geomA: THREE.BufferGeometry,
  geomB: THREE.BufferGeometry
): BooleanResult {
  return performBoolean(geomA, geomB, 'union');
}

/**
 * Subtract primitive B from primitive A
 */
export function subtractPrimitives(
  geomA: THREE.BufferGeometry,
  geomB: THREE.BufferGeometry
): BooleanResult {
  return performBoolean(geomA, geomB, 'subtract');
}

/**
 * Intersect two primitives
 */
export function intersectPrimitives(
  geomA: THREE.BufferGeometry,
  geomB: THREE.BufferGeometry
): BooleanResult {
  return performBoolean(geomA, geomB, 'intersect');
}

/**
 * Chain multiple union operations
 */
export function unionMultiple(geometries: THREE.BufferGeometry[]): BooleanResult | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return fromBufferGeometry(geometries[0]);
  
  let result = geometries[0];
  for (let i = 1; i < geometries.length; i++) {
    const boolResult = performBoolean(result, geometries[i], 'union');
    result = toBufferGeometry(boolResult.vertices, boolResult.indices, boolResult.normals);
  }
  
  return fromBufferGeometry(result);
}

/**
 * Subtract multiple geometries from a base
 */
export function subtractMultiple(
  base: THREE.BufferGeometry,
  toSubtract: THREE.BufferGeometry[]
): BooleanResult {
  let result = base;
  
  for (const geom of toSubtract) {
    const boolResult = performBoolean(result, geom, 'subtract');
    result = toBufferGeometry(boolResult.vertices, boolResult.indices, boolResult.normals);
  }
  
  return fromBufferGeometry(result);
}
