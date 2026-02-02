/**
 * Sketch Engine - 2D Sketch Logic for Forge CAD
 * 
 * Handles sketch data management, plane transformations, snap detection, and KCL code generation
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SketchPlane = 'XY' | 'XZ' | 'YZ' | 'custom';

export interface SketchPlaneConfig {
  type: SketchPlane;
  origin: [number, number, number];
  normal: [number, number, number];
  xAxis: [number, number, number];
  yAxis: [number, number, number];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type SketchTool = 
  | 'select'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arc'
  | 'polyline'
  | 'spline';

export interface SketchElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'arc' | 'polyline' | 'spline';
  points: Point2D[];
  // For circles/arcs
  center?: Point2D;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  // Metadata
  selected?: boolean;
  color?: string;
}

export interface SnapPoint {
  point: Point2D;
  type: 'grid' | 'endpoint' | 'midpoint' | 'center' | 'intersection';
  elementId?: string;
}

export interface SketchState {
  plane: SketchPlaneConfig;
  elements: SketchElement[];
  selectedIds: string[];
  currentTool: SketchTool;
  gridSize: number;
  gridVisible: boolean;
  snapEnabled: boolean;
  snapTolerance: number;
}

// ═══════════════════════════════════════════════════════════════
// PLANE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export function getDefaultPlaneConfig(type: SketchPlane): SketchPlaneConfig {
  switch (type) {
    case 'XY':
      return {
        type: 'XY',
        origin: [0, 0, 0],
        normal: [0, 0, 1],
        xAxis: [1, 0, 0],
        yAxis: [0, 1, 0],
      };
    case 'XZ':
      return {
        type: 'XZ',
        origin: [0, 0, 0],
        normal: [0, 1, 0],
        xAxis: [1, 0, 0],
        yAxis: [0, 0, 1],
      };
    case 'YZ':
      return {
        type: 'YZ',
        origin: [0, 0, 0],
        normal: [1, 0, 0],
        xAxis: [0, 1, 0],
        yAxis: [0, 0, 1],
      };
    default:
      return getDefaultPlaneConfig('XY');
  }
}

export function createCustomPlane(
  origin: [number, number, number],
  normal: [number, number, number]
): SketchPlaneConfig {
  const normalVec = new THREE.Vector3(...normal).normalize();
  
  // Create orthogonal axes
  let xAxis = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normalVec.dot(xAxis)) > 0.9) {
    xAxis = new THREE.Vector3(0, 1, 0);
  }
  
  const yAxis = new THREE.Vector3().crossVectors(normalVec, xAxis).normalize();
  xAxis = new THREE.Vector3().crossVectors(yAxis, normalVec).normalize();
  
  return {
    type: 'custom',
    origin,
    normal: [normalVec.x, normalVec.y, normalVec.z],
    xAxis: [xAxis.x, xAxis.y, xAxis.z],
    yAxis: [yAxis.x, yAxis.y, yAxis.z],
  };
}

// ═══════════════════════════════════════════════════════════════
// COORDINATE TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════

export function point2Dto3D(point: Point2D, plane: SketchPlaneConfig): Point3D {
  const origin = new THREE.Vector3(...plane.origin);
  const xAxis = new THREE.Vector3(...plane.xAxis);
  const yAxis = new THREE.Vector3(...plane.yAxis);
  
  const result = origin.clone()
    .add(xAxis.multiplyScalar(point.x))
    .add(yAxis.multiplyScalar(point.y));
  
  return { x: result.x, y: result.y, z: result.z };
}

export function point3Dto2D(point: Point3D, plane: SketchPlaneConfig): Point2D {
  const origin = new THREE.Vector3(...plane.origin);
  const xAxis = new THREE.Vector3(...plane.xAxis);
  const yAxis = new THREE.Vector3(...plane.yAxis);
  const p = new THREE.Vector3(point.x, point.y, point.z);
  
  const relative = p.clone().sub(origin);
  
  return {
    x: relative.dot(xAxis),
    y: relative.dot(yAxis),
  };
}

export function projectRayToPlane(
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3,
  plane: SketchPlaneConfig
): Point2D | null {
  const planeOrigin = new THREE.Vector3(...plane.origin);
  const planeNormal = new THREE.Vector3(...plane.normal);
  
  const denominator = rayDirection.dot(planeNormal);
  if (Math.abs(denominator) < 0.0001) {
    return null; // Ray parallel to plane
  }
  
  const t = planeOrigin.clone().sub(rayOrigin).dot(planeNormal) / denominator;
  if (t < 0) {
    return null; // Intersection behind ray origin
  }
  
  const intersect = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
  
  return point3Dto2D({ x: intersect.x, y: intersect.y, z: intersect.z }, plane);
}

// ═══════════════════════════════════════════════════════════════
// SNAP DETECTION
// ═══════════════════════════════════════════════════════════════

export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function findSnapPoints(
  elements: SketchElement[],
  excludeId?: string
): SnapPoint[] {
  const snapPoints: SnapPoint[] = [];
  
  for (const element of elements) {
    if (element.id === excludeId) continue;
    
    if (element.type === 'line' || element.type === 'polyline') {
      // Endpoints
      for (const point of element.points) {
        snapPoints.push({ point, type: 'endpoint', elementId: element.id });
      }
      
      // Midpoints
      for (let i = 0; i < element.points.length - 1; i++) {
        const p1 = element.points[i];
        const p2 = element.points[i + 1];
        snapPoints.push({
          point: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          type: 'midpoint',
          elementId: element.id,
        });
      }
    } else if (element.type === 'rectangle') {
      // All four corners + midpoints
      for (const point of element.points) {
        snapPoints.push({ point, type: 'endpoint', elementId: element.id });
      }
      // Center
      if (element.points.length >= 2) {
        const p1 = element.points[0];
        const p2 = element.points[1];
        snapPoints.push({
          point: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
          type: 'center',
          elementId: element.id,
        });
      }
    } else if (element.type === 'circle' && element.center) {
      snapPoints.push({ point: element.center, type: 'center', elementId: element.id });
      // Quadrant points
      if (element.radius) {
        const r = element.radius;
        const c = element.center;
        snapPoints.push({ point: { x: c.x + r, y: c.y }, type: 'endpoint', elementId: element.id });
        snapPoints.push({ point: { x: c.x - r, y: c.y }, type: 'endpoint', elementId: element.id });
        snapPoints.push({ point: { x: c.x, y: c.y + r }, type: 'endpoint', elementId: element.id });
        snapPoints.push({ point: { x: c.x, y: c.y - r }, type: 'endpoint', elementId: element.id });
      }
    }
  }
  
  return snapPoints;
}

export function findNearestSnapPoint(
  point: Point2D,
  snapPoints: SnapPoint[],
  tolerance: number
): SnapPoint | null {
  let nearest: SnapPoint | null = null;
  let minDist = tolerance;
  
  for (const sp of snapPoints) {
    const dist = Math.sqrt(
      Math.pow(point.x - sp.point.x, 2) + Math.pow(point.y - sp.point.y, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = sp;
    }
  }
  
  return nearest;
}

export function applySnap(
  point: Point2D,
  state: SketchState,
  excludeId?: string
): { point: Point2D; snap: SnapPoint | null } {
  if (!state.snapEnabled) {
    return { point, snap: null };
  }
  
  // First check element snap points
  const elementSnaps = findSnapPoints(state.elements, excludeId);
  const nearestSnap = findNearestSnapPoint(point, elementSnaps, state.snapTolerance);
  
  if (nearestSnap) {
    return { point: nearestSnap.point, snap: nearestSnap };
  }
  
  // Fall back to grid snap
  if (state.gridVisible) {
    const gridSnapped = snapToGrid(point, state.gridSize);
    const gridDist = Math.sqrt(
      Math.pow(point.x - gridSnapped.x, 2) + Math.pow(point.y - gridSnapped.y, 2)
    );
    if (gridDist < state.snapTolerance) {
      return { point: gridSnapped, snap: { point: gridSnapped, type: 'grid' } };
    }
  }
  
  return { point, snap: null };
}

// ═══════════════════════════════════════════════════════════════
// ELEMENT CREATION HELPERS
// ═══════════════════════════════════════════════════════════════

let elementIdCounter = 0;

export function generateElementId(): string {
  return `sketch_${Date.now()}_${++elementIdCounter}`;
}

export function createLineElement(p1: Point2D, p2: Point2D): SketchElement {
  return {
    id: generateElementId(),
    type: 'line',
    points: [p1, p2],
  };
}

export function createRectangleElement(corner1: Point2D, corner2: Point2D): SketchElement {
  const minX = Math.min(corner1.x, corner2.x);
  const maxX = Math.max(corner1.x, corner2.x);
  const minY = Math.min(corner1.y, corner2.y);
  const maxY = Math.max(corner1.y, corner2.y);
  
  return {
    id: generateElementId(),
    type: 'rectangle',
    points: [
      { x: minX, y: minY },
      { x: maxX, y: maxY },
    ],
  };
}

export function createCircleElement(center: Point2D, radius: number): SketchElement {
  return {
    id: generateElementId(),
    type: 'circle',
    points: [],
    center,
    radius,
  };
}

export function createArcElement(
  center: Point2D,
  radius: number,
  startAngle: number,
  endAngle: number
): SketchElement {
  return {
    id: generateElementId(),
    type: 'arc',
    points: [],
    center,
    radius,
    startAngle,
    endAngle,
  };
}

export function createPolylineElement(points: Point2D[]): SketchElement {
  return {
    id: generateElementId(),
    type: 'polyline',
    points,
  };
}

// ═══════════════════════════════════════════════════════════════
// ELEMENT MANIPULATION
// ═══════════════════════════════════════════════════════════════

export function moveElement(element: SketchElement, delta: Point2D): SketchElement {
  const newElement = { ...element };
  
  newElement.points = element.points.map(p => ({
    x: p.x + delta.x,
    y: p.y + delta.y,
  }));
  
  if (newElement.center) {
    newElement.center = {
      x: newElement.center.x + delta.x,
      y: newElement.center.y + delta.y,
    };
  }
  
  return newElement;
}

export function deleteElements(state: SketchState, ids: string[]): SketchState {
  return {
    ...state,
    elements: state.elements.filter(e => !ids.includes(e.id)),
    selectedIds: state.selectedIds.filter(id => !ids.includes(id)),
  };
}

export function selectElement(state: SketchState, id: string, additive: boolean = false): SketchState {
  let newSelectedIds: string[];
  
  if (additive) {
    if (state.selectedIds.includes(id)) {
      newSelectedIds = state.selectedIds.filter(i => i !== id);
    } else {
      newSelectedIds = [...state.selectedIds, id];
    }
  } else {
    newSelectedIds = [id];
  }
  
  return {
    ...state,
    selectedIds: newSelectedIds,
    elements: state.elements.map(e => ({
      ...e,
      selected: newSelectedIds.includes(e.id),
    })),
  };
}

export function clearSelection(state: SketchState): SketchState {
  return {
    ...state,
    selectedIds: [],
    elements: state.elements.map(e => ({ ...e, selected: false })),
  };
}

// ═══════════════════════════════════════════════════════════════
// HIT TESTING
// ═══════════════════════════════════════════════════════════════

export function pointToLineDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
  }
  
  const t = Math.max(0, Math.min(1, (
    (point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy
  ) / lengthSq));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
}

export function hitTestElement(point: Point2D, element: SketchElement, tolerance: number): boolean {
  switch (element.type) {
    case 'line':
      if (element.points.length >= 2) {
        return pointToLineDistance(point, element.points[0], element.points[1]) < tolerance;
      }
      return false;
      
    case 'rectangle':
      if (element.points.length >= 2) {
        const [p1, p2] = element.points;
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        
        // Check all four sides
        const lines: [Point2D, Point2D][] = [
          [{ x: minX, y: minY }, { x: maxX, y: minY }],
          [{ x: maxX, y: minY }, { x: maxX, y: maxY }],
          [{ x: maxX, y: maxY }, { x: minX, y: maxY }],
          [{ x: minX, y: maxY }, { x: minX, y: minY }],
        ];
        
        return lines.some(([l1, l2]) => pointToLineDistance(point, l1, l2) < tolerance);
      }
      return false;
      
    case 'circle':
      if (element.center && element.radius) {
        const dist = Math.sqrt(
          Math.pow(point.x - element.center.x, 2) +
          Math.pow(point.y - element.center.y, 2)
        );
        return Math.abs(dist - element.radius) < tolerance;
      }
      return false;
      
    case 'polyline':
      for (let i = 0; i < element.points.length - 1; i++) {
        if (pointToLineDistance(point, element.points[i], element.points[i + 1]) < tolerance) {
          return true;
        }
      }
      return false;
      
    default:
      return false;
  }
}

export function hitTestElements(point: Point2D, elements: SketchElement[], tolerance: number): SketchElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(point, elements[i], tolerance)) {
      return elements[i];
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// KCL CODE GENERATION
// ═══════════════════════════════════════════════════════════════

export function sketchElementsToPoints(elements: SketchElement[], plane: SketchPlaneConfig): Point3D[] {
  const points3D: Point3D[] = [];
  
  for (const element of elements) {
    switch (element.type) {
      case 'line':
      case 'polyline':
        for (const point of element.points) {
          points3D.push(point2Dto3D(point, plane));
        }
        break;
        
      case 'rectangle':
        if (element.points.length >= 2) {
          const [p1, p2] = element.points;
          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          
          const corners: Point2D[] = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
            { x: minX, y: minY }, // Close the loop
          ];
          
          for (const corner of corners) {
            points3D.push(point2Dto3D(corner, plane));
          }
        }
        break;
        
      case 'circle':
        if (element.center && element.radius) {
          const segments = 32;
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const point: Point2D = {
              x: element.center.x + element.radius * Math.cos(angle),
              y: element.center.y + element.radius * Math.sin(angle),
            };
            points3D.push(point2Dto3D(point, plane));
          }
        }
        break;
        
      case 'arc':
        if (element.center && element.radius && element.startAngle !== undefined && element.endAngle !== undefined) {
          const segments = 16;
          const angleDiff = element.endAngle - element.startAngle;
          for (let i = 0; i <= segments; i++) {
            const angle = element.startAngle + (i / segments) * angleDiff;
            const point: Point2D = {
              x: element.center.x + element.radius * Math.cos(angle),
              y: element.center.y + element.radius * Math.sin(angle),
            };
            points3D.push(point2Dto3D(point, plane));
          }
        }
        break;
    }
  }
  
  return points3D;
}

export function generateSketchProfileKCL(
  elements: SketchElement[],
  plane: SketchPlaneConfig,
  profileName: string = 'sketch1'
): string {
  const lines: string[] = [];
  
  // Comment header
  lines.push(`// Sketch profile: ${profileName}`);
  lines.push(`// Plane: ${plane.type}`);
  lines.push('');
  
  // Generate points array
  const points3D = sketchElementsToPoints(elements, plane);
  
  if (points3D.length === 0) {
    return '// Empty sketch';
  }
  
  // Format points for KCL
  const pointsStr = points3D.map(p => 
    `[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`
  ).join(',\n    ');
  
  lines.push(`let ${profileName}_points = [`);
  lines.push(`    ${pointsStr}`);
  lines.push(`]`);
  lines.push('');
  
  // Create sketch profile (for use with extrude/revolve)
  lines.push(`let ${profileName} = sketch_profile(${profileName}_points)`);
  
  return lines.join('\n');
}

export function generateExtrudeFromSketchKCL(
  elements: SketchElement[],
  plane: SketchPlaneConfig,
  distance: number,
  profileName: string = 'sketch1'
): string {
  const profileKCL = generateSketchProfileKCL(elements, plane, profileName);
  
  const lines: string[] = [];
  lines.push(profileKCL);
  lines.push('');
  lines.push(`let ${profileName}_extrude = extrude(${profileName}, distance: ${distance.toFixed(2)})`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

export function createInitialSketchState(): SketchState {
  return {
    plane: getDefaultPlaneConfig('XY'),
    elements: [],
    selectedIds: [],
    currentTool: 'select',
    gridSize: 0.5,
    gridVisible: true,
    snapEnabled: true,
    snapTolerance: 0.1,
  };
}
