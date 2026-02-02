/**
 * Build geometry spec from KCL code: parse primitives and operations
 * Supported:
 * - box(size: [...], center: [...])
 * - cylinder(radius: n, height: n, center: [...])
 * - sphere(radius: n, center: [...])
 * - cone(radius: n, height: n, center: [...])
 * - extrude(source.face.direction, distance: n)
 * - fillet(source.edge[n], radius: n)
 */

import type { 
  GeometrySpec, 
  BoxSpec, 
  CylinderSpec, 
  SphereSpec, 
  ConeSpec,
  ExtrudeSpec,
  FilletSpec 
} from '@/lib/types/geometrySpec';

// ═══════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════

// Box: let name = box(size: [x, y, z], center: [x, y, z])
const BOX_REG =
  /let\s+(\w+)\s*=\s*box\s*\(\s*size\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Cylinder: let name = cylinder(radius: n, height: n, center: [x, y, z])
const CYLINDER_REG =
  /let\s+(\w+)\s*=\s*cylinder\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*height\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Sphere: let name = sphere(radius: n, center: [x, y, z])
const SPHERE_REG =
  /let\s+(\w+)\s*=\s*sphere\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Cone: let name = cone(radius: n, height: n, center: [x, y, z])
const CONE_REG =
  /let\s+(\w+)\s*=\s*cone\s*\(\s*radius\s*:\s*([-\d.e]+)\s*,\s*height\s*:\s*([-\d.e]+)\s*,\s*center\s*:\s*\[\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*,\s*([-\d.e]+)\s*]\s*\)/gi;

// Extrude: let name = extrude(source.face.direction, distance: n)
const EXTRUDE_REG =
  /let\s+(\w+)\s*=\s*extrude\s*\(\s*(\w+)\.face\.(top|bottom|left|right|front|back)\s*,\s*distance\s*:\s*([-\d.e]+)\s*\)/gi;

// Fillet: let name = fillet(source.edge[n], radius: n)
const FILLET_REG =
  /let\s+(\w+)\s*=\s*fillet\s*\(\s*(\w+)\.edge\[(\d+)\]\s*,\s*radius\s*:\s*([-\d.e]+)\s*\)/gi;

// Geom comment for inline definitions
const GEOM_COMMENT = /#\s*geom:\s*(.+)/gi;

// ═══════════════════════════════════════════════════════════════
// PARSE HELPERS
// ═══════════════════════════════════════════════════════════════

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractBoxFromLine(line: string): BoxSpec | null {
  BOX_REG.lastIndex = 0;
  const m = BOX_REG.exec(line);
  if (!m) return null;
  const [, name, s1, s2, s3, c1, c2, c3] = m;
  if (!name) return null;
  const size: [number, number, number] = [parseNum(s1!), parseNum(s2!), parseNum(s3!)];
  const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
  if (size.some(Number.isNaN) || center.some(Number.isNaN)) return null;
  return { id: `solid:${name}`, size, center };
}

function extractCylinderFromLine(line: string): CylinderSpec | null {
  CYLINDER_REG.lastIndex = 0;
  const m = CYLINDER_REG.exec(line);
  if (!m) return null;
  const [, name, r, h, c1, c2, c3] = m;
  if (!name) return null;
  const radius = parseNum(r!);
  const height = parseNum(h!);
  const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
  if (Number.isNaN(radius) || Number.isNaN(height) || center.some(Number.isNaN)) return null;
  return { id: `solid:${name}`, radius, height, center };
}

function extractSphereFromLine(line: string): SphereSpec | null {
  SPHERE_REG.lastIndex = 0;
  const m = SPHERE_REG.exec(line);
  if (!m) return null;
  const [, name, r, c1, c2, c3] = m;
  if (!name) return null;
  const radius = parseNum(r!);
  const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
  if (Number.isNaN(radius) || center.some(Number.isNaN)) return null;
  return { id: `solid:${name}`, radius, center };
}

function extractConeFromLine(line: string): ConeSpec | null {
  CONE_REG.lastIndex = 0;
  const m = CONE_REG.exec(line);
  if (!m) return null;
  const [, name, r, h, c1, c2, c3] = m;
  if (!name) return null;
  const radius = parseNum(r!);
  const height = parseNum(h!);
  const center: [number, number, number] = [parseNum(c1!), parseNum(c2!), parseNum(c3!)];
  if (Number.isNaN(radius) || Number.isNaN(height) || center.some(Number.isNaN)) return null;
  return { id: `solid:${name}`, radius, height, center };
}

function extractExtrudeFromLine(line: string): ExtrudeSpec | null {
  EXTRUDE_REG.lastIndex = 0;
  const m = EXTRUDE_REG.exec(line);
  if (!m) return null;
  const [, name, source, face, dist] = m;
  if (!name || !source || !face) return null;
  const distance = parseNum(dist!);
  if (Number.isNaN(distance)) return null;
  return { 
    id: `solid:${name}`, 
    sourceId: `solid:${source}`, 
    face: face as 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
    distance 
  };
}

function extractFilletFromLine(line: string): FilletSpec | null {
  FILLET_REG.lastIndex = 0;
  const m = FILLET_REG.exec(line);
  if (!m) return null;
  const [, name, source, edgeIdx, r] = m;
  if (!name || !source) return null;
  const edgeIndex = parseInt(edgeIdx!, 10);
  const radius = parseNum(r!);
  if (Number.isNaN(edgeIndex) || Number.isNaN(radius)) return null;
  return { 
    id: `solid:${name}`, 
    sourceId: `solid:${source}`, 
    edgeIndex, 
    radius 
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function buildGeometrySpecFromKcl(kclCode: string): GeometrySpec {
  const artifacts: string[] = [];
  const boxes: BoxSpec[] = [];
  const cylinders: CylinderSpec[] = [];
  const spheres: SphereSpec[] = [];
  const cones: ConeSpec[] = [];
  const extrudes: ExtrudeSpec[] = [];
  const fillets: FilletSpec[] = [];
  const seen = new Set<string>();

  const lines = kclCode.split('\n');
  
  for (const line of lines) {
    // Try to parse each primitive type
    
    // Box
    const box = extractBoxFromLine(line);
    if (box && !seen.has(box.id)) {
      seen.add(box.id);
      artifacts.push(box.id);
      boxes.push(box);
      continue;
    }
    
    // Cylinder
    const cyl = extractCylinderFromLine(line);
    if (cyl && !seen.has(cyl.id)) {
      seen.add(cyl.id);
      artifacts.push(cyl.id);
      cylinders.push(cyl);
      continue;
    }
    
    // Sphere
    const sphere = extractSphereFromLine(line);
    if (sphere && !seen.has(sphere.id)) {
      seen.add(sphere.id);
      artifacts.push(sphere.id);
      spheres.push(sphere);
      continue;
    }
    
    // Cone
    const cone = extractConeFromLine(line);
    if (cone && !seen.has(cone.id)) {
      seen.add(cone.id);
      artifacts.push(cone.id);
      cones.push(cone);
      continue;
    }
    
    // Extrude
    const ext = extractExtrudeFromLine(line);
    if (ext && !seen.has(ext.id)) {
      seen.add(ext.id);
      extrudes.push(ext);
      continue;
    }
    
    // Fillet
    const fillet = extractFilletFromLine(line);
    if (fillet && !seen.has(fillet.id)) {
      seen.add(fillet.id);
      fillets.push(fillet);
      continue;
    }
  }

  // Also check geom comments
  GEOM_COMMENT.lastIndex = 0;
  let geomMatch: RegExpExecArray | null;
  while ((geomMatch = GEOM_COMMENT.exec(kclCode)) !== null) {
    const inner = geomMatch[1].trim();
    
    const box = extractBoxFromLine(inner);
    if (box && !seen.has(box.id)) {
      seen.add(box.id);
      artifacts.push(box.id);
      boxes.push(box);
      continue;
    }
    
    const cyl = extractCylinderFromLine(inner);
    if (cyl && !seen.has(cyl.id)) {
      seen.add(cyl.id);
      artifacts.push(cyl.id);
      cylinders.push(cyl);
      continue;
    }
    
    const sphere = extractSphereFromLine(inner);
    if (sphere && !seen.has(sphere.id)) {
      seen.add(sphere.id);
      artifacts.push(sphere.id);
      spheres.push(sphere);
      continue;
    }
    
    const cone = extractConeFromLine(inner);
    if (cone && !seen.has(cone.id)) {
      seen.add(cone.id);
      artifacts.push(cone.id);
      cones.push(cone);
    }
  }

  return { artifacts, boxes, cylinders, spheres, cones, extrudes, fillets };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS (STL/STEP)
// ═══════════════════════════════════════════════════════════════

export interface MeshData {
  vertices: number[][];
  indices: number[];
}

/**
 * Export mesh to STL format (ASCII)
 */
export function exportToSTL(meshes: MeshData[], name: string = 'model'): string {
  let stl = `solid ${name}\n`;
  
  for (const mesh of meshes) {
    const { vertices, indices } = mesh;
    
    for (let i = 0; i < indices.length; i += 3) {
      const v0 = vertices[indices[i]];
      const v1 = vertices[indices[i + 1]];
      const v2 = vertices[indices[i + 2]];
      
      if (!v0 || !v1 || !v2) continue;
      
      // Calculate face normal
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      
      stl += `  facet normal ${(nx/len).toExponential(6)} ${(ny/len).toExponential(6)} ${(nz/len).toExponential(6)}\n`;
      stl += `    outer loop\n`;
      stl += `      vertex ${v0[0].toExponential(6)} ${v0[1].toExponential(6)} ${v0[2].toExponential(6)}\n`;
      stl += `      vertex ${v1[0].toExponential(6)} ${v1[1].toExponential(6)} ${v1[2].toExponential(6)}\n`;
      stl += `      vertex ${v2[0].toExponential(6)} ${v2[1].toExponential(6)} ${v2[2].toExponential(6)}\n`;
      stl += `    endloop\n`;
      stl += `  endfacet\n`;
    }
  }
  
  stl += `endsolid ${name}\n`;
  return stl;
}

/**
 * Export mesh to binary STL format
 */
export function exportToSTLBinary(meshes: MeshData[]): ArrayBuffer {
  // Count total triangles
  let triangleCount = 0;
  for (const mesh of meshes) {
    triangleCount += mesh.indices.length / 3;
  }
  
  // Binary STL format:
  // 80 bytes header
  // 4 bytes triangle count (uint32)
  // For each triangle: 12 bytes normal, 36 bytes vertices (3x3 floats), 2 bytes attribute
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write header (80 bytes)
  const header = 'Binary STL exported from FORGE 3D Editor';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  
  // Write triangle count
  view.setUint32(80, triangleCount, true);
  
  let offset = 84;
  
  for (const mesh of meshes) {
    const { vertices, indices } = mesh;
    
    for (let i = 0; i < indices.length; i += 3) {
      const v0 = vertices[indices[i]];
      const v1 = vertices[indices[i + 1]];
      const v2 = vertices[indices[i + 2]];
      
      if (!v0 || !v1 || !v2) continue;
      
      // Calculate face normal
      const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
      const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      
      // Write normal
      view.setFloat32(offset, nx / len, true); offset += 4;
      view.setFloat32(offset, ny / len, true); offset += 4;
      view.setFloat32(offset, nz / len, true); offset += 4;
      
      // Write vertices
      view.setFloat32(offset, v0[0], true); offset += 4;
      view.setFloat32(offset, v0[1], true); offset += 4;
      view.setFloat32(offset, v0[2], true); offset += 4;
      
      view.setFloat32(offset, v1[0], true); offset += 4;
      view.setFloat32(offset, v1[1], true); offset += 4;
      view.setFloat32(offset, v1[2], true); offset += 4;
      
      view.setFloat32(offset, v2[0], true); offset += 4;
      view.setFloat32(offset, v2[1], true); offset += 4;
      view.setFloat32(offset, v2[2], true); offset += 4;
      
      // Attribute byte count (unused)
      view.setUint16(offset, 0, true); offset += 2;
    }
  }
  
  return buffer;
}

/**
 * Export to simplified STEP format (ISO 10303-21)
 * This is a basic implementation - real STEP files are much more complex
 */
export function exportToSTEP(meshes: MeshData[], name: string = 'model'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  
  let step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('FORGE 3D Export'), '2;1');
FILE_NAME('${name}.step', '${timestamp}', ('FORGE'), (''), '', '', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
`;
  
  let entityId = 1;
  const entities: string[] = [];
  
  // Create basic STEP structure
  entities.push(`#${entityId++} = APPLICATION_CONTEXT('automotive design');`);
  const appContextId = entityId - 1;
  
  entities.push(`#${entityId++} = APPLICATION_PROTOCOL_DEFINITION('international standard', 'automotive_design', 2000, #${appContextId});`);
  
  entities.push(`#${entityId++} = PRODUCT_CONTEXT('', #${appContextId}, 'mechanical');`);
  const productContextId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT('${name}', '${name}', '', (#${productContextId}));`);
  const productId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_FORMATION('', '', #${productId});`);
  const pdfId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_CONTEXT('part definition', #${appContextId}, 'design');`);
  const pdcId = entityId - 1;
  
  entities.push(`#${entityId++} = PRODUCT_DEFINITION('design', '', #${pdfId}, #${pdcId});`);
  const pdId = entityId - 1;
  
  // Create geometry for each mesh
  for (const mesh of meshes) {
    const { vertices } = mesh;
    
    // Create CARTESIAN_POINT for each vertex
    const pointIds: number[] = [];
    for (const v of vertices) {
      entities.push(`#${entityId} = CARTESIAN_POINT('', (${v[0]}, ${v[1]}, ${v[2]}));`);
      pointIds.push(entityId++);
    }
    
    // Create a simple shell representation
    entities.push(`#${entityId++} = CLOSED_SHELL('', ());`);
  }
  
  // Add shape representation
  entities.push(`#${entityId++} = SHAPE_DEFINITION_REPRESENTATION(#${entityId}, #${entityId + 1});`);
  entities.push(`#${entityId++} = PRODUCT_DEFINITION_SHAPE('', '', #${pdId});`);
  entities.push(`#${entityId++} = SHAPE_REPRESENTATION('', (), (LENGTH_UNIT(), PLANE_ANGLE_UNIT(), SOLID_ANGLE_UNIT()));`);
  
  step += entities.join('\n');
  step += '\nENDSEC;\nEND-ISO-10303-21;\n';
  
  return step;
}
