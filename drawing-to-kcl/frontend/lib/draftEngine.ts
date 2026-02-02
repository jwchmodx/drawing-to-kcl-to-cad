/**
 * Draft Engine - Apply draft angle to faces
 * Creates tapered geometry for mold release
 */

type Vec3 = [number, number, number];

interface DraftResult {
  vertices: number[][];
  indices: number[];
}

/**
 * Normalize a vector
 */
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Dot product
 */
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Cross product
 */
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/**
 * Subtract vectors
 */
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Add vectors
 */
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Scale vector
 */
function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Calculate face normal from triangle vertices
 */
function faceNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const edge1 = sub(v1, v0);
  const edge2 = sub(v2, v0);
  return normalize(cross(edge1, edge2));
}

/**
 * Apply draft angle to a box
 * Creates a tapered box where top is smaller/larger than bottom
 * 
 * @param size - Base size [width, height, depth]
 * @param center - Center position
 * @param angle - Draft angle in degrees (positive = smaller at top)
 * @param direction - Draft direction (default: up [0,1,0])
 */
export function draftBox(
  size: Vec3,
  center: Vec3,
  angle: number,
  direction: Vec3 = [0, 1, 0]
): DraftResult {
  const [width, height, depth] = size;
  const [cx, cy, cz] = center;
  const dir = normalize(direction);
  
  // Calculate draft offset based on angle
  // tan(angle) = offset / height
  const angleRad = (angle * Math.PI) / 180;
  const draftOffset = Math.tan(angleRad) * height;
  
  // Bottom vertices (original size)
  const hw = width / 2;
  const hd = depth / 2;
  const bottom = cy - height / 2;
  const top = cy + height / 2;
  
  // Top vertices (adjusted by draft)
  const hwTop = hw - draftOffset;
  const hdTop = hd - draftOffset;
  
  // Ensure we don't invert the shape
  const hwTopClamped = Math.max(0.01, hwTop);
  const hdTopClamped = Math.max(0.01, hdTop);
  
  const vertices: number[][] = [
    // Bottom face (0-3)
    [cx - hw, bottom, cz - hd],
    [cx + hw, bottom, cz - hd],
    [cx + hw, bottom, cz + hd],
    [cx - hw, bottom, cz + hd],
    // Top face (4-7)
    [cx - hwTopClamped, top, cz - hdTopClamped],
    [cx + hwTopClamped, top, cz - hdTopClamped],
    [cx + hwTopClamped, top, cz + hdTopClamped],
    [cx - hwTopClamped, top, cz + hdTopClamped],
  ];
  
  const indices: number[] = [
    // Bottom face
    0, 2, 1, 0, 3, 2,
    // Top face
    4, 5, 6, 4, 6, 7,
    // Front face
    0, 1, 5, 0, 5, 4,
    // Back face
    2, 3, 7, 2, 7, 6,
    // Left face
    3, 0, 4, 3, 4, 7,
    // Right face
    1, 2, 6, 1, 6, 5,
  ];
  
  return { vertices, indices };
}

/**
 * Apply draft angle to a cylinder
 * Creates a cone-like shape (frustum)
 * 
 * @param radius - Base radius
 * @param height - Height of cylinder
 * @param center - Center position
 * @param angle - Draft angle in degrees
 * @param segments - Number of segments
 */
export function draftCylinder(
  radius: number,
  height: number,
  center: Vec3,
  angle: number,
  segments: number = 32
): DraftResult {
  const [cx, cy, cz] = center;
  const bottom = cy - height / 2;
  const top = cy + height / 2;
  
  // Calculate top radius based on draft angle
  const angleRad = (angle * Math.PI) / 180;
  const radiusOffset = Math.tan(angleRad) * height;
  const topRadius = Math.max(0.01, radius - radiusOffset);
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  
  // Generate bottom ring
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    vertices.push([
      cx + radius * Math.cos(theta),
      bottom,
      cz + radius * Math.sin(theta)
    ]);
  }
  
  // Generate top ring
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    vertices.push([
      cx + topRadius * Math.cos(theta),
      top,
      cz + topRadius * Math.sin(theta)
    ]);
  }
  
  // Bottom center
  const bottomCenterIdx = vertices.length;
  vertices.push([cx, bottom, cz]);
  
  // Top center
  const topCenterIdx = vertices.length;
  vertices.push([cx, top, cz]);
  
  // Side faces
  for (let i = 0; i < segments; i++) {
    const i2 = (i + 1) % segments;
    
    const b1 = i;
    const b2 = i2;
    const t1 = segments + i;
    const t2 = segments + i2;
    
    indices.push(b1, b2, t2);
    indices.push(b1, t2, t1);
  }
  
  // Bottom cap
  for (let i = 0; i < segments; i++) {
    const i2 = (i + 1) % segments;
    indices.push(bottomCenterIdx, i2, i);
  }
  
  // Top cap
  for (let i = 0; i < segments; i++) {
    const i2 = (i + 1) % segments;
    indices.push(topCenterIdx, segments + i, segments + i2);
  }
  
  return { vertices, indices };
}

/**
 * Apply draft to existing mesh vertices
 * Moves vertices based on their height relative to a plane
 * 
 * @param vertices - Input vertices
 * @param indices - Input indices
 * @param angle - Draft angle in degrees
 * @param planePoint - Point on the neutral plane
 * @param planeNormal - Normal of the neutral plane (draft direction)
 */
export function draftMesh(
  vertices: number[][],
  indices: number[],
  angle: number,
  planePoint: Vec3 = [0, 0, 0],
  planeNormal: Vec3 = [0, 1, 0]
): DraftResult {
  const dir = normalize(planeNormal);
  const angleRad = (angle * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad);
  
  const newVertices: number[][] = [];
  
  for (const v of vertices) {
    const vertex: Vec3 = [v[0], v[1], v[2]];
    
    // Calculate signed distance from plane along normal
    const toVertex = sub(vertex, planePoint);
    const heightAlongNormal = dot(toVertex, dir);
    
    // Calculate perpendicular component (radial direction from draft axis)
    const normalComponent = scale(dir, heightAlongNormal);
    const radialComponent = sub(toVertex, normalComponent);
    const radialLength = Math.sqrt(
      radialComponent[0] ** 2 + 
      radialComponent[1] ** 2 + 
      radialComponent[2] ** 2
    );
    
    if (radialLength > 0.001) {
      // Calculate draft offset
      const draftOffset = heightAlongNormal * tanAngle;
      const scaleFactor = Math.max(0.01, (radialLength - draftOffset) / radialLength);
      
      // Apply draft by scaling radial component
      const newRadial = scale(radialComponent, scaleFactor);
      const newVertex = add(add(planePoint, normalComponent), newRadial);
      newVertices.push(newVertex);
    } else {
      // Vertex is on the axis, no draft needed
      newVertices.push(vertex);
    }
  }
  
  return { vertices: newVertices, indices: [...indices] };
}

/**
 * Create a drafted extrusion (like injection molding part)
 * 
 * @param profile - 2D profile points [[x,z], ...]
 * @param height - Extrusion height
 * @param center - Base center
 * @param angle - Draft angle
 */
export function draftExtrude(
  profile: [number, number][],
  height: number,
  center: Vec3,
  angle: number
): DraftResult {
  const [cx, cy, cz] = center;
  const bottom = cy;
  const top = cy + height;
  
  const angleRad = (angle * Math.PI) / 180;
  const scaleFactor = 1 - (Math.tan(angleRad) * height) / 
    Math.max(...profile.map(p => Math.sqrt(p[0] ** 2 + p[1] ** 2)));
  const topScale = Math.max(0.01, scaleFactor);
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  
  const n = profile.length;
  
  // Bottom profile
  for (const [px, pz] of profile) {
    vertices.push([cx + px, bottom, cz + pz]);
  }
  
  // Top profile (scaled by draft)
  for (const [px, pz] of profile) {
    vertices.push([cx + px * topScale, top, cz + pz * topScale]);
  }
  
  // Bottom center
  const bottomCenterIdx = vertices.length;
  vertices.push([cx, bottom, cz]);
  
  // Top center
  const topCenterIdx = vertices.length;
  vertices.push([cx, top, cz]);
  
  // Side faces
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    
    indices.push(i, i2, n + i2);
    indices.push(i, n + i2, n + i);
  }
  
  // Bottom cap
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    indices.push(bottomCenterIdx, i2, i);
  }
  
  // Top cap
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    indices.push(topCenterIdx, n + i, n + i2);
  }
  
  return { vertices, indices };
}
