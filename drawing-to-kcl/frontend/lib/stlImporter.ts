/**
 * STL Importer - Parse STL files and convert to KCL-compatible geometry
 * Supports both ASCII and Binary STL formats
 */

interface ImportedMesh {
  vertices: [number, number, number][];
  indices: number[];
  normals: [number, number, number][];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

interface STLTriangle {
  normal: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}

/**
 * Detect if STL data is binary or ASCII
 */
function isBinarySTL(data: ArrayBuffer): boolean {
  // Binary STL has 80-byte header + 4-byte triangle count
  // ASCII starts with "solid"
  const view = new DataView(data);
  
  // Check if it starts with "solid" (ASCII)
  const header = new Uint8Array(data, 0, 5);
  const headerStr = String.fromCharCode(...header);
  
  if (headerStr !== 'solid') {
    return true;
  }
  
  // Could still be binary with "solid" in header
  // Check if file size matches binary format
  if (data.byteLength < 84) {
    return false; // Too small to be binary
  }
  
  const numTriangles = view.getUint32(80, true);
  const expectedSize = 84 + numTriangles * 50;
  
  // If size matches binary format, it's likely binary
  if (Math.abs(data.byteLength - expectedSize) < 10) {
    return true;
  }
  
  return false;
}

/**
 * Parse ASCII STL format
 */
function parseASCII(text: string): STLTriangle[] {
  const triangles: STLTriangle[] = [];
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentTriangle: Partial<STLTriangle> | null = null;
  let vertexIndex = 0;
  
  for (const line of lines) {
    const parts = line.split(/\s+/);
    
    if (parts[0] === 'facet' && parts[1] === 'normal') {
      currentTriangle = {
        normal: [
          parseFloat(parts[2]),
          parseFloat(parts[3]),
          parseFloat(parts[4])
        ]
      };
      vertexIndex = 0;
    } else if (parts[0] === 'vertex' && currentTriangle) {
      const vertex: [number, number, number] = [
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ];
      
      if (vertexIndex === 0) currentTriangle.v1 = vertex;
      else if (vertexIndex === 1) currentTriangle.v2 = vertex;
      else if (vertexIndex === 2) currentTriangle.v3 = vertex;
      
      vertexIndex++;
    } else if (parts[0] === 'endfacet' && currentTriangle) {
      if (currentTriangle.normal && currentTriangle.v1 && currentTriangle.v2 && currentTriangle.v3) {
        triangles.push(currentTriangle as STLTriangle);
      }
      currentTriangle = null;
    }
  }
  
  return triangles;
}

/**
 * Parse Binary STL format
 */
function parseBinary(data: ArrayBuffer): STLTriangle[] {
  const triangles: STLTriangle[] = [];
  const view = new DataView(data);
  
  // Skip 80-byte header
  const numTriangles = view.getUint32(80, true);
  
  let offset = 84;
  
  for (let i = 0; i < numTriangles; i++) {
    const normal: [number, number, number] = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true)
    ];
    
    const v1: [number, number, number] = [
      view.getFloat32(offset + 12, true),
      view.getFloat32(offset + 16, true),
      view.getFloat32(offset + 20, true)
    ];
    
    const v2: [number, number, number] = [
      view.getFloat32(offset + 24, true),
      view.getFloat32(offset + 28, true),
      view.getFloat32(offset + 32, true)
    ];
    
    const v3: [number, number, number] = [
      view.getFloat32(offset + 36, true),
      view.getFloat32(offset + 40, true),
      view.getFloat32(offset + 44, true)
    ];
    
    triangles.push({ normal, v1, v2, v3 });
    
    offset += 50; // 48 bytes for triangle + 2 bytes attribute
  }
  
  return triangles;
}

/**
 * Convert triangles to indexed mesh format
 */
function trianglesToMesh(triangles: STLTriangle[]): ImportedMesh {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const normals: [number, number, number][] = [];
  
  // Simple vertex map for deduplication
  const vertexMap = new Map<string, number>();
  
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  
  function getVertexIndex(v: [number, number, number], n: [number, number, number]): number {
    // Round to avoid floating point issues
    const key = `${v[0].toFixed(6)},${v[1].toFixed(6)},${v[2].toFixed(6)}`;
    
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }
    
    const index = vertices.length;
    vertices.push(v);
    normals.push(n);
    vertexMap.set(key, index);
    
    // Update bounding box
    min[0] = Math.min(min[0], v[0]);
    min[1] = Math.min(min[1], v[1]);
    min[2] = Math.min(min[2], v[2]);
    max[0] = Math.max(max[0], v[0]);
    max[1] = Math.max(max[1], v[1]);
    max[2] = Math.max(max[2], v[2]);
    
    return index;
  }
  
  for (const tri of triangles) {
    const i1 = getVertexIndex(tri.v1, tri.normal);
    const i2 = getVertexIndex(tri.v2, tri.normal);
    const i3 = getVertexIndex(tri.v3, tri.normal);
    
    indices.push(i1, i2, i3);
  }
  
  return {
    vertices,
    indices,
    normals,
    boundingBox: { min, max }
  };
}

/**
 * Import STL file from ArrayBuffer
 */
export function importSTL(data: ArrayBuffer): ImportedMesh {
  let triangles: STLTriangle[];
  
  if (isBinarySTL(data)) {
    triangles = parseBinary(data);
  } else {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(data);
    triangles = parseASCII(text);
  }
  
  if (triangles.length === 0) {
    throw new Error('No triangles found in STL file');
  }
  
  return trianglesToMesh(triangles);
}

/**
 * Import STL from File object
 */
export async function importSTLFile(file: File): Promise<ImportedMesh> {
  const buffer = await file.arrayBuffer();
  return importSTL(buffer);
}

/**
 * Convert imported mesh to simple KCL representation
 * Returns approximate primitives that match the mesh
 */
export function meshToApproximateKCL(mesh: ImportedMesh, name: string = 'imported'): string {
  const { boundingBox } = mesh;
  const { min, max } = boundingBox;
  
  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2]
  ];
  
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2
  ];
  
  // Determine if it's more like a box, cylinder, or sphere based on dimensions
  const aspectRatioXY = size[0] / size[1];
  const aspectRatioXZ = size[0] / size[2];
  const aspectRatioYZ = size[1] / size[2];
  
  // Check if roughly cubic/spherical
  const isCubic = Math.abs(aspectRatioXY - 1) < 0.3 && 
                  Math.abs(aspectRatioXZ - 1) < 0.3 && 
                  Math.abs(aspectRatioYZ - 1) < 0.3;
  
  // For now, approximate as a box (future: smarter detection)
  return `// Imported from STL: ${name}
// Original mesh: ${mesh.vertices.length} vertices, ${mesh.indices.length / 3} triangles
// Bounding box approximation:
let ${name} = box(size: [${size[0].toFixed(3)}, ${size[1].toFixed(3)}, ${size[2].toFixed(3)}], center: [${center[0].toFixed(3)}, ${center[1].toFixed(3)}, ${center[2].toFixed(3)}])`;
}

/**
 * Get mesh statistics
 */
export function getMeshStats(mesh: ImportedMesh): {
  vertexCount: number;
  triangleCount: number;
  boundingBoxSize: [number, number, number];
  volume: number;
} {
  const { vertices, indices, boundingBox } = mesh;
  const { min, max } = boundingBox;
  
  // Approximate volume using bounding box
  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2]
  ];
  
  return {
    vertexCount: vertices.length,
    triangleCount: indices.length / 3,
    boundingBoxSize: size,
    volume: size[0] * size[1] * size[2]
  };
}

/**
 * Normalize mesh to fit within unit cube centered at origin
 */
export function normalizeMesh(mesh: ImportedMesh): ImportedMesh {
  const { vertices, indices, normals, boundingBox } = mesh;
  const { min, max } = boundingBox;
  
  const size = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2]
  ];
  
  const maxDim = Math.max(...size);
  const scale = maxDim > 0 ? 1 / maxDim : 1;
  
  const center = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2
  ];
  
  const normalizedVertices = vertices.map(v => [
    (v[0] - center[0]) * scale,
    (v[1] - center[1]) * scale,
    (v[2] - center[2]) * scale
  ] as [number, number, number]);
  
  return {
    vertices: normalizedVertices,
    indices,
    normals,
    boundingBox: {
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5]
    }
  };
}
