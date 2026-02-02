/**
 * Revolve Engine - Create solids by rotating 2D profiles around an axis
 * 
 * Supports:
 * - Full 360° revolution (closed solid)
 * - Partial revolution (open solid)
 * - Various axis orientations
 * 
 * Profile is defined as a series of 2D points that get rotated around the axis.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RevolveProfile {
  points: Vec2[];  // 2D profile points (in the XY plane, rotated around Y by default)
}

export interface RevolveGeometry {
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

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ═══════════════════════════════════════════════════════════════
// ROTATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Rotate a point around an axis using Rodrigues' rotation formula
 */
function rotateAroundAxis(point: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalize(axis);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  
  // v' = v*cos(θ) + (k × v)*sin(θ) + k*(k·v)*(1-cos(θ))
  const kCrossV = cross(k, point);
  const kDotV = k.x * point.x + k.y * point.y + k.z * point.z;
  
  return {
    x: point.x * cosA + kCrossV.x * sinA + k.x * kDotV * (1 - cosA),
    y: point.y * cosA + kCrossV.y * sinA + k.y * kDotV * (1 - cosA),
    z: point.z * cosA + kCrossV.z * sinA + k.z * kDotV * (1 - cosA),
  };
}

/**
 * Get a perpendicular vector to the axis
 */
function getPerpendicularVector(axis: Vec3): Vec3 {
  const a = normalize(axis);
  
  // Find a vector not parallel to axis
  let temp: Vec3;
  if (Math.abs(a.x) < 0.9) {
    temp = vec3(1, 0, 0);
  } else {
    temp = vec3(0, 1, 0);
  }
  
  // Cross product gives perpendicular
  return normalize(cross(a, temp));
}

// ═══════════════════════════════════════════════════════════════
// REVOLVE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Revolve a 2D profile around an axis
 * 
 * @param profile - Array of 2D points (x = radius from axis, y = height along axis)
 * @param axis - Rotation axis as [x, y, z]
 * @param angleDegrees - Angle of rotation in degrees (360 = full revolution)
 * @param segments - Number of segments around the revolution
 * @param center - Center point of the revolution
 */
export function revolve(
  profile: Vec2[],
  axis: [number, number, number] = [0, 1, 0],
  angleDegrees: number = 360,
  segments: number = 32,
  center: [number, number, number] = [0, 0, 0]
): RevolveGeometry {
  if (profile.length < 2) {
    console.warn('Revolve profile must have at least 2 points');
    return { vertices: [], indices: [], normals: [] };
  }

  const vertices: number[][] = [];
  const indices: number[] = [];
  const normals: number[][] = [];
  
  const axisVec = normalize(vec3(axis[0], axis[1], axis[2]));
  const centerVec = vec3(center[0], center[1], center[2]);
  
  // Get perpendicular directions for profile placement
  const radialDir = getPerpendicularVector(axisVec);
  const tangentDir = normalize(cross(axisVec, radialDir));
  
  const angleRad = (angleDegrees * Math.PI) / 180;
  const isClosed = Math.abs(angleDegrees - 360) < 0.001;
  const numSegments = isClosed ? segments : segments + 1;
  
  // Generate vertices by rotating the profile
  for (let i = 0; i < numSegments; i++) {
    const angle = (i / segments) * angleRad;
    
    for (let j = 0; j < profile.length; j++) {
      const p = profile[j];
      
      // Convert 2D profile to 3D point
      // x = radius from axis, y = height along axis
      const radius = p.x;
      const height = p.y;
      
      // Start position: radius in radial direction, height along axis
      const basePoint = add(
        add(centerVec, scale(axisVec, height)),
        scale(radialDir, radius)
      );
      
      // Rotate around axis
      const relPoint = sub(basePoint, centerVec);
      const rotatedRel = rotateAroundAxis(relPoint, axisVec, angle);
      const finalPoint = add(centerVec, rotatedRel);
      
      vertices.push([finalPoint.x, finalPoint.y, finalPoint.z]);
      
      // Calculate normal (pointing outward from axis)
      const radialVec = sub(finalPoint, add(centerVec, scale(axisVec, height)));
      const normal = normalize(radialVec);
      
      // For end caps or complex profiles, normal calculation may need adjustment
      normals.push([normal.x, normal.y, normal.z]);
    }
  }
  
  // Generate indices for the surface
  const profileLen = profile.length;
  const actualSegments = isClosed ? segments : segments;
  
  for (let i = 0; i < actualSegments; i++) {
    const nextI = (i + 1) % numSegments;
    
    for (let j = 0; j < profileLen - 1; j++) {
      const a = i * profileLen + j;
      const b = i * profileLen + (j + 1);
      const c = nextI * profileLen + j;
      const d = nextI * profileLen + (j + 1);
      
      // Two triangles per quad
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  // Add end caps for partial revolutions
  if (!isClosed) {
    // Start cap
    const startCapStart = vertices.length;
    const startCenter = add(centerVec, scale(axisVec, (profile[0].y + profile[profile.length - 1].y) / 2));
    vertices.push([startCenter.x, startCenter.y, startCenter.z]);
    
    // Start cap normal (negative of the tangent at angle 0)
    const startNormal = scale(tangentDir, -1);
    normals.push([startNormal.x, startNormal.y, startNormal.z]);
    
    for (let j = 0; j < profileLen - 1; j++) {
      indices.push(j, startCapStart, j + 1);
    }
    
    // End cap
    const endCapStart = vertices.length;
    const endI = actualSegments;
    const endCenter = add(centerVec, scale(axisVec, (profile[0].y + profile[profile.length - 1].y) / 2));
    const rotatedEndCenter = add(centerVec, rotateAroundAxis(sub(endCenter, centerVec), axisVec, angleRad));
    vertices.push([rotatedEndCenter.x, rotatedEndCenter.y, rotatedEndCenter.z]);
    
    // End cap normal
    const endNormal = rotateAroundAxis(tangentDir, axisVec, angleRad);
    normals.push([endNormal.x, endNormal.y, endNormal.z]);
    
    for (let j = 0; j < profileLen - 1; j++) {
      const a = endI * profileLen + j;
      const b = endI * profileLen + (j + 1);
      indices.push(a, b, endCapStart);
    }
  }
  
  return { vertices, indices, normals };
}

// ═══════════════════════════════════════════════════════════════
// PREDEFINED PROFILES
// ═══════════════════════════════════════════════════════════════

/**
 * Create a simple rectangle profile for making a cylinder or tube
 */
export function rectangleProfile(
  innerRadius: number,
  outerRadius: number,
  height: number
): Vec2[] {
  const halfH = height / 2;
  return [
    { x: innerRadius, y: -halfH },
    { x: outerRadius, y: -halfH },
    { x: outerRadius, y: halfH },
    { x: innerRadius, y: halfH },
  ];
}

/**
 * Create a circular profile for making a torus
 */
export function circleProfile(
  majorRadius: number,
  minorRadius: number,
  segments: number = 16
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: majorRadius + minorRadius * Math.cos(angle),
      y: minorRadius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Create an L-shaped profile
 */
export function lProfile(
  width: number,
  height: number,
  thickness: number
): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: thickness },
    { x: thickness, y: thickness },
    { x: thickness, y: height },
    { x: 0, y: height },
  ];
}

/**
 * Create a wine glass profile
 */
export function wineGlassProfile(
  bowlRadius: number = 0.5,
  stemRadius: number = 0.05,
  stemHeight: number = 0.8,
  baseRadius: number = 0.4,
  baseHeight: number = 0.05,
  segments: number = 16
): Vec2[] {
  const points: Vec2[] = [];
  
  // Base (bottom to top)
  points.push({ x: 0.001, y: 0 });
  points.push({ x: baseRadius, y: 0 });
  points.push({ x: baseRadius, y: baseHeight });
  
  // Stem
  points.push({ x: stemRadius, y: baseHeight });
  points.push({ x: stemRadius, y: baseHeight + stemHeight });
  
  // Bowl (half circle-ish)
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * 0.5 + t * Math.PI;
    const r = bowlRadius;
    points.push({
      x: r * Math.cos(angle) + bowlRadius,
      y: baseHeight + stemHeight + r * Math.sin(angle) + bowlRadius,
    });
  }
  
  // Inner edge
  points.push({ x: 0.001, y: baseHeight + stemHeight + bowlRadius * 2 });
  
  return points;
}

/**
 * Create a vase profile
 */
export function vaseProfile(
  baseRadius: number = 0.3,
  neckRadius: number = 0.15,
  bodyRadius: number = 0.5,
  height: number = 1.5,
  segments: number = 20
): Vec2[] {
  const points: Vec2[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * height;
    
    // Vase profile curve
    let r: number;
    if (t < 0.1) {
      // Base
      r = baseRadius;
    } else if (t < 0.6) {
      // Body bulge
      const localT = (t - 0.1) / 0.5;
      r = baseRadius + (bodyRadius - baseRadius) * Math.sin(localT * Math.PI);
    } else if (t < 0.85) {
      // Neck narrowing
      const localT = (t - 0.6) / 0.25;
      r = bodyRadius * (1 - localT) + neckRadius * localT;
    } else {
      // Rim
      const localT = (t - 0.85) / 0.15;
      r = neckRadius + localT * 0.05;
    }
    
    points.push({ x: r, y });
  }
  
  return points;
}

// ═══════════════════════════════════════════════════════════════
// HIGH-LEVEL HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a torus (donut shape)
 */
export function createTorus(
  majorRadius: number,
  minorRadius: number,
  center: [number, number, number] = [0, 0, 0],
  axis: [number, number, number] = [0, 1, 0],
  radialSegments: number = 32,
  tubularSegments: number = 16
): RevolveGeometry {
  const profile = circleProfile(majorRadius, minorRadius, tubularSegments);
  return revolve(profile, axis, 360, radialSegments, center);
}

/**
 * Create a solid of revolution from a simple line profile
 */
export function createLathe(
  radiusPoints: number[],  // radius at each height
  heights: number[],       // corresponding heights
  center: [number, number, number] = [0, 0, 0],
  axis: [number, number, number] = [0, 1, 0],
  segments: number = 32
): RevolveGeometry {
  if (radiusPoints.length !== heights.length) {
    console.warn('radiusPoints and heights must have same length');
    return { vertices: [], indices: [], normals: [] };
  }
  
  const profile: Vec2[] = radiusPoints.map((r, i) => ({
    x: r,
    y: heights[i],
  }));
  
  return revolve(profile, axis, 360, segments, center);
}

/**
 * Create a partial pipe bend
 */
export function createPipeBend(
  innerRadius: number,
  outerRadius: number,
  bendRadius: number,
  angleDegrees: number,
  center: [number, number, number] = [0, 0, 0],
  axis: [number, number, number] = [0, 1, 0],
  segments: number = 32
): RevolveGeometry {
  const profile = rectangleProfile(
    bendRadius - (outerRadius - innerRadius) / 2,
    bendRadius + (outerRadius - innerRadius) / 2,
    outerRadius - innerRadius
  );
  return revolve(profile, axis, angleDegrees, segments, center);
}
