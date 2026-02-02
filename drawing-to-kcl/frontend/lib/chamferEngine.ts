/**
 * Chamfer Engine - 45-degree edge cuts for box geometry
 * 
 * Similar to fillet but creates a flat angled cut instead of a curved surface.
 * 
 * Box edge layout matches filletEngine.ts:
 * - Edges 0-3: Back face (-Z)
 * - Edges 4-7: Front face (+Z)
 * - Edges 8-11: Connecting edges (Z-direction)
 */

import {
  vec3,
  add,
  sub,
  scale,
  normalize,
  cross,
  type Vec3,
} from './filletEngine';

export interface ChamferGeometry {
  vertices: number[][];
  indices: number[];
  normals: number[][];
}

export interface ChamferEdgeInfo {
  index: number;
  start: Vec3;
  end: Vec3;
  direction: Vec3;
  length: number;
  face1Normal: Vec3;
  face2Normal: Vec3;
  name: string;
}

// ═══════════════════════════════════════════════════════════════
// BOX EDGE DEFINITIONS (same as filletEngine)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all 12 edges of a box with their properties
 */
export function getBoxEdges(
  size: [number, number, number],
  center: [number, number, number]
): ChamferEdgeInfo[] {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

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

  const edgeDefs: [number, number, Vec3, Vec3, string][] = [
    // Back face edges (-Z)
    [0, 1, vec3(0, -1, 0), vec3(0, 0, -1), 'back-bottom'],
    [1, 2, vec3(1, 0, 0), vec3(0, 0, -1), 'back-right'],
    [2, 3, vec3(0, 1, 0), vec3(0, 0, -1), 'back-top'],
    [3, 0, vec3(-1, 0, 0), vec3(0, 0, -1), 'back-left'],
    // Front face edges (+Z)
    [4, 5, vec3(0, -1, 0), vec3(0, 0, 1), 'front-bottom'],
    [5, 6, vec3(1, 0, 0), vec3(0, 0, 1), 'front-right'],
    [6, 7, vec3(0, 1, 0), vec3(0, 0, 1), 'front-top'],
    [7, 4, vec3(-1, 0, 0), vec3(0, 0, 1), 'front-left'],
    // Connecting edges (Z-direction)
    [0, 4, vec3(-1, 0, 0), vec3(0, -1, 0), 'bottom-left'],
    [1, 5, vec3(1, 0, 0), vec3(0, -1, 0), 'bottom-right'],
    [2, 6, vec3(1, 0, 0), vec3(0, 1, 0), 'top-right'],
    [3, 7, vec3(-1, 0, 0), vec3(0, 1, 0), 'top-left'],
  ];

  return edgeDefs.map((def, index): ChamferEdgeInfo => {
    const [startIdx, endIdx, face1Normal, face2Normal, name] = def;
    const start = v[startIdx];
    const end = v[endIdx];
    const dir = sub(end, start);
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    
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
// CHAMFER SURFACE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a flat chamfer surface along an edge
 * 
 * Unlike fillet which creates a curved quarter-cylinder,
 * chamfer creates a flat surface at 45 degrees.
 */
export function generateChamferSurface(
  edge: ChamferEdgeInfo,
  distance: number
): ChamferGeometry {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Calculate the chamfer plane normal (45 degrees between the two face normals)
  const chamferNormal = normalize(add(edge.face1Normal, edge.face2Normal));
  
  // Calculate the four corners of the chamfer surface
  // The chamfer cuts into the edge by 'distance' in each face direction
  const p1 = add(edge.start, scale(edge.face1Normal, -distance));  // Start, on face1
  const p2 = add(edge.start, scale(edge.face2Normal, -distance));  // Start, on face2
  const p3 = add(edge.end, scale(edge.face2Normal, -distance));    // End, on face2
  const p4 = add(edge.end, scale(edge.face1Normal, -distance));    // End, on face1

  // Add vertices (quad for the chamfer surface)
  vertices.push([p1.x, p1.y, p1.z]);
  vertices.push([p2.x, p2.y, p2.z]);
  vertices.push([p3.x, p3.y, p3.z]);
  vertices.push([p4.x, p4.y, p4.z]);

  // All vertices share the same normal (flat surface)
  for (let i = 0; i < 4; i++) {
    normals.push([chamferNormal.x, chamferNormal.y, chamferNormal.z]);
  }

  // Two triangles to form the quad
  indices.push(0, 1, 2);
  indices.push(0, 2, 3);

  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// BOX WITH CHAMFER
// ═══════════════════════════════════════════════════════════════

/**
 * Generate chamfered box geometry for a specific edge
 */
export function chamferBoxEdge(
  size: [number, number, number],
  center: [number, number, number],
  edgeIndex: number,
  distance: number
): ChamferGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  // Clamp distance to avoid invalid geometry
  const maxDistance = Math.min(hx, hy, hz) * 0.9;
  const d = Math.min(distance, maxDistance);

  // Get edge info
  const edges = getBoxEdges(size, center);
  if (edgeIndex < 0 || edgeIndex >= edges.length) {
    console.warn(`Invalid edge index ${edgeIndex}, using 0`);
    edgeIndex = 0;
  }
  const edge = edges[edgeIndex];

  const allVertices: number[][] = [];
  const allIndices: number[] = [];
  const allNormals: number[][] = [];

  // Generate the chamfer surface
  const chamfer = generateChamferSurface(edge, d);
  
  // Generate the modified box faces
  const boxVerts = generateChamferedBoxVertices(size, center, edge, d);
  
  // Add box vertices
  const boxVertexOffset = allVertices.length;
  for (let i = 0; i < boxVerts.vertices.length; i++) {
    allVertices.push(boxVerts.vertices[i]);
    allNormals.push(boxVerts.normals[i]);
  }
  
  for (const idx of boxVerts.indices) {
    allIndices.push(idx + boxVertexOffset);
  }

  // Add chamfer surface
  const chamferVertexOffset = allVertices.length;
  for (let i = 0; i < chamfer.vertices.length; i++) {
    allVertices.push(chamfer.vertices[i]);
    allNormals.push(chamfer.normals[i]);
  }
  
  for (const idx of chamfer.indices) {
    allIndices.push(idx + chamferVertexOffset);
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
function generateChamferedBoxVertices(
  size: [number, number, number],
  center: [number, number, number],
  edge: ChamferEdgeInfo,
  distance: number
): ChamferGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

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

  // Edge vertex mapping
  const edgeVertexMap: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const [edgeV1, edgeV2] = edgeVertexMap[edge.index];
  
  // Create chamfered vertices
  const chamferV1_1 = add(origV[edgeV1], scale(edge.face1Normal, -distance));
  const chamferV1_2 = add(origV[edgeV1], scale(edge.face2Normal, -distance));
  const chamferV2_1 = add(origV[edgeV2], scale(edge.face1Normal, -distance));
  const chamferV2_2 = add(origV[edgeV2], scale(edge.face2Normal, -distance));

  const modifiedV: Vec3[] = [...origV];
  
  const chamferIdx1_1 = modifiedV.length;
  modifiedV.push(chamferV1_1);
  const chamferIdx1_2 = modifiedV.length;
  modifiedV.push(chamferV1_2);
  const chamferIdx2_1 = modifiedV.length;
  modifiedV.push(chamferV2_1);
  const chamferIdx2_2 = modifiedV.length;
  modifiedV.push(chamferV2_2);

  for (const v of modifiedV) {
    vertices.push([v.x, v.y, v.z]);
  }

  // Face definitions
  const faces = [
    { normal: vec3(0, 0, -1), vertices: [0, 1, 2, 3], name: 'back' },
    { normal: vec3(0, 0, 1), vertices: [4, 5, 6, 7], name: 'front' },
    { normal: vec3(0, -1, 0), vertices: [0, 1, 5, 4], name: 'bottom' },
    { normal: vec3(0, 1, 0), vertices: [3, 2, 6, 7], name: 'top' },
    { normal: vec3(-1, 0, 0), vertices: [0, 3, 7, 4], name: 'left' },
    { normal: vec3(1, 0, 0), vertices: [1, 2, 6, 5], name: 'right' },
  ];

  const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

  for (const face of faces) {
    const faceNormal = face.normal;
    const fv = face.vertices;
    
    const isAdjacentToEdge = (
      (dot(faceNormal, edge.face1Normal) > 0.9) ||
      (dot(faceNormal, edge.face2Normal) > 0.9)
    );
    
    if (isAdjacentToEdge) {
      const n = [faceNormal.x, faceNormal.y, faceNormal.z];
      const v1InFace = fv.includes(edgeV1);
      const v2InFace = fv.includes(edgeV2);
      
      if (v1InFace && v2InFace) {
        const modifiedFv = fv.map(vIdx => {
          if (vIdx === edgeV1) {
            return dot(faceNormal, edge.face1Normal) > 0.9 ? chamferIdx1_1 : chamferIdx1_2;
          }
          if (vIdx === edgeV2) {
            return dot(faceNormal, edge.face1Normal) > 0.9 ? chamferIdx2_1 : chamferIdx2_2;
          }
          return vIdx;
        });
        
        while (normals.length < vertices.length) {
          normals.push([0, 0, 0]);
        }
        if (chamferIdx1_1 < normals.length) normals[chamferIdx1_1] = n;
        if (chamferIdx1_2 < normals.length) normals[chamferIdx1_2] = n;
        if (chamferIdx2_1 < normals.length) normals[chamferIdx2_1] = n;
        if (chamferIdx2_2 < normals.length) normals[chamferIdx2_2] = n;
        
        indices.push(modifiedFv[0], modifiedFv[1], modifiedFv[2]);
        indices.push(modifiedFv[0], modifiedFv[2], modifiedFv[3]);
        
        for (const vIdx of fv) {
          if (normals[vIdx]) {
            normals[vIdx] = n;
          }
        }
      } else {
        for (const vIdx of fv) {
          if (!normals[vIdx]) {
            normals[vIdx] = n;
          }
        }
        indices.push(fv[0], fv[1], fv[2]);
        indices.push(fv[0], fv[2], fv[3]);
      }
    } else {
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

  while (normals.length < vertices.length) {
    normals.push([0, 1, 0]);
  }

  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// COMPLETE CHAMFERED BOX (all edges)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a box with all edges chamfered
 */
export function chamferAllBoxEdges(
  size: [number, number, number],
  center: [number, number, number],
  distance: number
): ChamferGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  const maxDistance = Math.min(hx, hy, hz) * 0.45;
  const d = Math.min(distance, maxDistance);

  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];

  // Inner dimensions
  const ihx = hx - d;
  const ihy = hy - d;
  const ihz = hz - d;

  // 8 corners with 3 chamfer vertices each = 24 chamfer vertices
  // Plus 6 faces with 4 vertices each = 24 face vertices
  // Plus 12 edges with 4 vertices each = 48 edge vertices

  // Generate 8 corner triangles
  const cornerSigns: [number, number, number][] = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];

  for (const [signX, signY, signZ] of cornerSigns) {
    const cornerVert = vec3(
      cx + signX * hx,
      cy + signY * hy,
      cz + signZ * hz
    );
    
    // Three chamfer points
    const p1 = vec3(cornerVert.x - signX * d, cornerVert.y, cornerVert.z);
    const p2 = vec3(cornerVert.x, cornerVert.y - signY * d, cornerVert.z);
    const p3 = vec3(cornerVert.x, cornerVert.y, cornerVert.z - signZ * d);
    
    const startIdx = vertices.length;
    vertices.push([p1.x, p1.y, p1.z]);
    vertices.push([p2.x, p2.y, p2.z]);
    vertices.push([p3.x, p3.y, p3.z]);
    
    // Normal points outward from corner
    const normal = normalize(vec3(signX, signY, signZ));
    normals.push([normal.x, normal.y, normal.z]);
    normals.push([normal.x, normal.y, normal.z]);
    normals.push([normal.x, normal.y, normal.z]);
    
    // Triangle winding
    if (signX * signY * signZ > 0) {
      indices.push(startIdx, startIdx + 1, startIdx + 2);
    } else {
      indices.push(startIdx, startIdx + 2, startIdx + 1);
    }
  }

  // Generate 6 flat faces (inner rectangles)
  const faceData: [Vec3, number, number][] = [
    [vec3(0, 0, -1), 0, 1],  // back: X, Y
    [vec3(0, 0, 1), 0, 1],   // front: X, Y
    [vec3(0, -1, 0), 0, 2],  // bottom: X, Z
    [vec3(0, 1, 0), 0, 2],   // top: X, Z
    [vec3(-1, 0, 0), 2, 1],  // left: Z, Y
    [vec3(1, 0, 0), 2, 1],   // right: Z, Y
  ];

  const dims = [ihx, ihy, ihz];
  const fullDims = [hx, hy, hz];

  for (const [normal, dim1, dim2] of faceData) {
    const faceOffset = Math.abs(normal.x) > 0.5 ? normal.x * hx :
                       Math.abs(normal.y) > 0.5 ? normal.y * hy : normal.z * hz;
    
    const w = dims[dim1];
    const h = dims[dim2];
    
    // Calculate face center
    let faceCenter: Vec3;
    if (Math.abs(normal.z) > 0.5) {
      faceCenter = vec3(cx, cy, cz + faceOffset);
    } else if (Math.abs(normal.y) > 0.5) {
      faceCenter = vec3(cx, cy + faceOffset, cz);
    } else {
      faceCenter = vec3(cx + faceOffset, cy, cz);
    }

    // Calculate tangent vectors
    let tangent: Vec3, bitangent: Vec3;
    if (Math.abs(normal.y) > 0.5) {
      tangent = vec3(1, 0, 0);
      bitangent = vec3(0, 0, normal.y > 0 ? 1 : -1);
    } else if (Math.abs(normal.x) > 0.5) {
      tangent = vec3(0, 0, normal.x > 0 ? -1 : 1);
      bitangent = vec3(0, 1, 0);
    } else {
      tangent = vec3(normal.z > 0 ? 1 : -1, 0, 0);
      bitangent = vec3(0, 1, 0);
    }

    const corners = [
      add(add(faceCenter, scale(tangent, -w)), scale(bitangent, -h)),
      add(add(faceCenter, scale(tangent, w)), scale(bitangent, -h)),
      add(add(faceCenter, scale(tangent, w)), scale(bitangent, h)),
      add(add(faceCenter, scale(tangent, -w)), scale(bitangent, h)),
    ];

    const startIdx = vertices.length;
    for (const corner of corners) {
      vertices.push([corner.x, corner.y, corner.z]);
      normals.push([normal.x, normal.y, normal.z]);
    }

    indices.push(startIdx, startIdx + 1, startIdx + 2);
    indices.push(startIdx, startIdx + 2, startIdx + 3);
  }

  // Generate 12 edge chamfers (quads)
  const edges = getBoxEdges([sx - 2 * d, sy - 2 * d, sz - 2 * d], center);
  for (const edge of edges) {
    const chamfer = generateChamferSurface(edge, d);
    const startIdx = vertices.length;
    
    for (let i = 0; i < chamfer.vertices.length; i++) {
      vertices.push(chamfer.vertices[i]);
      normals.push(chamfer.normals[i]);
    }
    
    for (const idx of chamfer.indices) {
      indices.push(idx + startIdx);
    }
  }

  return { vertices, indices, normals };
}
