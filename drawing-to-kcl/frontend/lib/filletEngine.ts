/**
 * Fillet Engine - Precise edge filleting for box geometry
 * 
 * Box vertex layout (center at origin):
 *   3-----2    (back face, -Z)
 *   |     |
 *   0-----1
 * 
 *   7-----6    (front face, +Z)
 *   |     |
 *   4-----5
 * 
 * Vertex indices:
 *   0: (-hx, -hy, -hz) back-bottom-left
 *   1: (+hx, -hy, -hz) back-bottom-right
 *   2: (+hx, +hy, -hz) back-top-right
 *   3: (-hx, +hy, -hz) back-top-left
 *   4: (-hx, -hy, +hz) front-bottom-left
 *   5: (+hx, -hy, +hz) front-bottom-right
 *   6: (+hx, +hy, +hz) front-top-right
 *   7: (-hx, +hy, +hz) front-top-left
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EdgeInfo {
  index: number;
  start: Vec3;
  end: Vec3;
  direction: Vec3;  // normalized
  length: number;
  // Adjacent faces (by normal direction)
  face1Normal: Vec3;
  face2Normal: Vec3;
  name: string;  // human-readable name
}

export interface FilletGeometry {
  vertices: number[][];
  indices: number[];
  normals: number[][];
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

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
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

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// ═══════════════════════════════════════════════════════════════
// BOX EDGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all 12 edges of a box with their properties
 * 
 * Edge index convention:
 * - 0-3: Back face edges (-Z)
 * - 4-7: Front face edges (+Z)
 * - 8-11: Connecting edges (Z-direction)
 */
export function getBoxEdges(
  size: [number, number, number],
  center: [number, number, number]
): EdgeInfo[] {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  // 8 vertices
  const v = [
    vec3(cx - hx, cy - hy, cz - hz),  // 0: back-bottom-left
    vec3(cx + hx, cy - hy, cz - hz),  // 1: back-bottom-right
    vec3(cx + hx, cy + hy, cz - hz),  // 2: back-top-right
    vec3(cx - hx, cy + hy, cz - hz),  // 3: back-top-left
    vec3(cx - hx, cy - hy, cz + hz),  // 4: front-bottom-left
    vec3(cx + hx, cy - hy, cz + hz),  // 5: front-bottom-right
    vec3(cx + hx, cy + hy, cz + hz),  // 6: front-top-right
    vec3(cx - hx, cy + hy, cz + hz),  // 7: front-top-left
  ];

  // Define edges: [startIdx, endIdx, face1Normal, face2Normal, name]
  const edgeDefs: [number, number, Vec3, Vec3, string][] = [
    // Back face edges (-Z)
    [0, 1, vec3(0, -1, 0), vec3(0, 0, -1), 'back-bottom'],     // 0
    [1, 2, vec3(1, 0, 0), vec3(0, 0, -1), 'back-right'],       // 1
    [2, 3, vec3(0, 1, 0), vec3(0, 0, -1), 'back-top'],         // 2
    [3, 0, vec3(-1, 0, 0), vec3(0, 0, -1), 'back-left'],       // 3
    
    // Front face edges (+Z)
    [4, 5, vec3(0, -1, 0), vec3(0, 0, 1), 'front-bottom'],     // 4
    [5, 6, vec3(1, 0, 0), vec3(0, 0, 1), 'front-right'],       // 5
    [6, 7, vec3(0, 1, 0), vec3(0, 0, 1), 'front-top'],         // 6
    [7, 4, vec3(-1, 0, 0), vec3(0, 0, 1), 'front-left'],       // 7
    
    // Connecting edges (Z-direction)
    [0, 4, vec3(-1, 0, 0), vec3(0, -1, 0), 'bottom-left'],     // 8
    [1, 5, vec3(1, 0, 0), vec3(0, -1, 0), 'bottom-right'],     // 9
    [2, 6, vec3(1, 0, 0), vec3(0, 1, 0), 'top-right'],         // 10
    [3, 7, vec3(-1, 0, 0), vec3(0, 1, 0), 'top-left'],         // 11
  ];

  return edgeDefs.map((def, index): EdgeInfo => {
    const [startIdx, endIdx, face1Normal, face2Normal, name] = def;
    const start = v[startIdx];
    const end = v[endIdx];
    const dir = sub(end, start);
    const len = length(dir);
    
    return {
      index,
      start,
      end,
      direction: normalize(dir),
      length: len,
      face1Normal,
      face2Normal,
      name,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FILLET GEOMETRY GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a cylindrical fillet surface along an edge
 * 
 * The fillet is a quarter-cylinder that:
 * - Runs along the edge direction
 * - Curves from face1 to face2
 * - Has the specified radius
 */
export function generateFilletSurface(
  edge: EdgeInfo,
  radius: number,
  segments: number = 8
): FilletGeometry {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Calculate the fillet center line (offset from the edge by radius in both face directions)
  // The center line is at: edge.start - face1Normal * radius - face2Normal * radius
  const offset = add(scale(edge.face1Normal, -radius), scale(edge.face2Normal, -radius));
  const centerStart = add(edge.start, offset);
  const centerEnd = add(edge.end, offset);

  // Number of points along the edge length
  const lengthSegments = Math.max(2, Math.ceil(edge.length / 0.5));
  
  // Generate vertices along the fillet surface
  // For each point along the edge, create an arc from face1 to face2
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const centerPoint = add(scale(centerStart, 1 - t), scale(centerEnd, t));
    
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * (Math.PI / 2);
      
      // Calculate point on the arc
      // Start at face1 direction, rotate towards face2 direction
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Point on the fillet surface
      const pointOffset = add(
        scale(edge.face1Normal, radius * cosA),
        scale(edge.face2Normal, radius * sinA)
      );
      const point = add(centerPoint, pointOffset);
      
      vertices.push([point.x, point.y, point.z]);
      
      // Normal at this point (pointing outward from center)
      const normal = normalize(pointOffset);
      normals.push([normal.x, normal.y, normal.z]);
    }
  }

  // Generate indices for the triangulated surface
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      
      // Two triangles per quad
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// BOX WITH FILLET
// ═══════════════════════════════════════════════════════════════

interface BoxFace {
  normal: Vec3;
  vertices: number[];  // indices into the box vertices
  name: string;
}

/**
 * Get the 6 faces of a box
 */
function getBoxFaces(): BoxFace[] {
  return [
    { normal: vec3(0, 0, -1), vertices: [0, 1, 2, 3], name: 'back' },    // -Z
    { normal: vec3(0, 0, 1), vertices: [4, 5, 6, 7], name: 'front' },    // +Z
    { normal: vec3(0, -1, 0), vertices: [0, 1, 5, 4], name: 'bottom' },  // -Y
    { normal: vec3(0, 1, 0), vertices: [3, 2, 6, 7], name: 'top' },      // +Y
    { normal: vec3(-1, 0, 0), vertices: [0, 3, 7, 4], name: 'left' },    // -X
    { normal: vec3(1, 0, 0), vertices: [1, 2, 6, 5], name: 'right' },    // +X
  ];
}

/**
 * Generate filleted box geometry for a specific edge
 */
export function filletBoxEdge(
  size: [number, number, number],
  center: [number, number, number],
  edgeIndex: number,
  radius: number,
  segments: number = 8
): FilletGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  // Clamp radius to avoid invalid geometry
  const maxRadius = Math.min(hx, hy, hz) * 0.9;
  const r = Math.min(radius, maxRadius);

  // Get edge info
  const edges = getBoxEdges(size, center);
  if (edgeIndex < 0 || edgeIndex >= edges.length) {
    console.warn(`Invalid edge index ${edgeIndex}, using 0`);
    edgeIndex = 0;
  }
  const edge = edges[edgeIndex];

  // Generate the fillet surface
  const fillet = generateFilletSurface(edge, r, segments);

  // Generate the modified box faces
  // We need to:
  // 1. Modify the two adjacent faces to have a chamfer
  // 2. Keep the other 4 faces intact
  // 3. Add the fillet surface
  // 4. Add connecting triangles

  const allVertices: number[][] = [];
  const allIndices: number[] = [];
  const allNormals: number[][] = [];

  // Generate box vertices (modified for fillet)
  const boxVerts = generateFilletedBoxVertices(size, center, edge, r);
  
  // Add box vertices
  const boxVertexOffset = allVertices.length;
  for (let i = 0; i < boxVerts.vertices.length; i++) {
    allVertices.push(boxVerts.vertices[i]);
    allNormals.push(boxVerts.normals[i]);
  }
  
  // Add box indices
  for (const idx of boxVerts.indices) {
    allIndices.push(idx + boxVertexOffset);
  }

  // Add fillet surface
  const filletVertexOffset = allVertices.length;
  for (let i = 0; i < fillet.vertices.length; i++) {
    allVertices.push(fillet.vertices[i]);
    allNormals.push(fillet.normals[i]);
  }
  
  // Add fillet indices
  for (const idx of fillet.indices) {
    allIndices.push(idx + filletVertexOffset);
  }

  return {
    vertices: allVertices,
    indices: allIndices,
    normals: allNormals,
  };
}

/**
 * Generate box vertices with a chamfer cut along the specified edge
 */
function generateFilletedBoxVertices(
  size: [number, number, number],
  center: [number, number, number],
  edge: EdgeInfo,
  radius: number
): FilletGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const r = radius;

  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Original 8 box vertices
  const origV = [
    vec3(cx - hx, cy - hy, cz - hz),  // 0
    vec3(cx + hx, cy - hy, cz - hz),  // 1
    vec3(cx + hx, cy + hy, cz - hz),  // 2
    vec3(cx - hx, cy + hy, cz - hz),  // 3
    vec3(cx - hx, cy - hy, cz + hz),  // 4
    vec3(cx + hx, cy - hy, cz + hz),  // 5
    vec3(cx + hx, cy + hy, cz + hz),  // 6
    vec3(cx - hx, cy + hy, cz + hz),  // 7
  ];

  // For each face, we need to modify the vertices near the filleted edge
  // Create new vertices that are offset by the fillet radius
  
  // Map from edge index to the two vertex indices that form it
  const edgeVertexMap: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],  // back face
    [4, 5], [5, 6], [6, 7], [7, 4],  // front face
    [0, 4], [1, 5], [2, 6], [3, 7],  // connecting
  ];

  const [edgeV1, edgeV2] = edgeVertexMap[edge.index];
  
  // Create chamfered vertices for the edge
  const chamferV1_1 = add(origV[edgeV1], scale(edge.face1Normal, -r));
  const chamferV1_2 = add(origV[edgeV1], scale(edge.face2Normal, -r));
  const chamferV2_1 = add(origV[edgeV2], scale(edge.face1Normal, -r));
  const chamferV2_2 = add(origV[edgeV2], scale(edge.face2Normal, -r));

  // Build the modified geometry
  // For simplicity, we'll rebuild the entire box with the modified vertices
  
  // Create a vertex array with original + chamfered vertices
  const modifiedV: Vec3[] = [...origV];
  
  // Replace the edge vertices with their chamfered versions
  // and add intermediate chamfer vertices
  const chamferIdx1_1 = modifiedV.length;
  modifiedV.push(chamferV1_1);
  const chamferIdx1_2 = modifiedV.length;
  modifiedV.push(chamferV1_2);
  const chamferIdx2_1 = modifiedV.length;
  modifiedV.push(chamferV2_1);
  const chamferIdx2_2 = modifiedV.length;
  modifiedV.push(chamferV2_2);

  // Convert to array format
  for (const v of modifiedV) {
    vertices.push([v.x, v.y, v.z]);
  }

  // Define faces based on which edge is being filleted
  // This is simplified - a full implementation would handle all 12 edges
  
  // For now, generate the original box faces but with modified vertices where needed
  const faces = getBoxFaces();
  
  for (const face of faces) {
    const faceNormal = face.normal;
    const fv = face.vertices;
    
    // Check if this face is adjacent to the filleted edge
    const isAdjacentToEdge = (
      (dot(faceNormal, edge.face1Normal) > 0.9) ||
      (dot(faceNormal, edge.face2Normal) > 0.9)
    );
    
    if (isAdjacentToEdge) {
      // This face needs to be modified
      // For now, use original vertices (the fillet surface will cover the edge)
      const n = [faceNormal.x, faceNormal.y, faceNormal.z];
      
      // Get face vertex indices that need to be chamfered
      const v1InFace = fv.includes(edgeV1);
      const v2InFace = fv.includes(edgeV2);
      
      if (v1InFace && v2InFace) {
        // Both edge vertices are in this face
        // Create a modified face with chamfered vertices
        const modifiedFv = fv.map(vIdx => {
          if (vIdx === edgeV1) {
            return dot(faceNormal, edge.face1Normal) > 0.9 ? chamferIdx1_1 : chamferIdx1_2;
          }
          if (vIdx === edgeV2) {
            return dot(faceNormal, edge.face1Normal) > 0.9 ? chamferIdx2_1 : chamferIdx2_2;
          }
          return vIdx;
        });
        
        // Add normals for new vertices
        while (normals.length < vertices.length) {
          normals.push([0, 0, 0]);
        }
        if (chamferIdx1_1 < normals.length) normals[chamferIdx1_1] = n;
        if (chamferIdx1_2 < normals.length) normals[chamferIdx1_2] = n;
        if (chamferIdx2_1 < normals.length) normals[chamferIdx2_1] = n;
        if (chamferIdx2_2 < normals.length) normals[chamferIdx2_2] = n;
        
        // Triangulate the modified quad
        indices.push(modifiedFv[0], modifiedFv[1], modifiedFv[2]);
        indices.push(modifiedFv[0], modifiedFv[2], modifiedFv[3]);
        
        // Update normals for original vertices
        for (const vIdx of fv) {
          if (normals[vIdx]) {
            normals[vIdx] = n;
          }
        }
      } else {
        // Normal face triangulation
        for (const vIdx of fv) {
          if (!normals[vIdx]) {
            normals[vIdx] = n;
          }
        }
        indices.push(fv[0], fv[1], fv[2]);
        indices.push(fv[0], fv[2], fv[3]);
      }
    } else {
      // Face is not adjacent to the edge, keep original
      const n = [faceNormal.x, faceNormal.y, faceNormal.z];
      for (const vIdx of fv) {
        if (!normals[vIdx]) {
          normals[vIdx] = n;
        }
      }
      indices.push(fv[0], fv[1], fv[2]);
      indices.push(fv[0], fv[2], fv[3]);
    }
  }

  // Fill in any missing normals
  while (normals.length < vertices.length) {
    normals.push([0, 1, 0]);
  }

  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// COMPLETE FILLETED BOX (all edges)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a box with all edges filleted
 * This creates a "rounded box" effect
 */
export function filletAllBoxEdges(
  size: [number, number, number],
  center: [number, number, number],
  radius: number,
  segments: number = 8
): FilletGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  // Clamp radius
  const maxRadius = Math.min(hx, hy, hz) * 0.9;
  const r = Math.min(radius, maxRadius);

  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Inner box dimensions (after fillet offset)
  const ihx = hx - r;
  const ihy = hy - r;
  const ihz = hz - r;

  // Generate 8 corner spheres (1/8 spheres)
  const cornerSigns: [number, number, number][] = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];

  for (const [sx_, sy_, sz_] of cornerSigns) {
    const cornerCenter = vec3(
      cx + sx_ * ihx,
      cy + sy_ * ihy,
      cz + sz_ * ihz
    );
    
    const cornerVerts = generateCornerSphere(cornerCenter, r, sx_, sy_, sz_, segments);
    const startIdx = vertices.length;
    
    for (let i = 0; i < cornerVerts.vertices.length; i++) {
      vertices.push(cornerVerts.vertices[i]);
      normals.push(cornerVerts.normals[i]);
    }
    
    for (const idx of cornerVerts.indices) {
      indices.push(idx + startIdx);
    }
  }

  // Generate 12 edge cylinders (quarter cylinders)
  const edges = getBoxEdges([sx - 2 * r, sy - 2 * r, sz - 2 * r], center);
  for (const edge of edges) {
    const edgeVerts = generateFilletSurface(edge, r, segments);
    const startIdx = vertices.length;
    
    for (let i = 0; i < edgeVerts.vertices.length; i++) {
      vertices.push(edgeVerts.vertices[i]);
      normals.push(edgeVerts.normals[i]);
    }
    
    for (const idx of edgeVerts.indices) {
      indices.push(idx + startIdx);
    }
  }

  // Generate 6 flat faces (rectangles)
  const faceOffsets: [Vec3, number, number, number, number][] = [
    // [normal, width dim, height dim, w half, h half]
    [vec3(0, 0, -1), 0, 1, ihx, ihy],  // back
    [vec3(0, 0, 1), 0, 1, ihx, ihy],   // front
    [vec3(0, -1, 0), 0, 2, ihx, ihz],  // bottom
    [vec3(0, 1, 0), 0, 2, ihx, ihz],   // top
    [vec3(-1, 0, 0), 2, 1, ihz, ihy],  // left
    [vec3(1, 0, 0), 2, 1, ihz, ihy],   // right
  ];

  for (const [normal, wDim, hDim, wHalf, hHalf] of faceOffsets) {
    const faceCenter = add(vec3(cx, cy, cz), scale(normal, hx - r + (wDim === 0 ? 0 : 0)));
    // Calculate face center based on normal direction
    let fc: Vec3;
    if (Math.abs(normal.z) > 0.5) {
      fc = vec3(cx, cy, cz + normal.z * hz);
    } else if (Math.abs(normal.y) > 0.5) {
      fc = vec3(cx, cy + normal.y * hy, cz);
    } else {
      fc = vec3(cx + normal.x * hx, cy, cz);
    }

    const faceVerts = generateFlatFace(fc, normal, wHalf, hHalf);
    const startIdx = vertices.length;
    
    for (let i = 0; i < faceVerts.vertices.length; i++) {
      vertices.push(faceVerts.vertices[i]);
      normals.push(faceVerts.normals[i]);
    }
    
    for (const idx of faceVerts.indices) {
      indices.push(idx + startIdx);
    }
  }

  return { vertices, indices, normals };
}

/**
 * Generate a 1/8 sphere for a box corner
 */
function generateCornerSphere(
  center: Vec3,
  radius: number,
  signX: number,
  signY: number,
  signZ: number,
  segments: number
): FilletGeometry {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Generate vertices for the corner octant
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * (Math.PI / 2);
    for (let j = 0; j <= segments; j++) {
      const phi = (j / segments) * (Math.PI / 2);
      
      const nx = signX * Math.sin(theta) * Math.cos(phi);
      const ny = signY * Math.cos(theta);
      const nz = signZ * Math.sin(theta) * Math.sin(phi);
      
      const x = center.x + radius * nx;
      const y = center.y + radius * ny;
      const z = center.z + radius * nz;
      
      vertices.push([x, y, z]);
      normals.push([nx, ny, nz]);
    }
  }

  // Generate indices
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      
      // Wind triangles correctly based on corner sign
      if (signX * signY * signZ > 0) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  return { vertices, indices, normals };
}

/**
 * Generate a flat rectangular face
 */
function generateFlatFace(
  center: Vec3,
  normal: Vec3,
  halfWidth: number,
  halfHeight: number
): FilletGeometry {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Calculate tangent vectors
  let tangent: Vec3, bitangent: Vec3;
  if (Math.abs(normal.y) > 0.9) {
    tangent = vec3(1, 0, 0);
    bitangent = vec3(0, 0, normal.y > 0 ? 1 : -1);
  } else if (Math.abs(normal.x) > 0.9) {
    tangent = vec3(0, 0, normal.x > 0 ? -1 : 1);
    bitangent = vec3(0, 1, 0);
  } else {
    tangent = vec3(normal.z > 0 ? 1 : -1, 0, 0);
    bitangent = vec3(0, 1, 0);
  }

  // 4 corner vertices
  const corners = [
    add(add(center, scale(tangent, -halfWidth)), scale(bitangent, -halfHeight)),
    add(add(center, scale(tangent, halfWidth)), scale(bitangent, -halfHeight)),
    add(add(center, scale(tangent, halfWidth)), scale(bitangent, halfHeight)),
    add(add(center, scale(tangent, -halfWidth)), scale(bitangent, halfHeight)),
  ];

  for (const corner of corners) {
    vertices.push([corner.x, corner.y, corner.z]);
    normals.push([normal.x, normal.y, normal.z]);
  }

  // Two triangles
  indices.push(0, 1, 2);
  indices.push(0, 2, 3);

  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  vec3,
  add,
  sub,
  scale,
  length,
  normalize,
  cross,
  dot,
};
