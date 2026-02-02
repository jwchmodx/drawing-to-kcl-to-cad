/**
 * Sweep Engine - Extrude a profile along a path
 * Creates 3D geometry by sweeping a 2D profile along a 3D curve
 */

type Vec3 = [number, number, number];
type Vec2 = [number, number];

interface SweepResult {
  vertices: number[][];
  indices: number[];
  normals: number[][];
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
 * Cross product of two vectors
 */
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/**
 * Subtract two vectors
 */
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Add two vectors
 */
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Scale a vector
 */
function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Generate Frenet frame (tangent, normal, binormal) along path
 */
function frenetFrame(path: Vec3[], index: number): { T: Vec3; N: Vec3; B: Vec3 } {
  const n = path.length;
  
  // Calculate tangent
  let T: Vec3;
  if (index === 0) {
    T = normalize(sub(path[1], path[0]));
  } else if (index === n - 1) {
    T = normalize(sub(path[n - 1], path[n - 2]));
  } else {
    T = normalize(sub(path[index + 1], path[index - 1]));
  }
  
  // Calculate normal (perpendicular to tangent)
  // Use an arbitrary vector to create initial normal
  let arbitrary: Vec3 = [0, 1, 0];
  if (Math.abs(T[1]) > 0.9) {
    arbitrary = [1, 0, 0];
  }
  
  const N = normalize(cross(T, arbitrary));
  const B = normalize(cross(T, N));
  
  return { T, N, B };
}

/**
 * Transform a 2D profile point to 3D using Frenet frame
 */
function transformProfile(
  point: Vec2,
  center: Vec3,
  N: Vec3,
  B: Vec3
): Vec3 {
  return [
    center[0] + point[0] * N[0] + point[1] * B[0],
    center[1] + point[0] * N[1] + point[1] * B[1],
    center[2] + point[0] * N[2] + point[1] * B[2]
  ];
}

/**
 * Generate a circular profile
 */
export function circleProfile(radius: number, segments: number = 16): Vec2[] {
  const profile: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    profile.push([
      radius * Math.cos(angle),
      radius * Math.sin(angle)
    ]);
  }
  return profile;
}

/**
 * Generate a rectangular profile
 */
export function rectProfile(width: number, height: number): Vec2[] {
  const hw = width / 2;
  const hh = height / 2;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh]
  ];
}

/**
 * Generate a straight line path
 */
export function linePath(start: Vec3, end: Vec3, segments: number = 10): Vec3[] {
  const path: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    path.push([
      start[0] + t * (end[0] - start[0]),
      start[1] + t * (end[1] - start[1]),
      start[2] + t * (end[2] - start[2])
    ]);
  }
  return path;
}

/**
 * Generate a curved path (bezier-like)
 */
export function curvePath(points: Vec3[], segments: number = 20): Vec3[] {
  if (points.length < 2) return points;
  if (points.length === 2) return linePath(points[0], points[1], segments);
  
  // Catmull-Rom spline interpolation
  const path: Vec3[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const segPerSpan = Math.ceil(segments / (points.length - 1));
    
    for (let j = 0; j < segPerSpan; j++) {
      const t = j / segPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      
      // Catmull-Rom coefficients
      const c0 = -0.5 * t3 + t2 - 0.5 * t;
      const c1 = 1.5 * t3 - 2.5 * t2 + 1;
      const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
      const c3 = 0.5 * t3 - 0.5 * t2;
      
      path.push([
        c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0],
        c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1],
        c0 * p0[2] + c1 * p1[2] + c2 * p2[2] + c3 * p3[2]
      ]);
    }
  }
  
  // Add last point
  path.push(points[points.length - 1]);
  
  return path;
}

/**
 * Sweep a 2D profile along a 3D path
 */
export function sweep(
  profile: Vec2[],
  path: Vec3[],
  closed: boolean = true
): SweepResult {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  const profileLen = profile.length;
  const pathLen = path.length;
  
  // Generate vertices along the path
  for (let i = 0; i < pathLen; i++) {
    const { N, B } = frenetFrame(path, i);
    const center = path[i];
    
    for (let j = 0; j < profileLen; j++) {
      const pos = transformProfile(profile[j], center, N, B);
      vertices.push(pos);
      
      // Approximate normal (pointing outward from profile center)
      const normal = normalize([
        profile[j][0] * N[0] + profile[j][1] * B[0],
        profile[j][0] * N[1] + profile[j][1] * B[1],
        profile[j][0] * N[2] + profile[j][1] * B[2]
      ]);
      normals.push(normal);
    }
  }
  
  // Generate indices for the side faces
  for (let i = 0; i < pathLen - 1; i++) {
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      
      const v0 = i * profileLen + j;
      const v1 = i * profileLen + j2;
      const v2 = (i + 1) * profileLen + j2;
      const v3 = (i + 1) * profileLen + j;
      
      // Two triangles per quad
      indices.push(v0, v1, v2);
      indices.push(v0, v2, v3);
    }
  }
  
  // Cap the ends if closed
  if (closed) {
    // Start cap
    const startCenter = vertices.length;
    vertices.push(path[0]);
    normals.push(normalize(sub(path[0], path[1])));
    
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      indices.push(startCenter, j2, j);
    }
    
    // End cap
    const endCenter = vertices.length;
    vertices.push(path[pathLen - 1]);
    normals.push(normalize(sub(path[pathLen - 1], path[pathLen - 2])));
    
    const endOffset = (pathLen - 1) * profileLen;
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      indices.push(endCenter, endOffset + j, endOffset + j2);
    }
  }
  
  return { vertices, indices, normals };
}

/**
 * Convenience function: sweep a circle along a path (pipe/tube)
 */
export function pipe(
  path: Vec3[],
  radius: number,
  segments: number = 16
): SweepResult {
  const profile = circleProfile(radius, segments);
  return sweep(profile, path, true);
}

/**
 * Convenience function: sweep a rectangle along a path
 */
export function rail(
  path: Vec3[],
  width: number,
  height: number
): SweepResult {
  const profile = rectProfile(width, height);
  return sweep(profile, path, true);
}
