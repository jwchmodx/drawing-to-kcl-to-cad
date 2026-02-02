/**
 * 3D Measurement Label Component
 * Renders measurement labels and visualization in Three.js scene
 */

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {
  Measurement,
  MeasurePoint,
  MeasureUnit,
  formatDistance,
  formatArea,
  formatVolume,
  formatAngle,
  createMeasureLine,
  createAngleArc,
  getLabelPosition,
} from '@/lib/measureEngine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MeasureVisualization {
  id: string;
  objects: THREE.Object3D[];
  label?: CSS2DObject;
}

// ═══════════════════════════════════════════════════════════════
// LABEL CREATION
// ═══════════════════════════════════════════════════════════════

function createLabelElement(text: string, type: string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'measure-label';
  div.style.cssText = `
    background: rgba(0, 212, 255, 0.9);
    color: #09090b;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
    pointer-events: none;
    text-shadow: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  const icon = document.createElement('span');
  icon.style.cssText = 'margin-right: 4px; font-size: 10px;';
  
  switch (type) {
    case 'distance':
      icon.textContent = '📏';
      break;
    case 'angle':
      icon.textContent = '📐';
      break;
    case 'area':
      icon.textContent = '⬛';
      break;
    case 'volume':
      icon.textContent = '📦';
      break;
  }
  
  div.appendChild(icon);
  div.appendChild(document.createTextNode(text));
  
  return div;
}

// ═══════════════════════════════════════════════════════════════
// VISUALIZATION CREATORS
// ═══════════════════════════════════════════════════════════════

const MEASURE_LINE_COLOR = 0x00d4ff;
const MEASURE_POINT_COLOR = 0x00ffff;
const MEASURE_ARC_COLOR = 0xff6b00;
const MEASURE_AREA_COLOR = 0x00ff88;

/**
 * Create a point marker sphere
 */
function createPointMarker(point: MeasurePoint, color: number = MEASURE_POINT_COLOR): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.03, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);
  mesh.renderOrder = 999;
  return mesh;
}

/**
 * Create distance visualization
 */
export function createDistanceVisualization(
  measurement: Measurement & { type: 'distance' },
  unit: MeasureUnit
): MeasureVisualization {
  const objects: THREE.Object3D[] = [];
  
  // Line between points
  const lineGeom = createMeasureLine(measurement.point1, measurement.point2);
  const lineMat = new THREE.LineBasicMaterial({ 
    color: MEASURE_LINE_COLOR, 
    linewidth: 2,
    depthTest: false 
  });
  const line = new THREE.Line(lineGeom, lineMat);
  line.renderOrder = 998;
  objects.push(line);
  
  // Point markers
  objects.push(createPointMarker(measurement.point1));
  objects.push(createPointMarker(measurement.point2));
  
  // Dashed extension lines (perpendicular tick marks at endpoints)
  const dir = new THREE.Vector3(
    measurement.point2.x - measurement.point1.x,
    measurement.point2.y - measurement.point1.y,
    measurement.point2.z - measurement.point1.z
  ).normalize();
  
  // Find perpendicular direction
  const up = new THREE.Vector3(0, 1, 0);
  let perp = new THREE.Vector3().crossVectors(dir, up);
  if (perp.length() < 0.001) {
    perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
  }
  perp.normalize().multiplyScalar(0.08);
  
  // Tick marks at each endpoint
  [measurement.point1, measurement.point2].forEach((point) => {
    const tickGeom = new THREE.BufferGeometry();
    const tickVerts = new Float32Array([
      point.x - perp.x, point.y - perp.y, point.z - perp.z,
      point.x + perp.x, point.y + perp.y, point.z + perp.z,
    ]);
    tickGeom.setAttribute('position', new THREE.BufferAttribute(tickVerts, 3));
    const tick = new THREE.Line(tickGeom, lineMat.clone());
    tick.renderOrder = 998;
    objects.push(tick);
  });
  
  // Label
  const labelPos = getLabelPosition(measurement);
  const labelText = formatDistance(measurement.distance, unit);
  const labelElement = createLabelElement(labelText, 'distance');
  const labelObj = new CSS2DObject(labelElement);
  labelObj.position.set(labelPos.x, labelPos.y + 0.05, labelPos.z);
  
  return {
    id: measurement.id,
    objects,
    label: labelObj,
  };
}

/**
 * Create angle visualization
 */
export function createAngleVisualization(
  measurement: Measurement & { type: 'angle' }
): MeasureVisualization {
  const objects: THREE.Object3D[] = [];
  
  // Lines from vertex to each point
  const line1Geom = createMeasureLine(measurement.vertex, measurement.point1);
  const line2Geom = createMeasureLine(measurement.vertex, measurement.point2);
  const lineMat = new THREE.LineBasicMaterial({ 
    color: MEASURE_LINE_COLOR, 
    linewidth: 2,
    depthTest: false 
  });
  
  const line1 = new THREE.Line(line1Geom, lineMat);
  const line2 = new THREE.Line(line2Geom, lineMat.clone());
  line1.renderOrder = 998;
  line2.renderOrder = 998;
  objects.push(line1, line2);
  
  // Arc at vertex
  const arcGeom = createAngleArc(measurement.vertex, measurement.point1, measurement.point2, 0.2);
  const arcMat = new THREE.LineBasicMaterial({ 
    color: MEASURE_ARC_COLOR, 
    linewidth: 2,
    depthTest: false 
  });
  const arc = new THREE.Line(arcGeom, arcMat);
  arc.renderOrder = 998;
  objects.push(arc);
  
  // Point markers
  objects.push(createPointMarker(measurement.point1, MEASURE_LINE_COLOR));
  objects.push(createPointMarker(measurement.vertex, MEASURE_ARC_COLOR));
  objects.push(createPointMarker(measurement.point2, MEASURE_LINE_COLOR));
  
  // Label at vertex
  const labelText = formatAngle(measurement.angle);
  const labelElement = createLabelElement(labelText, 'angle');
  const labelObj = new CSS2DObject(labelElement);
  const v = measurement.vertex;
  labelObj.position.set(v.x, v.y + 0.1, v.z);
  
  return {
    id: measurement.id,
    objects,
    label: labelObj,
  };
}

/**
 * Create area visualization
 */
export function createAreaVisualization(
  measurement: Measurement & { type: 'area' },
  unit: MeasureUnit
): MeasureVisualization {
  const objects: THREE.Object3D[] = [];
  
  // Center marker
  const centerMarker = createPointMarker(measurement.center, MEASURE_AREA_COLOR);
  objects.push(centerMarker);
  
  // Normal arrow
  const normalDir = new THREE.Vector3(
    measurement.normal.x,
    measurement.normal.y,
    measurement.normal.z
  );
  const arrowHelper = new THREE.ArrowHelper(
    normalDir,
    new THREE.Vector3(measurement.center.x, measurement.center.y, measurement.center.z),
    0.3,
    MEASURE_AREA_COLOR,
    0.08,
    0.04
  );
  arrowHelper.renderOrder = 998;
  objects.push(arrowHelper);
  
  // Label
  const labelText = formatArea(measurement.area, unit);
  const labelElement = createLabelElement(labelText, 'area');
  const labelObj = new CSS2DObject(labelElement);
  const c = measurement.center;
  labelObj.position.set(c.x, c.y + 0.15, c.z);
  
  return {
    id: measurement.id,
    objects,
    label: labelObj,
  };
}

/**
 * Create volume visualization
 */
export function createVolumeVisualization(
  measurement: Measurement & { type: 'volume' },
  unit: MeasureUnit
): MeasureVisualization {
  const objects: THREE.Object3D[] = [];
  
  // Center marker (larger for volume)
  const geometry = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  const material = new THREE.MeshBasicMaterial({ 
    color: MEASURE_LINE_COLOR, 
    wireframe: true,
    depthTest: false 
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(measurement.center.x, measurement.center.y, measurement.center.z);
  cube.renderOrder = 999;
  objects.push(cube);
  
  // Label
  const labelText = formatVolume(measurement.volume, unit);
  const labelElement = createLabelElement(labelText, 'volume');
  const labelObj = new CSS2DObject(labelElement);
  const c = measurement.center;
  labelObj.position.set(c.x, c.y + 0.15, c.z);
  
  return {
    id: measurement.id,
    objects,
    label: labelObj,
  };
}

/**
 * Create visualization for any measurement type
 */
export function createMeasureVisualization(
  measurement: Measurement,
  unit: MeasureUnit
): MeasureVisualization {
  switch (measurement.type) {
    case 'distance':
      return createDistanceVisualization(measurement, unit);
    case 'angle':
      return createAngleVisualization(measurement);
    case 'area':
      return createAreaVisualization(measurement, unit);
    case 'volume':
      return createVolumeVisualization(measurement, unit);
  }
}

// ═══════════════════════════════════════════════════════════════
// PENDING POINT VISUALIZATION
// ═══════════════════════════════════════════════════════════════

export function createPendingPointMarker(point: MeasurePoint, index: number): THREE.Mesh {
  const colors = [0x00d4ff, 0xff6b00, 0x00ff88];
  return createPointMarker(point, colors[index % colors.length]);
}

export function createPendingLine(points: MeasurePoint[]): THREE.Line | null {
  if (points.length < 2) return null;
  
  const vertices: number[] = [];
  points.forEach(p => {
    vertices.push(p.x, p.y, p.z);
  });
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.LineDashedMaterial({
    color: MEASURE_LINE_COLOR,
    dashSize: 0.05,
    gapSize: 0.03,
    depthTest: false,
  });
  
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  line.renderOrder = 998;
  
  return line;
}

// ═══════════════════════════════════════════════════════════════
// CSS2D RENDERER SETUP
// ═══════════════════════════════════════════════════════════════

export function createLabelRenderer(container: HTMLElement): CSS2DRenderer {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);
  return labelRenderer;
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP UTILITIES
// ═══════════════════════════════════════════════════════════════

export function disposeMeasureVisualization(vis: MeasureVisualization): void {
  vis.objects.forEach(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Line) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.ArrowHelper) {
      // ArrowHelper disposes automatically when removed
    }
  });
  
  if (vis.label) {
    const element = vis.label.element;
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}
