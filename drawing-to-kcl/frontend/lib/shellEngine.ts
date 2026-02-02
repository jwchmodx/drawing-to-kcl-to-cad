/**
 * Shell Engine - Create hollow shells from solid geometry
 * 
 * Supports:
 * - Shell with uniform thickness
 * - Open faces (removed during shelling)
 * - Inward/outward shell direction
 * 
 * Works by creating an offset surface and connecting them.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ShellGeometry {
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

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

// ═══════════════════════════════════════════════════════════════
// BOX FACE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface BoxFace {
  index: number;
  normal: Vec3;
  vertices: number[];  // vertex indices
  name: string;
}

function getBoxFaces(): BoxFace[] {
  return [
    { index: 0, normal: vec3(0, 0, -1), vertices: [0, 3, 2, 1], name: 'back' },    // -Z
    { index: 1, normal: vec3(0, 0, 1), vertices: [4, 5, 6, 7], name: 'front' },    // +Z
    { index: 2, normal: vec3(0, -1, 0), vertices: [0, 1, 5, 4], name: 'bottom' },  // -Y
    { index: 3, normal: vec3(0, 1, 0), vertices: [3, 7, 6, 2], name: 'top' },      // +Y
    { index: 4, normal: vec3(-1, 0, 0), vertices: [0, 4, 7, 3], name: 'left' },    // -X
    { index: 5, normal: vec3(1, 0, 0), vertices: [1, 2, 6, 5], name: 'right' },    // +X
  ];
}

// ═══════════════════════════════════════════════════════════════
// SHELL GENERATION FOR BOX
// ═══════════════════════════════════════════════════════════════

/**
 * Create a shell (hollow box) from a solid box
 * 
 * @param size - Box dimensions [width, height, depth]
 * @param center - Box center [x, y, z]
 * @param thickness - Wall thickness
 * @param openFaces - Array of face indices to leave open (0-5)
 *                    0=back, 1=front, 2=bottom, 3=top, 4=left, 5=right
 */
export function shellBox(
  size: [number, number, number],
  center: [number, number, number],
  thickness: number,
  openFaces: number[] = []
): ShellGeometry {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  
  // Clamp thickness
  const maxThickness = Math.min(hx, hy, hz) * 0.9;
  const t = Math.min(thickness, maxThickness);
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  // Outer box vertices (0-7)
  const outerV = [
    vec3(cx - hx, cy - hy, cz - hz),  // 0: back-bottom-left
    vec3(cx + hx, cy - hy, cz - hz),  // 1: back-bottom-right
    vec3(cx + hx, cy + hy, cz - hz),  // 2: back-top-right
    vec3(cx - hx, cy + hy, cz - hz),  // 3: back-top-left
    vec3(cx - hx, cy - hy, cz + hz),  // 4: front-bottom-left
    vec3(cx + hx, cy - hy, cz + hz),  // 5: front-bottom-right
    vec3(cx + hx, cy + hy, cz + hz),  // 6: front-top-right
    vec3(cx - hx, cy + hy, cz + hz),  // 7: front-top-left
  ];
  
  // Inner box vertices (8-15)
  const innerHx = hx - t;
  const innerHy = hy - t;
  const innerHz = hz - t;
  
  const innerV = [
    vec3(cx - innerHx, cy - innerHy, cz - innerHz),  // 8
    vec3(cx + innerHx, cy - innerHy, cz - innerHz),  // 9
    vec3(cx + innerHx, cy + innerHy, cz - innerHz),  // 10
    vec3(cx - innerHx, cy + innerHy, cz - innerHz),  // 11
    vec3(cx - innerHx, cy - innerHy, cz + innerHz),  // 12
    vec3(cx + innerHx, cy - innerHy, cz + innerHz),  // 13
    vec3(cx + innerHx, cy + innerHy, cz + innerHz),  // 14
    vec3(cx - innerHx, cy + innerHy, cz + innerHz),  // 15
  ];
  
  // Add all vertices
  for (const v of outerV) {
    vertices.push([v.x, v.y, v.z]);
  }
  for (const v of innerV) {
    vertices.push([v.x, v.y, v.z]);
  }
  
  // Initialize normals
  for (let i = 0; i < 16; i++) {
    normals.push([0, 0, 0]);
  }
  
  const faces = getBoxFaces();
  const openFaceSet = new Set(openFaces);
  
  // Generate faces
  for (const face of faces) {
    const isOpen = openFaceSet.has(face.index);
    const n = face.normal;
    
    if (!isOpen) {
      // Outer face (outward normal)
      const fv = face.vertices;
      for (const vIdx of fv) {
        normals[vIdx] = [n.x, n.y, n.z];
      }
      indices.push(fv[0], fv[1], fv[2]);
      indices.push(fv[0], fv[2], fv[3]);
      
      // Inner face (inward normal, reversed winding)
      const innerFv = face.vertices.map(v => v + 8);
      const innerN = negate(n);
      for (const vIdx of innerFv) {
        normals[vIdx] = [innerN.x, innerN.y, innerN.z];
      }
      indices.push(innerFv[0], innerFv[2], innerFv[1]);
      indices.push(innerFv[0], innerFv[3], innerFv[2]);
    }
  }
  
  // Generate edge walls (connecting outer and inner surfaces)
  // For each edge of the box, if both adjacent faces are closed,
  // we don't need edge geometry. If one or both are open, we need walls.
  
  // Face adjacency for edges
  const edgeFaces: [number[], [number, number]][] = [
    // [outer edge vertices, [face1, face2]]
    [[0, 1], [0, 2]],  // back-bottom
    [[1, 2], [0, 5]],  // back-right
    [[2, 3], [0, 3]],  // back-top
    [[3, 0], [0, 4]],  // back-left
    [[4, 5], [1, 2]],  // front-bottom
    [[5, 6], [1, 5]],  // front-right
    [[6, 7], [1, 3]],  // front-top
    [[7, 4], [1, 4]],  // front-left
    [[0, 4], [2, 4]],  // bottom-left
    [[1, 5], [2, 5]],  // bottom-right
    [[2, 6], [3, 5]],  // top-right
    [[3, 7], [3, 4]],  // top-left
  ];
  
  for (const [edgeVerts, adjFaces] of edgeFaces) {
    const face1Open = openFaceSet.has(adjFaces[0]);
    const face2Open = openFaceSet.has(adjFaces[1]);
    
    // If exactly one adjacent face is open, we need an edge wall
    if (face1Open !== face2Open) {
      const [v1, v2] = edgeVerts;
      const v1Inner = v1 + 8;
      const v2Inner = v2 + 8;
      
      // Calculate edge normal (average of adjacent face normals)
      const f1Normal = faces[adjFaces[0]].normal;
      const f2Normal = faces[adjFaces[1]].normal;
      const edgeNormal = normalize(add(
        face1Open ? f1Normal : negate(f1Normal),
        face2Open ? f2Normal : negate(f2Normal)
      ));
      
      // Add edge wall vertices
      const startIdx = vertices.length;
      vertices.push([outerV[v1].x, outerV[v1].y, outerV[v1].z]);
      vertices.push([outerV[v2].x, outerV[v2].y, outerV[v2].z]);
      vertices.push([innerV[v2 - (v2 >= 8 ? 8 : 0)].x, innerV[v2].y, innerV[v2].z]);
      vertices.push([innerV[v1 - (v1 >= 8 ? 8 : 0)].x, innerV[v1].y, innerV[v1].z]);
      
      // Proper vertices for the wall quad
      const wallVerts = [
        outerV[v1],
        outerV[v2],
        innerV[v2],
        innerV[v1],
      ];
      
      // Recalculate wall vertices correctly
      vertices.length = startIdx;  // Remove incorrectly added vertices
      
      for (const wv of wallVerts) {
        vertices.push([wv.x, wv.y, wv.z]);
        normals.push([edgeNormal.x, edgeNormal.y, edgeNormal.z]);
      }
      
      // Two triangles for the quad
      indices.push(startIdx, startIdx + 1, startIdx + 2);
      indices.push(startIdx, startIdx + 2, startIdx + 3);
    }
  }
  
  // Generate open face edge rings
  for (const faceIdx of openFaces) {
    const face = faces[faceIdx];
    const fv = face.vertices;
    
    // Create a ring connecting outer face perimeter to inner face perimeter
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      
      const outerV1 = fv[i];
      const outerV2 = fv[j];
      const innerV1 = fv[i] + 8;
      const innerV2 = fv[j] + 8;
      
      // Edge direction
      const edge = sub(outerV[outerV2], outerV[outerV1]);
      
      // Wall normal (perpendicular to face normal and edge)
      const wallNormal = normalize(cross(face.normal, edge));
      
      // Check if this edge needs a wall (adjacent face is not open)
      const edgeInfo = edgeFaces.find(([ev, af]) => 
        (ev[0] === outerV1 && ev[1] === outerV2) || 
        (ev[0] === outerV2 && ev[1] === outerV1)
      );
      
      if (edgeInfo) {
        const [, adjFaces] = edgeInfo;
        const otherFace = adjFaces[0] === faceIdx ? adjFaces[1] : adjFaces[0];
        
        if (!openFaceSet.has(otherFace)) {
          // This edge borders a closed face - add wall
          const startIdx = vertices.length;
          
          vertices.push([outerV[outerV1].x, outerV[outerV1].y, outerV[outerV1].z]);
          vertices.push([outerV[outerV2].x, outerV[outerV2].y, outerV[outerV2].z]);
          vertices.push([innerV[outerV2].x, innerV[outerV2].y, innerV[outerV2].z]);
          vertices.push([innerV[outerV1].x, innerV[outerV1].y, innerV[outerV1].z]);
          
          // Use face normal for the wall (pointing into the opening)
          const n = face.normal;
          for (let k = 0; k < 4; k++) {
            normals.push([n.x, n.y, n.z]);
          }
          
          indices.push(startIdx, startIdx + 1, startIdx + 2);
          indices.push(startIdx, startIdx + 2, startIdx + 3);
        }
      }
    }
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// SHELL GENERATION FOR CYLINDER
// ═══════════════════════════════════════════════════════════════

/**
 * Create a shell (hollow cylinder/tube) from a solid cylinder
 * 
 * @param radius - Outer radius
 * @param height - Cylinder height
 * @param center - Center position
 * @param thickness - Wall thickness
 * @param segments - Number of segments around circumference
 * @param openEnds - Whether to leave the ends open (makes a tube)
 */
export function shellCylinder(
  radius: number,
  height: number,
  center: [number, number, number],
  thickness: number,
  segments: number = 32,
  openEnds: boolean = false
): ShellGeometry {
  const [cx, cy, cz] = center;
  const halfH = height / 2;
  
  // Clamp thickness
  const maxThickness = Math.min(radius * 0.9, halfH * 0.9);
  const t = Math.min(thickness, maxThickness);
  const innerRadius = radius - t;
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  // Generate vertices
  // Outer surface: bottom ring (0 to segments-1), top ring (segments to 2*segments-1)
  // Inner surface: bottom ring (2*segments to 3*segments-1), top ring (3*segments to 4*segments-1)
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Outer bottom
    vertices.push([cx + radius * cos, cy - halfH, cz + radius * sin]);
    normals.push([cos, 0, sin]);
    
    // Outer top
    vertices.push([cx + radius * cos, cy + halfH, cz + radius * sin]);
    normals.push([cos, 0, sin]);
    
    // Inner bottom
    vertices.push([cx + innerRadius * cos, cy - halfH, cz + innerRadius * sin]);
    normals.push([-cos, 0, -sin]);
    
    // Inner top
    vertices.push([cx + innerRadius * cos, cy + halfH, cz + innerRadius * sin]);
    normals.push([-cos, 0, -sin]);
  }
  
  // Generate outer surface triangles
  for (let i = 0; i < segments; i++) {
    const i0 = i * 4;
    const i1 = ((i + 1) % segments) * 4;
    
    // Outer surface
    indices.push(i0, i1, i1 + 1);
    indices.push(i0, i1 + 1, i0 + 1);
    
    // Inner surface (reversed winding)
    indices.push(i0 + 2, i1 + 3, i1 + 2);
    indices.push(i0 + 2, i0 + 3, i1 + 3);
  }
  
  // Generate end caps (if not open)
  if (!openEnds) {
    // Bottom cap ring
    const bottomOuterStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      vertices.push([cx + radius * cos, cy - halfH, cz + radius * sin]);
      normals.push([0, -1, 0]);
    }
    
    const bottomInnerStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      vertices.push([cx + innerRadius * cos, cy - halfH, cz + innerRadius * sin]);
      normals.push([0, -1, 0]);
    }
    
    // Bottom cap triangles
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      indices.push(
        bottomOuterStart + i,
        bottomInnerStart + i,
        bottomOuterStart + j
      );
      indices.push(
        bottomOuterStart + j,
        bottomInnerStart + i,
        bottomInnerStart + j
      );
    }
    
    // Top cap ring
    const topOuterStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      vertices.push([cx + radius * cos, cy + halfH, cz + radius * sin]);
      normals.push([0, 1, 0]);
    }
    
    const topInnerStart = vertices.length;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      vertices.push([cx + innerRadius * cos, cy + halfH, cz + innerRadius * sin]);
      normals.push([0, 1, 0]);
    }
    
    // Top cap triangles (reversed winding from bottom)
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      indices.push(
        topOuterStart + i,
        topOuterStart + j,
        topInnerStart + i
      );
      indices.push(
        topOuterStart + j,
        topInnerStart + j,
        topInnerStart + i
      );
    }
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// SHELL GENERATION FOR SPHERE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a shell (hollow sphere) from a solid sphere
 * 
 * @param radius - Outer radius
 * @param center - Center position
 * @param thickness - Wall thickness
 * @param widthSegments - Segments around equator
 * @param heightSegments - Segments from pole to pole
 * @param openTop - Whether to leave a hole at the top
 * @param openBottom - Whether to leave a hole at the bottom
 */
export function shellSphere(
  radius: number,
  center: [number, number, number],
  thickness: number,
  widthSegments: number = 32,
  heightSegments: number = 16,
  openTop: boolean = false,
  openBottom: boolean = false
): ShellGeometry {
  const [cx, cy, cz] = center;
  
  const maxThickness = radius * 0.9;
  const t = Math.min(thickness, maxThickness);
  const innerRadius = radius - t;
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  const phiStart = openBottom ? Math.PI * 0.1 : 0;
  const phiEnd = openTop ? Math.PI * 0.9 : Math.PI;
  const phiLength = phiEnd - phiStart;
  
  // Generate outer sphere vertices
  const outerStart = vertices.length;
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = phiStart + v * phiLength;
    
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;
      
      const nx = -Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      
      vertices.push([
        cx + radius * nx,
        cy + radius * ny,
        cz + radius * nz
      ]);
      normals.push([nx, ny, nz]);
    }
  }
  
  // Generate inner sphere vertices
  const innerStart = vertices.length;
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = phiStart + v * phiLength;
    
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;
      
      const nx = -Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      
      vertices.push([
        cx + innerRadius * nx,
        cy + innerRadius * ny,
        cz + innerRadius * nz
      ]);
      normals.push([-nx, -ny, -nz]);  // Inward normal
    }
  }
  
  const rowSize = widthSegments + 1;
  
  // Generate outer surface triangles
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = outerStart + y * rowSize + x;
      const b = outerStart + y * rowSize + (x + 1);
      const c = outerStart + (y + 1) * rowSize + x;
      const d = outerStart + (y + 1) * rowSize + (x + 1);
      
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  // Generate inner surface triangles (reversed winding)
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = innerStart + y * rowSize + x;
      const b = innerStart + y * rowSize + (x + 1);
      const c = innerStart + (y + 1) * rowSize + x;
      const d = innerStart + (y + 1) * rowSize + (x + 1);
      
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  
  // Generate edge rings for open ends
  if (openTop || openBottom) {
    // Edge ring at opening
    const generateEdgeRing = (phi: number, normalY: number) => {
      const ringOuterStart = vertices.length;
      for (let x = 0; x <= widthSegments; x++) {
        const theta = (x / widthSegments) * Math.PI * 2;
        const nx = -Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        
        vertices.push([cx + radius * nx, cy + radius * ny, cz + radius * nz]);
        normals.push([0, normalY, 0]);
      }
      
      const ringInnerStart = vertices.length;
      for (let x = 0; x <= widthSegments; x++) {
        const theta = (x / widthSegments) * Math.PI * 2;
        const nx = -Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        
        vertices.push([cx + innerRadius * nx, cy + innerRadius * ny, cz + innerRadius * nz]);
        normals.push([0, normalY, 0]);
      }
      
      // Connect outer and inner rings
      for (let x = 0; x < widthSegments; x++) {
        const a = ringOuterStart + x;
        const b = ringOuterStart + x + 1;
        const c = ringInnerStart + x;
        const d = ringInnerStart + x + 1;
        
        if (normalY > 0) {
          indices.push(a, b, c);
          indices.push(b, d, c);
        } else {
          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
    };
    
    if (openTop) {
      generateEdgeRing(phiEnd, 1);
    }
    if (openBottom) {
      generateEdgeRing(phiStart, -1);
    }
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// GENERIC MESH SHELL
// ═══════════════════════════════════════════════════════════════

/**
 * Create a shell from arbitrary mesh geometry by offsetting vertices
 * along their normals
 * 
 * Note: This is a simplified approach that works well for convex shapes
 * but may produce artifacts on complex concave geometry.
 * 
 * @param vertices - Original mesh vertices
 * @param indices - Original mesh indices
 * @param normals - Original vertex normals
 * @param thickness - Shell thickness (inward offset)
 */
export function shellMesh(
  vertices: number[][],
  indices: number[],
  normals: number[][],
  thickness: number
): ShellGeometry {
  const newVertices: number[][] = [];
  const newIndices: number[] = [];
  const newNormals: number[][] = [];
  
  const vertexCount = vertices.length;
  
  // Copy outer vertices and normals
  for (let i = 0; i < vertexCount; i++) {
    newVertices.push([...vertices[i]]);
    newNormals.push([...normals[i]]);
  }
  
  // Create inner vertices (offset along negative normal)
  for (let i = 0; i < vertexCount; i++) {
    const v = vertices[i];
    const n = normals[i];
    newVertices.push([
      v[0] - thickness * n[0],
      v[1] - thickness * n[1],
      v[2] - thickness * n[2]
    ]);
    // Inner normals point inward (negated)
    newNormals.push([-n[0], -n[1], -n[2]]);
  }
  
  // Copy outer surface indices
  for (const idx of indices) {
    newIndices.push(idx);
  }
  
  // Inner surface indices (offset and reversed winding)
  for (let i = 0; i < indices.length; i += 3) {
    newIndices.push(indices[i] + vertexCount);
    newIndices.push(indices[i + 2] + vertexCount);
    newIndices.push(indices[i + 1] + vertexCount);
  }
  
  // Note: This doesn't close the edges properly for open meshes
  // A complete implementation would need to identify boundary edges
  // and create connecting surfaces
  
  return {
    vertices: newVertices,
    indices: newIndices,
    normals: newNormals
  };
}
