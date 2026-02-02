/**
 * Simple Shell Box Implementation
 * Creates a hollow box with optional open faces
 */

export interface ShellResult {
  vertices: number[][];
  indices: number[];
}

/**
 * Create a shell (hollow) box
 * @param size - [width, height, depth]
 * @param center - [x, y, z]
 * @param thickness - wall thickness (inward)
 * @param openFaces - face indices to leave open (0-5)
 *   0: back (-Z), 1: front (+Z), 2: bottom (-Y), 3: top (+Y), 4: left (-X), 5: right (+X)
 */
export function shellBoxSimple(
  size: [number, number, number],
  center: [number, number, number],
  thickness: number,
  openFaces: number[] = []
): ShellResult {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  
  // Clamp thickness
  const t = Math.min(thickness, Math.min(hx, hy, hz) * 0.9);
  
  const vertices: number[][] = [];
  const indices: number[] = [];
  const openSet = new Set(openFaces);
  
  // Outer box corners
  const outer = [
    [cx - hx, cy - hy, cz - hz], // 0: back-bottom-left
    [cx + hx, cy - hy, cz - hz], // 1: back-bottom-right
    [cx + hx, cy + hy, cz - hz], // 2: back-top-right
    [cx - hx, cy + hy, cz - hz], // 3: back-top-left
    [cx - hx, cy - hy, cz + hz], // 4: front-bottom-left
    [cx + hx, cy - hy, cz + hz], // 5: front-bottom-right
    [cx + hx, cy + hy, cz + hz], // 6: front-top-right
    [cx - hx, cy + hy, cz + hz], // 7: front-top-left
  ];
  
  // Inner box corners
  const ihx = hx - t;
  const ihy = hy - t;
  const ihz = hz - t;
  const inner = [
    [cx - ihx, cy - ihy, cz - ihz], // 0
    [cx + ihx, cy - ihy, cz - ihz], // 1
    [cx + ihx, cy + ihy, cz - ihz], // 2
    [cx - ihx, cy + ihy, cz - ihz], // 3
    [cx - ihx, cy - ihy, cz + ihz], // 4
    [cx + ihx, cy - ihy, cz + ihz], // 5
    [cx + ihx, cy + ihy, cz + ihz], // 6
    [cx - ihx, cy + ihy, cz + ihz], // 7
  ];
  
  // Face definitions: [v0, v1, v2, v3] in CCW order when viewed from outside
  const faces = [
    { idx: 0, verts: [0, 1, 2, 3] }, // back (-Z)
    { idx: 1, verts: [5, 4, 7, 6] }, // front (+Z)
    { idx: 2, verts: [4, 5, 1, 0] }, // bottom (-Y)
    { idx: 3, verts: [3, 2, 6, 7] }, // top (+Y)
    { idx: 4, verts: [4, 0, 3, 7] }, // left (-X)
    { idx: 5, verts: [1, 5, 6, 2] }, // right (+X)
  ];
  
  // Helper to add a quad (2 triangles)
  const addQuad = (v0: number[], v1: number[], v2: number[], v3: number[]) => {
    const base = vertices.length;
    vertices.push(v0, v1, v2, v3);
    // CCW: 0-1-2, 0-2-3
    indices.push(base, base + 1, base + 2);
    indices.push(base, base + 2, base + 3);
  };
  
  // Helper to add a quad with reversed winding (for inner faces)
  const addQuadReversed = (v0: number[], v1: number[], v2: number[], v3: number[]) => {
    const base = vertices.length;
    vertices.push(v0, v1, v2, v3);
    // CW: 0-2-1, 0-3-2
    indices.push(base, base + 2, base + 1);
    indices.push(base, base + 3, base + 2);
  };
  
  for (const face of faces) {
    const [i0, i1, i2, i3] = face.verts;
    
    if (openSet.has(face.idx)) {
      // Open face: add connecting walls between outer and inner edges
      // 4 walls around the opening
      
      // Wall 1: i0-i1 edge
      addQuad(outer[i0], outer[i1], inner[i1], inner[i0]);
      // Wall 2: i1-i2 edge
      addQuad(outer[i1], outer[i2], inner[i2], inner[i1]);
      // Wall 3: i2-i3 edge
      addQuad(outer[i2], outer[i3], inner[i3], inner[i2]);
      // Wall 4: i3-i0 edge
      addQuad(outer[i3], outer[i0], inner[i0], inner[i3]);
    } else {
      // Closed face: add outer face and inner face
      addQuad(outer[i0], outer[i1], outer[i2], outer[i3]);
      addQuadReversed(inner[i0], inner[i1], inner[i2], inner[i3]);
    }
  }
  
  return { vertices, indices };
}
