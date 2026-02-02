/**
 * Advanced Primitives - Torus, Helix
 */

export interface GeometryResult {
  vertices: number[][];
  indices: number[];
}

/**
 * Create a torus (donut shape)
 * @param majorRadius - distance from center to tube center
 * @param minorRadius - tube radius
 * @param center - [x, y, z]
 * @param majorSegments - segments around the main ring
 * @param minorSegments - segments around the tube
 */
export function torus(
  majorRadius: number,
  minorRadius: number,
  center: [number, number, number] = [0, 0, 0],
  majorSegments: number = 32,
  minorSegments: number = 16
): GeometryResult {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const [cx, cy, cz] = center;

  // Generate vertices
  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;

      vertices.push([cx + x, cy + y, cz + z]);
    }
  }

  // Generate indices
  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * (minorSegments + 1) + j;
      const b = a + minorSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { vertices, indices };
}

/**
 * Create a helix (spiral)
 * @param radius - helix radius
 * @param pitch - height per turn
 * @param turns - number of turns
 * @param tubeRadius - tube cross-section radius
 * @param center - [x, y, z]
 * @param segments - segments per turn
 * @param tubeSegments - tube cross-section segments
 */
export function helix(
  radius: number,
  pitch: number,
  turns: number,
  tubeRadius: number,
  center: [number, number, number] = [0, 0, 0],
  segments: number = 32,
  tubeSegments: number = 8
): GeometryResult {
  const vertices: number[][] = [];
  const indices: number[] = [];
  const [cx, cy, cz] = center;

  const totalSegments = Math.floor(segments * turns);
  const totalHeight = pitch * turns;

  // Generate vertices along helix path with tube cross-section
  for (let i = 0; i <= totalSegments; i++) {
    const t = i / totalSegments;
    const angle = t * turns * Math.PI * 2;
    const height = t * totalHeight;

    // Helix center point
    const hx = radius * Math.cos(angle);
    const hz = radius * Math.sin(angle);
    const hy = height;

    // Tangent vector (derivative of helix)
    const tx = -radius * Math.sin(angle);
    const ty = pitch / (Math.PI * 2);
    const tz = radius * Math.cos(angle);
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);

    // Normal (pointing outward from axis)
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    const ny = 0;

    // Binormal
    const bx = (ty * nz - tz * ny) / tLen;
    const by = (tz * nx - tx * nz) / tLen;
    const bz = (tx * ny - ty * nx) / tLen;

    // Generate tube cross-section
    for (let j = 0; j <= tubeSegments; j++) {
      const v = (j / tubeSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      // Point on tube surface
      const px = hx + tubeRadius * (cosV * nx + sinV * bx);
      const py = hy + tubeRadius * (cosV * ny + sinV * by);
      const pz = hz + tubeRadius * (cosV * nz + sinV * bz);

      vertices.push([cx + px, cy + py, cz + pz]);
    }
  }

  // Generate indices
  for (let i = 0; i < totalSegments; i++) {
    for (let j = 0; j < tubeSegments; j++) {
      const a = i * (tubeSegments + 1) + j;
      const b = a + tubeSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { vertices, indices };
}
