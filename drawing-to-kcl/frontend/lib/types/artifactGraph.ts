/**
 * Artifact graph types and helpers: parse, extractMeshes, buildArtifactGraphFromGeometry.
 */

import type { GeometrySpec, BoxSpec, CylinderSpec, SphereSpec, ConeSpec, ExtrudeSpec, FilletSpec } from '@/lib/types/geometrySpec';
import { filletBoxEdge, filletAllBoxEdges, getBoxEdges, type EdgeInfo } from '@/lib/filletEngine';
import { union, subtract, intersect, type BooleanOperation } from '@/lib/booleanEngine';
import { revolve } from '@/lib/revolveEngine';
import { linearPattern, circularPattern } from '@/lib/patternEngine';
import { shellBoxSimple } from '@/lib/shellBoxSimple';
import { torus, helix } from '@/lib/advancedPrimitives';
import { mirror, scale, rotate, translate } from '@/lib/transformEngine';
import { sweep, pipe, circleProfile, rectProfile, curvePath } from '@/lib/sweepEngine';
import { loft, loftCircles, circleProfile3D, rectProfile3D } from '@/lib/loftEngine';
import { draftBox, draftCylinder, draftMesh } from '@/lib/draftEngine';

export interface ArtifactGraph {
  artifacts: string[];
  nodes: Record<string, ArtifactNode>;
}

export interface ArtifactNode {
  id: string;
  type: string;
  astNodeId?: string;
  geometry: { vertices: number[][]; indices: number[] } | null;
  // Original spec for operations
  spec?: BoxSpec | CylinderSpec | SphereSpec | ConeSpec;
}

export interface MeshData {
  id: string;
  vertices: number[][];
  indices: number[];
}

export function parseArtifactGraph(wasmResult: unknown): ArtifactGraph {
  if (wasmResult === null || typeof wasmResult !== 'object') {
    throw new Error('Invalid artifact graph');
  }
  const o = wasmResult as { artifacts?: string[]; nodes?: Record<string, unknown> };
  return {
    artifacts: Array.isArray(o.artifacts) ? o.artifacts : [],
    nodes: o.nodes && typeof o.nodes === 'object' ? (o.nodes as Record<string, ArtifactNode>) : {},
  };
}

export function parseKclRunOutput(raw: string | object): ArtifactGraph {
  if (typeof raw === 'object' && raw !== null && 'artifacts' in raw && 'nodes' in raw) {
    return parseArtifactGraph(raw);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseArtifactGraph(parsed);
    } catch {
      return { artifacts: [], nodes: {} };
    }
  }
  return { artifacts: [], nodes: {} };
}

export function extractMeshes(graph: ArtifactGraph): MeshData[] {
  const meshes: MeshData[] = [];
  for (const id of graph.artifacts) {
    const node = graph.nodes[id];
    if (node?.geometry?.vertices && node.geometry.indices) {
      meshes.push({
        id: node.id,
        vertices: node.geometry.vertices,
        indices: node.geometry.indices,
      });
    }
  }
  return meshes;
}

export function findArtifactById(graph: ArtifactGraph, id: string): ArtifactNode | null {
  return graph.nodes[id] ?? null;
}

// ═══════════════════════════════════════════════════════════════
// BOX GEOMETRY
// ═══════════════════════════════════════════════════════════════
function boxVerticesAndIndices(
  size: [number, number, number],
  center: [number, number, number]
): { vertices: number[][]; indices: number[] } {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const vertices: number[][] = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];
  const indices = [
    0, 1, 2, 0, 2, 3,  // back
    4, 6, 5, 4, 7, 6,  // front
    0, 4, 5, 0, 5, 1,  // bottom
    2, 6, 7, 2, 7, 3,  // top
    0, 3, 7, 0, 7, 4,  // left
    1, 5, 6, 1, 6, 2,  // right
  ];
  return { vertices, indices };
}

// ═══════════════════════════════════════════════════════════════
// CYLINDER GEOMETRY
// ═══════════════════════════════════════════════════════════════
function cylinderVerticesAndIndices(
  radius: number,
  height: number,
  center: [number, number, number],
  segments: number = 32
): { vertices: number[][]; indices: number[] } {
  const [cx, cy, cz] = center;
  const halfHeight = height / 2;
  const vertices: number[][] = [];
  const indices: number[] = [];
  
  // Bottom center
  vertices.push([cx, cy - halfHeight, cz]);
  const bottomCenterIdx = 0;
  
  // Bottom ring
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    vertices.push([x, cy - halfHeight, z]);
  }
  
  // Top center
  vertices.push([cx, cy + halfHeight, cz]);
  const topCenterIdx = segments + 1;
  
  // Top ring
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    vertices.push([x, cy + halfHeight, z]);
  }
  
  // Bottom cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bottomCenterIdx, 1 + next, 1 + i);
  }
  
  // Top cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 1 + next);
  }
  
  // Side faces
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const bottomA = 1 + i;
    const bottomB = 1 + next;
    const topA = topCenterIdx + 1 + i;
    const topB = topCenterIdx + 1 + next;
    
    indices.push(bottomA, topA, topB);
    indices.push(bottomA, topB, bottomB);
  }
  
  return { vertices, indices };
}

// ═══════════════════════════════════════════════════════════════
// SPHERE GEOMETRY
// ═══════════════════════════════════════════════════════════════
function sphereVerticesAndIndices(
  radius: number,
  center: [number, number, number],
  widthSegments: number = 24,
  heightSegments: number = 16
): { vertices: number[][]; indices: number[] } {
  const [cx, cy, cz] = center;
  const vertices: number[][] = [];
  const indices: number[] = [];
  
  // Generate vertices
  for (let lat = 0; lat <= heightSegments; lat++) {
    const theta = (lat * Math.PI) / heightSegments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    for (let lon = 0; lon <= widthSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / widthSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      const x = cx + radius * cosPhi * sinTheta;
      const y = cy + radius * cosTheta;
      const z = cz + radius * sinPhi * sinTheta;
      
      vertices.push([x, y, z]);
    }
  }
  
  // Generate indices
  for (let lat = 0; lat < heightSegments; lat++) {
    for (let lon = 0; lon < widthSegments; lon++) {
      const first = lat * (widthSegments + 1) + lon;
      const second = first + widthSegments + 1;
      
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  
  return { vertices, indices };
}

// ═══════════════════════════════════════════════════════════════
// CONE GEOMETRY
// ═══════════════════════════════════════════════════════════════
function coneVerticesAndIndices(
  radius: number,
  height: number,
  center: [number, number, number],
  segments: number = 32
): { vertices: number[][]; indices: number[] } {
  const [cx, cy, cz] = center;
  const halfHeight = height / 2;
  const vertices: number[][] = [];
  const indices: number[] = [];
  
  // Apex (top)
  vertices.push([cx, cy + halfHeight, cz]);
  const apexIdx = 0;
  
  // Bottom center
  vertices.push([cx, cy - halfHeight, cz]);
  const bottomCenterIdx = 1;
  
  // Bottom ring
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    vertices.push([x, cy - halfHeight, z]);
  }
  
  // Side faces (apex to bottom ring)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(apexIdx, 2 + i, 2 + next);
  }
  
  // Bottom cap
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bottomCenterIdx, 2 + next, 2 + i);
  }
  
  return { vertices, indices };
}

// ═══════════════════════════════════════════════════════════════
// EXTRUDE GEOMETRY
// ═══════════════════════════════════════════════════════════════
export function extrudeBox(
  boxSpec: BoxSpec,
  face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
  distance: number
): { vertices: number[][]; indices: number[] } {
  const [sx, sy, sz] = boxSpec.size;
  const [cx, cy, cz] = boxSpec.center;
  
  // Calculate new dimensions based on extrude direction
  let newSize: [number, number, number] = [sx, sy, sz];
  let newCenter: [number, number, number] = [cx, cy, cz];
  
  switch (face) {
    case 'top':
      newSize = [sx, sy + distance, sz];
      newCenter = [cx, cy + distance / 2, cz];
      break;
    case 'bottom':
      newSize = [sx, sy + distance, sz];
      newCenter = [cx, cy - distance / 2, cz];
      break;
    case 'left':
      newSize = [sx + distance, sy, sz];
      newCenter = [cx - distance / 2, cy, cz];
      break;
    case 'right':
      newSize = [sx + distance, sy, sz];
      newCenter = [cx + distance / 2, cy, cz];
      break;
    case 'front':
      newSize = [sx, sy, sz + distance];
      newCenter = [cx, cy, cz + distance / 2];
      break;
    case 'back':
      newSize = [sx, sy, sz + distance];
      newCenter = [cx, cy, cz - distance / 2];
      break;
  }
  
  return boxVerticesAndIndices(newSize, newCenter);
}

// ═══════════════════════════════════════════════════════════════
// FILLET GEOMETRY (using filletEngine)
// ═══════════════════════════════════════════════════════════════

/**
 * Apply fillet to a specific edge of a box
 */
export function filletBoxSingleEdge(
  boxSpec: BoxSpec,
  edgeIndex: number,
  radius: number,
  segments: number = 8
): { vertices: number[][]; indices: number[] } {
  const result = filletBoxEdge(boxSpec.size, boxSpec.center, edgeIndex, radius, segments);
  return { vertices: result.vertices, indices: result.indices };
}

/**
 * Apply fillet to all edges of a box (rounded box)
 */
export function filletBox(
  boxSpec: BoxSpec,
  radius: number,
  segments: number = 8
): { vertices: number[][]; indices: number[] } {
  const result = filletAllBoxEdges(boxSpec.size, boxSpec.center, radius, segments);
  return { vertices: result.vertices, indices: result.indices };
}

/**
 * Get edge information for a box
 */
export function getBoxEdgeInfo(boxSpec: BoxSpec): EdgeInfo[] {
  return getBoxEdges(boxSpec.size, boxSpec.center);
}

// ═══════════════════════════════════════════════════════════════
// BUILD ARTIFACT GRAPH FROM GEOMETRY SPEC
// ═══════════════════════════════════════════════════════════════
export function buildArtifactGraphFromGeometry(spec: GeometrySpec): ArtifactGraph {
  const artifacts: string[] = [];
  const nodes: Record<string, ArtifactNode> = {};
  
  // Process boxes
  for (const box of spec.boxes) {
    const [sx, sy, sz] = box.size;
    const [cx, cy, cz] = box.center;
    const valid =
      Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz) &&
      Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz);
    if (!valid) continue;
    const { vertices, indices } = boxVerticesAndIndices(box.size, box.center);
    artifacts.push(box.id);
    nodes[box.id] = {
      id: box.id,
      type: 'solid',
      geometry: { vertices, indices },
      spec: box,
    };
  }
  
  // Process cylinders
  for (const cyl of spec.cylinders || []) {
    const { radius, height, center, segments } = cyl;
    const [cx, cy, cz] = center;
    const valid = Number.isFinite(radius) && Number.isFinite(height) &&
      Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz);
    if (!valid) continue;
    const { vertices, indices } = cylinderVerticesAndIndices(radius, height, center, segments);
    artifacts.push(cyl.id);
    nodes[cyl.id] = {
      id: cyl.id,
      type: 'solid',
      geometry: { vertices, indices },
      spec: cyl,
    };
  }
  
  // Process spheres
  for (const sphere of spec.spheres || []) {
    const { radius, center, widthSegments, heightSegments } = sphere;
    const [cx, cy, cz] = center;
    const valid = Number.isFinite(radius) &&
      Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz);
    if (!valid) continue;
    const { vertices, indices } = sphereVerticesAndIndices(radius, center, widthSegments, heightSegments);
    artifacts.push(sphere.id);
    nodes[sphere.id] = {
      id: sphere.id,
      type: 'solid',
      geometry: { vertices, indices },
      spec: sphere,
    };
  }
  
  // Process cones
  for (const cone of spec.cones || []) {
    const { radius, height, center, segments } = cone;
    const [cx, cy, cz] = center;
    const valid = Number.isFinite(radius) && Number.isFinite(height) &&
      Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(cz);
    if (!valid) continue;
    const { vertices, indices } = coneVerticesAndIndices(radius, height, center, segments);
    artifacts.push(cone.id);
    nodes[cone.id] = {
      id: cone.id,
      type: 'solid',
      geometry: { vertices, indices },
      spec: cone,
    };
  }
  
  // Process extrudes
  for (const ext of spec.extrudes || []) {
    const sourceNode = nodes[ext.sourceId];
    if (!sourceNode || !sourceNode.spec) continue;
    
    // Only support box extrusion for now
    if (sourceNode.type === 'solid' && 'size' in sourceNode.spec) {
      const boxSpec = sourceNode.spec as BoxSpec;
      const { vertices, indices } = extrudeBox(boxSpec, ext.face, ext.distance);
      
      // Update the source node's geometry
      sourceNode.geometry = { vertices, indices };
      // Update the spec
      const newSize = [...boxSpec.size] as [number, number, number];
      const newCenter = [...boxSpec.center] as [number, number, number];
      
      switch (ext.face) {
        case 'top':
        case 'bottom':
          newSize[1] += ext.distance;
          newCenter[1] += (ext.face === 'top' ? 1 : -1) * ext.distance / 2;
          break;
        case 'left':
        case 'right':
          newSize[0] += ext.distance;
          newCenter[0] += (ext.face === 'right' ? 1 : -1) * ext.distance / 2;
          break;
        case 'front':
        case 'back':
          newSize[2] += ext.distance;
          newCenter[2] += (ext.face === 'front' ? 1 : -1) * ext.distance / 2;
          break;
      }
      
      (sourceNode.spec as BoxSpec).size = newSize;
      (sourceNode.spec as BoxSpec).center = newCenter;
    }
  }
  
  // Process fillets
  for (const fillet of spec.fillets || []) {
    const sourceNode = nodes[fillet.sourceId];
    if (!sourceNode || !sourceNode.spec) continue;
    
    if (sourceNode.type === 'solid' && 'size' in sourceNode.spec) {
      const boxSpec = sourceNode.spec as BoxSpec;
      const segments = fillet.segments ?? 8;
      
      // Check if a specific edge is specified
      if (fillet.edgeIndex !== undefined && fillet.edgeIndex >= 0) {
        // Single edge fillet
        const { vertices, indices } = filletBoxSingleEdge(
          boxSpec, 
          fillet.edgeIndex, 
          fillet.radius, 
          segments
        );
        sourceNode.geometry = { vertices, indices };
      } else {
        // All edges fillet (rounded box)
        const { vertices, indices } = filletBox(boxSpec, fillet.radius, segments);
        sourceNode.geometry = { vertices, indices };
      }
    }
  }
  
  // Process Boolean operations
  for (const bool of spec.booleans || []) {
    const nodeA = nodes[bool.sourceAId];
    const nodeB = nodes[bool.sourceBId];
    
    if (!nodeA?.geometry || !nodeB?.geometry) continue;
    
    try {
      // Select the appropriate boolean function
      let booleanFn: typeof union;
      switch (bool.operation) {
        case 'union':
          booleanFn = union;
          break;
        case 'subtract':
          booleanFn = subtract;
          break;
        case 'intersect':
          booleanFn = intersect;
          break;
        default:
          continue;
      }
      
      const result = booleanFn(
        nodeA.geometry.vertices,
        nodeA.geometry.indices,
        [], // normals (will be computed)
        nodeB.geometry.vertices,
        nodeB.geometry.indices,
        []  // normals (will be computed)
      );
      
      // Add result as new node
      artifacts.push(bool.id);
      nodes[bool.id] = {
        id: bool.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
      
      // Remove source artifacts from render list (they're now combined)
      const aIdx = artifacts.indexOf(bool.sourceAId);
      if (aIdx !== -1) artifacts.splice(aIdx, 1);
      const bIdx = artifacts.indexOf(bool.sourceBId);
      if (bIdx !== -1) artifacts.splice(bIdx, 1);
    } catch (e) {
      console.error('Boolean operation failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Revolve operations
  for (const rev of spec.revolves || []) {
    try {
      // Convert [number, number][] to Vec2[]
      const profileVec2 = rev.profile.map(p => ({ x: p[0], y: p[1] }));
      
      const result = revolve(
        profileVec2,
        rev.axis,
        rev.angle,
        rev.segments || 32,
        rev.center
      );
      
      artifacts.push(rev.id);
      nodes[rev.id] = {
        id: rev.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
    } catch (e) {
      console.error('Revolve operation failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Linear Pattern operations
  for (const pat of spec.linearPatterns || []) {
    const sourceNode = nodes[pat.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const normals = sourceNode.geometry.vertices.map(() => [0, 1, 0] as number[]);
      
      const result = linearPattern(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        normals,
        pat.direction,
        pat.count,
        pat.spacing
      );
      
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Linear pattern failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Circular Pattern operations
  for (const pat of spec.circularPatterns || []) {
    const sourceNode = nodes[pat.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      // Generate dummy normals if not present
      const normals = sourceNode.geometry.vertices.map(() => [0, 1, 0] as number[]);
      
      const result = circularPattern(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        normals,
        pat.axis,
        pat.center,
        pat.count,
        pat.angle || 360
      );
      
      // Update source node with pattern result
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Circular pattern failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Shell operations
  for (const sh of spec.shells || []) {
    const sourceNode = nodes[sh.sourceId];
    if (!sourceNode?.geometry || !sourceNode.spec) continue;
    
    try {
      // Only support box shell for now
      if ('size' in sourceNode.spec) {
        const boxSpec = sourceNode.spec as BoxSpec;
        const result = shellBoxSimple(
          boxSpec.size,
          boxSpec.center,
          sh.thickness,
          sh.openFaces || []
        );
        
        if (result.vertices.length > 0 && result.indices.length > 0) {
          sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
        }
      }
    } catch (e) {
      console.error('Shell operation failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Torus primitives
  for (const tor of spec.toruses || []) {
    try {
      const result = torus(
        tor.majorRadius,
        tor.minorRadius,
        tor.center,
        tor.majorSegments || 32,
        tor.minorSegments || 16
      );
      
      artifacts.push(tor.id);
      nodes[tor.id] = {
        id: tor.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
    } catch (e) {
      console.error('Torus failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Helix primitives
  for (const hel of spec.helixes || []) {
    try {
      const result = helix(
        hel.radius,
        hel.pitch,
        hel.turns,
        hel.tubeRadius,
        hel.center,
        hel.segments || 32,
        hel.tubeSegments || 8
      );
      
      artifacts.push(hel.id);
      nodes[hel.id] = {
        id: hel.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
    } catch (e) {
      console.error('Helix failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Mirror operations
  for (const mir of spec.mirrors || []) {
    const sourceNode = nodes[mir.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const result = mirror(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        mir.plane,
        mir.keepOriginal ?? true
      );
      
      // Update source node with mirrored result
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Mirror failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Scale operations
  for (const scl of spec.scales || []) {
    const sourceNode = nodes[scl.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const result = scale(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        scl.scale,
        scl.center || [0, 0, 0]
      );
      
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Scale failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Rotate operations
  for (const rot of spec.rotates || []) {
    const sourceNode = nodes[rot.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const result = rotate(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        rot.axis,
        rot.angle,
        rot.center || [0, 0, 0]
      );
      
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Rotate failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Translate operations
  for (const trans of spec.translates || []) {
    const sourceNode = nodes[trans.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const result = translate(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        trans.offset
      );
      
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Translate failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Sweep operations
  for (const swp of spec.sweeps || []) {
    try {
      let profile: [number, number][];
      if (swp.profile === 'circle') {
        const radius = typeof swp.profileSize === 'number' ? swp.profileSize : swp.profileSize[0];
        profile = circleProfile(radius, 16);
      } else {
        const [w, h] = typeof swp.profileSize === 'number' 
          ? [swp.profileSize, swp.profileSize] 
          : swp.profileSize;
        profile = rectProfile(w, h);
      }
      
      const result = sweep(profile, swp.path, swp.closed ?? true);
      
      artifacts.push(swp.id);
      nodes[swp.id] = {
        id: swp.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
    } catch (e) {
      console.error('Sweep failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Loft operations
  for (const lft of spec.lofts || []) {
    try {
      const profiles: [number, number, number][][] = [];
      
      for (const p of lft.profiles) {
        const dir: [number, number, number] = [0, 1, 0]; // Default up direction
        if (p.shape === 'circle') {
          const radius = typeof p.size === 'number' ? p.size : p.size[0];
          profiles.push(circleProfile3D(p.center, radius, dir, 16));
        } else {
          const [w, h] = typeof p.size === 'number' ? [p.size, p.size] : p.size;
          profiles.push(rectProfile3D(p.center, w, h, dir));
        }
      }
      
      const result = loft(profiles, true, lft.interpolationSteps || 2);
      
      artifacts.push(lft.id);
      nodes[lft.id] = {
        id: lft.id,
        type: 'solid',
        geometry: { vertices: result.vertices, indices: result.indices },
      };
    } catch (e) {
      console.error('Loft failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  // Process Draft operations
  for (const dft of spec.drafts || []) {
    const sourceNode = nodes[dft.sourceId];
    if (!sourceNode?.geometry) continue;
    
    try {
      const result = draftMesh(
        sourceNode.geometry.vertices,
        sourceNode.geometry.indices,
        dft.angle,
        [0, 0, 0],
        dft.direction || [0, 1, 0]
      );
      
      sourceNode.geometry = { vertices: result.vertices, indices: result.indices };
    } catch (e) {
      console.error('Draft failed:', e instanceof Error ? e.message : String(e));
    }
  }
  
  return { artifacts, nodes };
}
