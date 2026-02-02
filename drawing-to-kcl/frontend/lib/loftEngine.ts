/**
 * Loft Engine - Connect multiple profiles to create smooth surfaces
 * Creates 3D geometry by interpolating between 2D cross-sections
 */

type Vec3 = [number, number, number];
type Vec2 = [number, number];

interface LoftResult {
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
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two 3D points
 */
function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  ];
}

/**
 * Resample a profile to have a specific number of points
 */
function resampleProfile(profile: Vec3[], targetCount: number): Vec3[] {
  if (profile.length === targetCount) return profile;
  
  const result: Vec3[] = [];
  const step = (profile.length - 1) / (targetCount - 1);
  
  for (let i = 0; i < targetCount; i++) {
    const idx = i * step;
    const idx0 = Math.floor(idx);
    const idx1 = Math.min(idx0 + 1, profile.length - 1);
    const t = idx - idx0;
    
    result.push(lerpVec3(profile[idx0], profile[idx1], t));
  }
  
  return result;
}

/**
 * Generate a circle profile in 3D at a given position
 */
export function circleProfile3D(
  center: Vec3,
  radius: number,
  normal: Vec3 = [0, 0, 1],
  segments: number = 16
): Vec3[] {
  const profile: Vec3[] = [];
  
  // Create orthonormal basis
  const n = normalize(normal);
  let up: Vec3 = [0, 1, 0];
  if (Math.abs(n[1]) > 0.9) up = [1, 0, 0];
  
  const u = normalize(cross(up, n));
  const v = cross(n, u);
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle) * radius;
    const sin = Math.sin(angle) * radius;
    
    profile.push([
      center[0] + cos * u[0] + sin * v[0],
      center[1] + cos * u[1] + sin * v[1],
      center[2] + cos * u[2] + sin * v[2]
    ]);
  }
  
  return profile;
}

/**
 * Generate a rectangle profile in 3D
 */
export function rectProfile3D(
  center: Vec3,
  width: number,
  height: number,
  normal: Vec3 = [0, 0, 1]
): Vec3[] {
  const n = normalize(normal);
  let up: Vec3 = [0, 1, 0];
  if (Math.abs(n[1]) > 0.9) up = [1, 0, 0];
  
  const u = normalize(cross(up, n));
  const v = cross(n, u);
  
  const hw = width / 2;
  const hh = height / 2;
  
  return [
    [
      center[0] - hw * u[0] - hh * v[0],
      center[1] - hw * u[1] - hh * v[1],
      center[2] - hw * u[2] - hh * v[2]
    ],
    [
      center[0] + hw * u[0] - hh * v[0],
      center[1] + hw * u[1] - hh * v[1],
      center[2] + hw * u[2] - hh * v[2]
    ],
    [
      center[0] + hw * u[0] + hh * v[0],
      center[1] + hw * u[1] + hh * v[1],
      center[2] + hw * u[2] + hh * v[2]
    ],
    [
      center[0] - hw * u[0] + hh * v[0],
      center[1] - hw * u[1] + hh * v[1],
      center[2] - hw * u[2] + hh * v[2]
    ]
  ];
}

/**
 * Loft between multiple 3D profiles
 * Profiles should have the same number of points, or will be resampled
 */
export function loft(
  profiles: Vec3[][],
  closed: boolean = true,
  interpolationSteps: number = 1
): LoftResult {
  if (profiles.length < 2) {
    throw new Error('Loft requires at least 2 profiles');
  }
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  // Find maximum profile point count and resample all profiles
  const maxPoints = Math.max(...profiles.map(p => p.length));
  const resampledProfiles = profiles.map(p => resampleProfile(p, maxPoints));
  
  // Generate interpolated profiles if needed
  const allProfiles: Vec3[][] = [];
  
  for (let i = 0; i < resampledProfiles.length - 1; i++) {
    allProfiles.push(resampledProfiles[i]);
    
    // Add interpolation steps between profiles
    for (let step = 1; step <= interpolationSteps; step++) {
      const t = step / (interpolationSteps + 1);
      const interpProfile: Vec3[] = [];
      
      for (let j = 0; j < maxPoints; j++) {
        interpProfile.push(lerpVec3(
          resampledProfiles[i][j],
          resampledProfiles[i + 1][j],
          t
        ));
      }
      
      allProfiles.push(interpProfile);
    }
  }
  allProfiles.push(resampledProfiles[resampledProfiles.length - 1]);
  
  const profileLen = maxPoints;
  const numProfiles = allProfiles.length;
  
  // Generate vertices from all profiles
  for (let i = 0; i < numProfiles; i++) {
    for (let j = 0; j < profileLen; j++) {
      vertices.push(allProfiles[i][j]);
      
      // Calculate normal (approximate)
      const prev = allProfiles[i][(j - 1 + profileLen) % profileLen];
      const curr = allProfiles[i][j];
      const next = allProfiles[i][(j + 1) % profileLen];
      
      const edge1 = sub(next, curr);
      const edge2 = sub(prev, curr);
      const normal = normalize(cross(edge1, edge2));
      normals.push(normal);
    }
  }
  
  // Generate indices for side faces
  for (let i = 0; i < numProfiles - 1; i++) {
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      
      const v0 = i * profileLen + j;
      const v1 = i * profileLen + j2;
      const v2 = (i + 1) * profileLen + j2;
      const v3 = (i + 1) * profileLen + j;
      
      indices.push(v0, v1, v2);
      indices.push(v0, v2, v3);
    }
  }
  
  // Cap ends if closed
  if (closed) {
    // Calculate center of first profile
    let startCenter: Vec3 = [0, 0, 0];
    for (const p of allProfiles[0]) {
      startCenter[0] += p[0];
      startCenter[1] += p[1];
      startCenter[2] += p[2];
    }
    startCenter[0] /= profileLen;
    startCenter[1] /= profileLen;
    startCenter[2] /= profileLen;
    
    const startCenterIdx = vertices.length;
    vertices.push(startCenter);
    
    // Calculate start cap normal
    const startNormal = normalize(cross(
      sub(allProfiles[0][1], allProfiles[0][0]),
      sub(allProfiles[0][2], allProfiles[0][0])
    ));
    normals.push([-startNormal[0], -startNormal[1], -startNormal[2]]);
    
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      indices.push(startCenterIdx, j2, j);
    }
    
    // Calculate center of last profile
    let endCenter: Vec3 = [0, 0, 0];
    const lastProfile = allProfiles[numProfiles - 1];
    for (const p of lastProfile) {
      endCenter[0] += p[0];
      endCenter[1] += p[1];
      endCenter[2] += p[2];
    }
    endCenter[0] /= profileLen;
    endCenter[1] /= profileLen;
    endCenter[2] /= profileLen;
    
    const endCenterIdx = vertices.length;
    vertices.push(endCenter);
    
    const endNormal = normalize(cross(
      sub(lastProfile[1], lastProfile[0]),
      sub(lastProfile[2], lastProfile[0])
    ));
    normals.push(endNormal);
    
    const endOffset = (numProfiles - 1) * profileLen;
    for (let j = 0; j < profileLen; j++) {
      const j2 = (j + 1) % profileLen;
      indices.push(endCenterIdx, endOffset + j, endOffset + j2);
    }
  }
  
  return { vertices, indices, normals };
}

/**
 * Convenience: Loft between circles of different sizes (cone-like)
 */
export function loftCircles(
  centers: Vec3[],
  radii: number[],
  segments: number = 16,
  interpolationSteps: number = 2
): LoftResult {
  if (centers.length !== radii.length) {
    throw new Error('Centers and radii must have the same length');
  }
  
  const profiles: Vec3[][] = [];
  
  for (let i = 0; i < centers.length; i++) {
    // Calculate normal direction
    let normal: Vec3;
    if (i === 0) {
      normal = normalize(sub(centers[1], centers[0]));
    } else if (i === centers.length - 1) {
      normal = normalize(sub(centers[i], centers[i - 1]));
    } else {
      normal = normalize(sub(centers[i + 1], centers[i - 1]));
    }
    
    profiles.push(circleProfile3D(centers[i], radii[i], normal, segments));
  }
  
  return loft(profiles, true, interpolationSteps);
}

/**
 * Convenience: Loft from rectangle to circle (transition)
 */
export function loftRectToCircle(
  rectCenter: Vec3,
  rectWidth: number,
  rectHeight: number,
  circleCenter: Vec3,
  circleRadius: number,
  segments: number = 16,
  interpolationSteps: number = 3
): LoftResult {
  const direction = normalize(sub(circleCenter, rectCenter));
  
  // Create rectangle profile with same number of points as circle
  const rectProfile = rectProfile3D(rectCenter, rectWidth, rectHeight, direction);
  const circProfile = circleProfile3D(circleCenter, circleRadius, direction, segments);
  
  // Resample rectangle to match circle point count
  const resampledRect = resampleProfile(rectProfile, segments);
  
  return loft([resampledRect, circProfile], true, interpolationSteps);
}
