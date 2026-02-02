/**
 * Pure math utilities for bounding box and camera parameters (no WebGL).
 */

export type Vec3 = [number, number, number];

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  radius: number;
}

export function computeBoundingBox(vertices: Vec3[]): BoundingBox | null {
  if (vertices.length === 0) return null;
  let minX = vertices[0][0];
  let minY = vertices[0][1];
  let minZ = vertices[0][2];
  let maxX = minX;
  let maxY = minY;
  let maxZ = minZ;
  for (let i = 1; i < vertices.length; i++) {
    const [x, y, z] = vertices[i];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const center: Vec3 = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ];
  const half = [(maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2];
  const radius = Math.sqrt(half[0] * half[0] + half[1] * half[1] + half[2] * half[2]);
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    radius,
  };
}

export interface CameraParams {
  position: Vec3;
  near: number;
  far: number;
  lookAt: Vec3;
}

export function computeCameraForBounds(bounds: BoundingBox, aspect: number): CameraParams {
  const radius = Math.max(bounds.radius, 0.01);
  const distance = Math.max(radius * 2, 1);
  const fov = 50 * (Math.PI / 180);
  const halfHeight = radius;
  const halfWidth = halfHeight * aspect;
  const dist = Math.max(halfHeight / Math.tan(fov / 2), distance);
  const position: Vec3 = [
    bounds.center[0] + dist * 0.5,
    bounds.center[1] + dist * 0.5,
    bounds.center[2] + dist * 0.5,
  ];
  const near = bounds.radius <= 0 ? 0.01 : Math.min(0.1, radius / 100);
  const far = Math.max(bounds.radius * 4, near + 1);
  return {
    position,
    near,
    far,
    lookAt: bounds.center,
  };
}
