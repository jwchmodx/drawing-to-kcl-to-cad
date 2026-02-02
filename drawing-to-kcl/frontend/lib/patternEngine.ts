/**
 * Pattern Engine - Create arrays of geometry
 * 
 * Supports:
 * - Linear Pattern: Copy geometry along a direction
 * - Circular Pattern: Copy geometry around an axis
 * - Grid Pattern: 2D array in two directions
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PatternGeometry {
  vertices: number[][];
  indices: number[];
  normals: number[][];
}

export interface PatternInstance {
  translation: Vec3;
  rotation?: { axis: Vec3; angle: number };
  scale?: Vec3;
}

// ═══════════════════════════════════════════════════════════════
// VECTOR UTILITIES
// ═══════════════════════════════════════════════════════════════

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Rotate a point around an axis using Rodrigues' rotation formula
 */
function rotateAroundAxis(point: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalize(axis);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  
  const kCrossV = cross(k, point);
  const kDotV = k.x * point.x + k.y * point.y + k.z * point.z;
  
  return {
    x: point.x * cosA + kCrossV.x * sinA + k.x * kDotV * (1 - cosA),
    y: point.y * cosA + kCrossV.y * sinA + k.y * kDotV * (1 - cosA),
    z: point.z * cosA + kCrossV.z * sinA + k.z * kDotV * (1 - cosA),
  };
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a transformation to geometry
 */
function transformGeometry(
  vertices: number[][],
  normals: number[][],
  transform: PatternInstance
): { vertices: number[][]; normals: number[][] } {
  const newVertices: number[][] = [];
  const newNormals: number[][] = [];
  
  for (let i = 0; i < vertices.length; i++) {
    let v = vec3(vertices[i][0], vertices[i][1], vertices[i][2]);
    let n = vec3(normals[i][0], normals[i][1], normals[i][2]);
    
    // Apply scale
    if (transform.scale) {
      v = vec3(
        v.x * transform.scale.x,
        v.y * transform.scale.y,
        v.z * transform.scale.z
      );
    }
    
    // Apply rotation
    if (transform.rotation) {
      v = rotateAroundAxis(v, transform.rotation.axis, transform.rotation.angle);
      n = rotateAroundAxis(n, transform.rotation.axis, transform.rotation.angle);
    }
    
    // Apply translation
    v = add(v, transform.translation);
    
    newVertices.push([v.x, v.y, v.z]);
    newNormals.push([n.x, n.y, n.z]);
  }
  
  return { vertices: newVertices, normals: newNormals };
}

/**
 * Combine multiple geometry instances
 */
function combineGeometry(instances: PatternGeometry[]): PatternGeometry {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  let vertexOffset = 0;
  
  for (const instance of instances) {
    // Add vertices and normals
    for (let i = 0; i < instance.vertices.length; i++) {
      vertices.push(instance.vertices[i]);
      normals.push(instance.normals[i]);
    }
    
    // Add indices with offset
    for (const idx of instance.indices) {
      indices.push(idx + vertexOffset);
    }
    
    vertexOffset += instance.vertices.length;
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// LINEAR PATTERN
// ═══════════════════════════════════════════════════════════════

/**
 * Create a linear pattern of geometry
 * 
 * @param sourceVertices - Original geometry vertices
 * @param sourceIndices - Original geometry indices
 * @param sourceNormals - Original geometry normals
 * @param direction - Direction of the pattern as [x, y, z]
 * @param count - Number of copies (including original)
 * @param spacing - Distance between copies
 */
export function linearPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  direction: [number, number, number],
  count: number,
  spacing: number
): PatternGeometry {
  if (count < 1) {
    console.warn('Pattern count must be at least 1');
    return { vertices: [], indices: [], normals: [] };
  }
  
  const dir = normalize(vec3(direction[0], direction[1], direction[2]));
  const instances: PatternGeometry[] = [];
  
  for (let i = 0; i < count; i++) {
    const offset = scale(dir, i * spacing);
    
    const transform: PatternInstance = {
      translation: offset,
    };
    
    const transformed = transformGeometry(sourceVertices, sourceNormals, transform);
    
    instances.push({
      vertices: transformed.vertices,
      indices: [...sourceIndices],
      normals: transformed.normals,
    });
  }
  
  return combineGeometry(instances);
}

// ═══════════════════════════════════════════════════════════════
// CIRCULAR PATTERN
// ═══════════════════════════════════════════════════════════════

/**
 * Create a circular pattern of geometry
 * 
 * @param sourceVertices - Original geometry vertices
 * @param sourceIndices - Original geometry indices
 * @param sourceNormals - Original geometry normals
 * @param axis - Rotation axis as [x, y, z]
 * @param center - Center of rotation as [x, y, z]
 * @param count - Number of copies (including original)
 * @param angleDegrees - Total angle to span (default 360 for full circle)
 */
export function circularPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  axis: [number, number, number],
  center: [number, number, number],
  count: number,
  angleDegrees: number = 360
): PatternGeometry {
  if (count < 1) {
    console.warn('Pattern count must be at least 1');
    return { vertices: [], indices: [], normals: [] };
  }
  
  const axisVec = normalize(vec3(axis[0], axis[1], axis[2]));
  const centerVec = vec3(center[0], center[1], center[2]);
  const totalAngle = (angleDegrees * Math.PI) / 180;
  const instances: PatternGeometry[] = [];
  
  // Determine if it's a full circle or partial
  const isFull = Math.abs(angleDegrees - 360) < 0.001;
  const angleStep = isFull ? totalAngle / count : totalAngle / (count - 1 || 1);
  
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    
    // Transform vertices: translate to center, rotate, translate back
    const newVertices: number[][] = [];
    const newNormals: number[][] = [];
    
    for (let j = 0; j < sourceVertices.length; j++) {
      let v = vec3(
        sourceVertices[j][0] - centerVec.x,
        sourceVertices[j][1] - centerVec.y,
        sourceVertices[j][2] - centerVec.z
      );
      let n = vec3(sourceNormals[j][0], sourceNormals[j][1], sourceNormals[j][2]);
      
      // Rotate
      v = rotateAroundAxis(v, axisVec, angle);
      n = rotateAroundAxis(n, axisVec, angle);
      
      // Translate back
      v = add(v, centerVec);
      
      newVertices.push([v.x, v.y, v.z]);
      newNormals.push([n.x, n.y, n.z]);
    }
    
    instances.push({
      vertices: newVertices,
      indices: [...sourceIndices],
      normals: newNormals,
    });
  }
  
  return combineGeometry(instances);
}

// ═══════════════════════════════════════════════════════════════
// GRID PATTERN (2D)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a 2D grid pattern of geometry
 * 
 * @param sourceVertices - Original geometry vertices
 * @param sourceIndices - Original geometry indices
 * @param sourceNormals - Original geometry normals
 * @param direction1 - First direction as [x, y, z]
 * @param direction2 - Second direction as [x, y, z]
 * @param count1 - Number of copies in first direction
 * @param count2 - Number of copies in second direction
 * @param spacing1 - Distance between copies in first direction
 * @param spacing2 - Distance between copies in second direction
 */
export function gridPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  direction1: [number, number, number],
  direction2: [number, number, number],
  count1: number,
  count2: number,
  spacing1: number,
  spacing2: number
): PatternGeometry {
  if (count1 < 1 || count2 < 1) {
    console.warn('Pattern counts must be at least 1');
    return { vertices: [], indices: [], normals: [] };
  }
  
  const dir1 = normalize(vec3(direction1[0], direction1[1], direction1[2]));
  const dir2 = normalize(vec3(direction2[0], direction2[1], direction2[2]));
  const instances: PatternGeometry[] = [];
  
  for (let i = 0; i < count1; i++) {
    for (let j = 0; j < count2; j++) {
      const offset = add(
        scale(dir1, i * spacing1),
        scale(dir2, j * spacing2)
      );
      
      const transform: PatternInstance = {
        translation: offset,
      };
      
      const transformed = transformGeometry(sourceVertices, sourceNormals, transform);
      
      instances.push({
        vertices: transformed.vertices,
        indices: [...sourceIndices],
        normals: transformed.normals,
      });
    }
  }
  
  return combineGeometry(instances);
}

// ═══════════════════════════════════════════════════════════════
// 3D PATTERN (CUBOID ARRAY)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a 3D cuboid pattern of geometry
 */
export function cuboidPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  countX: number,
  countY: number,
  countZ: number,
  spacingX: number,
  spacingY: number,
  spacingZ: number
): PatternGeometry {
  const instances: PatternGeometry[] = [];
  
  for (let i = 0; i < countX; i++) {
    for (let j = 0; j < countY; j++) {
      for (let k = 0; k < countZ; k++) {
        const offset = vec3(
          i * spacingX,
          j * spacingY,
          k * spacingZ
        );
        
        const transform: PatternInstance = {
          translation: offset,
        };
        
        const transformed = transformGeometry(sourceVertices, sourceNormals, transform);
        
        instances.push({
          vertices: transformed.vertices,
          indices: [...sourceIndices],
          normals: transformed.normals,
        });
      }
    }
  }
  
  return combineGeometry(instances);
}

// ═══════════════════════════════════════════════════════════════
// MIRROR PATTERN
// ═══════════════════════════════════════════════════════════════

/**
 * Mirror geometry across a plane
 * 
 * @param sourceVertices - Original geometry vertices
 * @param sourceIndices - Original geometry indices
 * @param sourceNormals - Original geometry normals
 * @param planeNormal - Normal of the mirror plane as [x, y, z]
 * @param planePoint - A point on the mirror plane as [x, y, z]
 * @param includeOriginal - Whether to include the original geometry
 */
export function mirrorPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  planeNormal: [number, number, number],
  planePoint: [number, number, number] = [0, 0, 0],
  includeOriginal: boolean = true
): PatternGeometry {
  const normal = normalize(vec3(planeNormal[0], planeNormal[1], planeNormal[2]));
  const point = vec3(planePoint[0], planePoint[1], planePoint[2]);
  const instances: PatternGeometry[] = [];
  
  // Add original if requested
  if (includeOriginal) {
    instances.push({
      vertices: sourceVertices.map(v => [...v]),
      indices: [...sourceIndices],
      normals: sourceNormals.map(n => [...n]),
    });
  }
  
  // Create mirrored geometry
  const mirroredVertices: number[][] = [];
  const mirroredNormals: number[][] = [];
  const mirroredIndices: number[] = [];
  
  for (let i = 0; i < sourceVertices.length; i++) {
    const v = vec3(sourceVertices[i][0], sourceVertices[i][1], sourceVertices[i][2]);
    const n = vec3(sourceNormals[i][0], sourceNormals[i][1], sourceNormals[i][2]);
    
    // Reflect vertex across plane
    // v' = v - 2 * ((v - point) · normal) * normal
    const toPoint = vec3(v.x - point.x, v.y - point.y, v.z - point.z);
    const dist = toPoint.x * normal.x + toPoint.y * normal.y + toPoint.z * normal.z;
    
    const reflected = vec3(
      v.x - 2 * dist * normal.x,
      v.y - 2 * dist * normal.y,
      v.z - 2 * dist * normal.z
    );
    
    // Reflect normal
    const nDot = n.x * normal.x + n.y * normal.y + n.z * normal.z;
    const reflectedN = vec3(
      n.x - 2 * nDot * normal.x,
      n.y - 2 * nDot * normal.y,
      n.z - 2 * nDot * normal.z
    );
    
    mirroredVertices.push([reflected.x, reflected.y, reflected.z]);
    mirroredNormals.push([reflectedN.x, reflectedN.y, reflectedN.z]);
  }
  
  // Reverse triangle winding for mirrored geometry
  for (let i = 0; i < sourceIndices.length; i += 3) {
    mirroredIndices.push(sourceIndices[i]);
    mirroredIndices.push(sourceIndices[i + 2]);
    mirroredIndices.push(sourceIndices[i + 1]);
  }
  
  instances.push({
    vertices: mirroredVertices,
    indices: mirroredIndices,
    normals: mirroredNormals,
  });
  
  return combineGeometry(instances);
}

// ═══════════════════════════════════════════════════════════════
// SPIRAL PATTERN
// ═══════════════════════════════════════════════════════════════

/**
 * Create a spiral pattern of geometry
 * 
 * @param sourceVertices - Original geometry vertices
 * @param sourceIndices - Original geometry indices
 * @param sourceNormals - Original geometry normals
 * @param axis - Rotation axis as [x, y, z]
 * @param center - Center of spiral as [x, y, z]
 * @param count - Number of copies
 * @param revolutions - Number of full rotations
 * @param pitch - Vertical distance per revolution
 * @param radiusChange - Change in radius per revolution (0 for constant)
 */
export function spiralPattern(
  sourceVertices: number[][],
  sourceIndices: number[],
  sourceNormals: number[][],
  axis: [number, number, number],
  center: [number, number, number],
  count: number,
  revolutions: number,
  pitch: number,
  radiusChange: number = 0
): PatternGeometry {
  if (count < 1) {
    console.warn('Pattern count must be at least 1');
    return { vertices: [], indices: [], normals: [] };
  }
  
  const axisVec = normalize(vec3(axis[0], axis[1], axis[2]));
  const centerVec = vec3(center[0], center[1], center[2]);
  const totalAngle = revolutions * Math.PI * 2;
  const angleStep = totalAngle / (count - 1 || 1);
  const instances: PatternGeometry[] = [];
  
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const angle = i * angleStep;
    const heightOffset = t * revolutions * pitch;
    const radiusScale = 1 + t * revolutions * radiusChange;
    
    const newVertices: number[][] = [];
    const newNormals: number[][] = [];
    
    for (let j = 0; j < sourceVertices.length; j++) {
      // Translate to center
      let v = vec3(
        (sourceVertices[j][0] - centerVec.x) * radiusScale,
        (sourceVertices[j][1] - centerVec.y) * radiusScale,
        (sourceVertices[j][2] - centerVec.z) * radiusScale
      );
      let n = vec3(sourceNormals[j][0], sourceNormals[j][1], sourceNormals[j][2]);
      
      // Rotate
      v = rotateAroundAxis(v, axisVec, angle);
      n = rotateAroundAxis(n, axisVec, angle);
      
      // Add height offset along axis
      v = add(v, scale(axisVec, heightOffset));
      
      // Translate back
      v = add(v, centerVec);
      
      newVertices.push([v.x, v.y, v.z]);
      newNormals.push([n.x, n.y, n.z]);
    }
    
    instances.push({
      vertices: newVertices,
      indices: [...sourceIndices],
      normals: newNormals,
    });
  }
  
  return combineGeometry(instances);
}
