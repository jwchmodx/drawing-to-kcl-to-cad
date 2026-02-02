/**
 * Transform Engine - Mirror, Scale, Rotate, Translate
 */

export interface TransformResult {
  vertices: number[][];
  indices: number[];
}

/**
 * Mirror geometry across a plane
 * @param vertices - source vertices
 * @param indices - source indices
 * @param plane - 'xy' | 'xz' | 'yz' or normal vector [x, y, z]
 * @param keepOriginal - if true, keep original + mirrored (creates symmetric shape)
 */
export function mirror(
  vertices: number[][],
  indices: number[],
  plane: 'xy' | 'xz' | 'yz' | [number, number, number] = 'yz',
  keepOriginal: boolean = true
): TransformResult {
  // Get mirror axis
  let mirrorAxis: [number, number, number];
  if (plane === 'yz') mirrorAxis = [-1, 1, 1];  // mirror X
  else if (plane === 'xz') mirrorAxis = [1, -1, 1];  // mirror Y
  else if (plane === 'xy') mirrorAxis = [1, 1, -1];  // mirror Z
  else {
    // Custom plane normal - mirror across it
    const [nx, ny, nz] = plane;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const n = [nx / len, ny / len, nz / len];
    // Reflection: v' = v - 2(v·n)n
    mirrorAxis = [
      1 - 2 * n[0] * n[0],
      1 - 2 * n[1] * n[1],
      1 - 2 * n[2] * n[2],
    ];
  }

  const mirroredVerts = vertices.map(v => [
    v[0] * mirrorAxis[0],
    v[1] * mirrorAxis[1],
    v[2] * mirrorAxis[2],
  ]);

  // Reverse winding for mirrored faces
  const mirroredIndices: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    mirroredIndices.push(indices[i], indices[i + 2], indices[i + 1]);
  }

  if (keepOriginal) {
    // Combine original and mirrored
    const offset = vertices.length;
    const combinedVerts = [...vertices, ...mirroredVerts];
    const combinedIndices = [
      ...indices,
      ...mirroredIndices.map(i => i + offset),
    ];
    return { vertices: combinedVerts, indices: combinedIndices };
  }

  return { vertices: mirroredVerts, indices: mirroredIndices };
}

/**
 * Scale geometry
 * @param vertices - source vertices
 * @param indices - source indices
 * @param scale - uniform scale or [sx, sy, sz]
 * @param center - scale center point
 */
export function scale(
  vertices: number[][],
  indices: number[],
  scaleVal: number | [number, number, number],
  center: [number, number, number] = [0, 0, 0]
): TransformResult {
  const [sx, sy, sz] = typeof scaleVal === 'number' 
    ? [scaleVal, scaleVal, scaleVal] 
    : scaleVal;
  const [cx, cy, cz] = center;

  const scaledVerts = vertices.map(v => [
    cx + (v[0] - cx) * sx,
    cy + (v[1] - cy) * sy,
    cz + (v[2] - cz) * sz,
  ]);

  // If any scale is negative, reverse winding
  const needsReverse = sx * sy * sz < 0;
  let newIndices = [...indices];
  if (needsReverse) {
    newIndices = [];
    for (let i = 0; i < indices.length; i += 3) {
      newIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }
  }

  return { vertices: scaledVerts, indices: newIndices };
}

/**
 * Rotate geometry around an axis
 * @param vertices - source vertices
 * @param indices - source indices  
 * @param axis - rotation axis [x, y, z]
 * @param angleDeg - rotation angle in degrees
 * @param center - rotation center point
 */
export function rotate(
  vertices: number[][],
  indices: number[],
  axis: [number, number, number],
  angleDeg: number,
  center: [number, number, number] = [0, 0, 0]
): TransformResult {
  const angle = (angleDeg * Math.PI) / 180;
  const [ax, ay, az] = axis;
  const len = Math.sqrt(ax * ax + ay * ay + az * az);
  const [ux, uy, uz] = [ax / len, ay / len, az / len];
  const [cx, cy, cz] = center;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const oneMinusCos = 1 - cos;

  // Rodrigues' rotation formula matrix
  const rotatedVerts = vertices.map(v => {
    const [x, y, z] = [v[0] - cx, v[1] - cy, v[2] - cz];
    
    const rx = (cos + ux * ux * oneMinusCos) * x +
               (ux * uy * oneMinusCos - uz * sin) * y +
               (ux * uz * oneMinusCos + uy * sin) * z;
    const ry = (uy * ux * oneMinusCos + uz * sin) * x +
               (cos + uy * uy * oneMinusCos) * y +
               (uy * uz * oneMinusCos - ux * sin) * z;
    const rz = (uz * ux * oneMinusCos - uy * sin) * x +
               (uz * uy * oneMinusCos + ux * sin) * y +
               (cos + uz * uz * oneMinusCos) * z;

    return [cx + rx, cy + ry, cz + rz];
  });

  return { vertices: rotatedVerts, indices: [...indices] };
}

/**
 * Translate (move) geometry
 * @param vertices - source vertices
 * @param indices - source indices
 * @param offset - translation [dx, dy, dz]
 */
export function translate(
  vertices: number[][],
  indices: number[],
  offset: [number, number, number]
): TransformResult {
  const [dx, dy, dz] = offset;
  const translatedVerts = vertices.map(v => [
    v[0] + dx,
    v[1] + dy,
    v[2] + dz,
  ]);

  return { vertices: translatedVerts, indices: [...indices] };
}
