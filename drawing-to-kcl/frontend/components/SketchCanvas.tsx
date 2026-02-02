/**
 * SketchCanvas - 2D Sketch Canvas with Three.js
 * 
 * Handles 2D drawing, element manipulation, and visualization
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  SketchState,
  SketchTool,
  SketchElement,
  Point2D,
  SnapPoint,
  projectRayToPlane,
  applySnap,
  hitTestElements,
  createLineElement,
  createRectangleElement,
  createCircleElement,
  createArcElement,
  createPolylineElement,
  selectElement,
  clearSelection,
  moveElement,
  deleteElements,
  point2Dto3D,
} from '../lib/sketchEngine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SketchCanvasProps {
  sketchState: SketchState;
  onStateChange: (state: SketchState) => void;
  onCursorMove: (position: Point2D | null) => void;
  width?: number;
  height?: number;
}

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point2D | null;
  currentPoint: Point2D | null;
  points: Point2D[]; // For polyline
  previewElement: SketchElement | null;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  grid: 0x1c232d,
  gridCenter: 0x00d4ff,
  element: 0x00d4ff,
  elementSelected: 0xff8844,
  preview: 0x00ff88,
  snap: 0xffff00,
  background: 0x09090b,
};

// ═══════════════════════════════════════════════════════════════
// DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function createGridGeometry(size: number, divisions: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const colors: number[] = [];
  
  const step = size / divisions;
  const halfSize = size / 2;
  
  const gridColor = new THREE.Color(COLORS.grid);
  const centerColor = new THREE.Color(COLORS.gridCenter);
  
  for (let i = 0; i <= divisions; i++) {
    const pos = -halfSize + i * step;
    const isCenter = Math.abs(pos) < 0.001;
    const color = isCenter ? centerColor : gridColor;
    
    // Horizontal line
    vertices.push(-halfSize, pos, 0, halfSize, pos, 0);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    
    // Vertical line
    vertices.push(pos, -halfSize, 0, pos, halfSize, 0);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  return geometry;
}

function createElementGeometry(element: SketchElement, plane: any): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  
  switch (element.type) {
    case 'line':
      if (element.points.length >= 2) {
        const p1 = point2Dto3D(element.points[0], plane);
        const p2 = point2Dto3D(element.points[1], plane);
        vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
      break;
      
    case 'rectangle':
      if (element.points.length >= 2) {
        const [pt1, pt2] = element.points;
        const minX = Math.min(pt1.x, pt2.x);
        const maxX = Math.max(pt1.x, pt2.x);
        const minY = Math.min(pt1.y, pt2.y);
        const maxY = Math.max(pt1.y, pt2.y);
        
        const corners = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ];
        
        for (let i = 0; i < 4; i++) {
          const p1 = point2Dto3D(corners[i], plane);
          const p2 = point2Dto3D(corners[(i + 1) % 4], plane);
          vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
      break;
      
    case 'circle':
      if (element.center && element.radius) {
        const segments = 64;
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI * 2;
          const angle2 = ((i + 1) / segments) * Math.PI * 2;
          
          const pt1: Point2D = {
            x: element.center.x + element.radius * Math.cos(angle1),
            y: element.center.y + element.radius * Math.sin(angle1),
          };
          const pt2: Point2D = {
            x: element.center.x + element.radius * Math.cos(angle2),
            y: element.center.y + element.radius * Math.sin(angle2),
          };
          
          const p1 = point2Dto3D(pt1, plane);
          const p2 = point2Dto3D(pt2, plane);
          vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
      break;
      
    case 'arc':
      if (element.center && element.radius && element.startAngle !== undefined && element.endAngle !== undefined) {
        const segments = 32;
        const angleDiff = element.endAngle - element.startAngle;
        
        for (let i = 0; i < segments; i++) {
          const angle1 = element.startAngle + (i / segments) * angleDiff;
          const angle2 = element.startAngle + ((i + 1) / segments) * angleDiff;
          
          const pt1: Point2D = {
            x: element.center.x + element.radius * Math.cos(angle1),
            y: element.center.y + element.radius * Math.sin(angle1),
          };
          const pt2: Point2D = {
            x: element.center.x + element.radius * Math.cos(angle2),
            y: element.center.y + element.radius * Math.sin(angle2),
          };
          
          const p1 = point2Dto3D(pt1, plane);
          const p2 = point2Dto3D(pt2, plane);
          vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
      break;
      
    case 'polyline':
      for (let i = 0; i < element.points.length - 1; i++) {
        const p1 = point2Dto3D(element.points[i], plane);
        const p2 = point2Dto3D(element.points[i + 1], plane);
        vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
      break;
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function createSnapIndicator(point: Point2D, snap: SnapPoint, plane: any): THREE.Object3D {
  const group = new THREE.Group();
  const p3d = point2Dto3D(point, plane);
  
  // Different indicators for different snap types
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;
  
  switch (snap.type) {
    case 'endpoint':
      geometry = new THREE.CircleGeometry(0.05, 16);
      material = new THREE.MeshBasicMaterial({ color: COLORS.snap, transparent: true, opacity: 0.8 });
      break;
    case 'midpoint':
      geometry = new THREE.RingGeometry(0.03, 0.05, 16);
      material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      break;
    case 'center':
      geometry = new THREE.CircleGeometry(0.04, 4); // Diamond
      material = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
      break;
    case 'grid':
      geometry = new THREE.PlaneGeometry(0.08, 0.08);
      material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
      break;
    default:
      geometry = new THREE.CircleGeometry(0.04, 8);
      material = new THREE.MeshBasicMaterial({ color: COLORS.snap, transparent: true, opacity: 0.8 });
  }
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(p3d.x, p3d.y, p3d.z + 0.001);
  
  // Rotate to face camera based on plane
  if (plane.type === 'XZ') {
    mesh.rotation.x = -Math.PI / 2;
  } else if (plane.type === 'YZ') {
    mesh.rotation.y = Math.PI / 2;
  }
  
  group.add(mesh);
  return group;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SketchCanvas({
  sketchState,
  onStateChange,
  onCursorMove,
  width,
  height,
}: SketchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    gridGroup: THREE.Group;
    elementsGroup: THREE.Group;
    previewGroup: THREE.Group;
    snapGroup: THREE.Group;
  } | null>(null);
  
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    points: [],
    previewElement: null,
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point2D | null>(null);
  const [currentSnap, setCurrentSnap] = useState<SnapPoint | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    const w = width || containerRef.current.clientWidth || 600;
    const h = height || containerRef.current.clientHeight || 400;
    const aspect = w / h;
    const frustumSize = 10;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    
    // Orthographic camera for 2D view
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    
    // Position camera based on plane
    switch (sketchState.plane.type) {
      case 'XY':
        camera.position.set(0, 0, 10);
        camera.up.set(0, 1, 0);
        break;
      case 'XZ':
        camera.position.set(0, 10, 0);
        camera.up.set(0, 0, -1);
        break;
      case 'YZ':
        camera.position.set(10, 0, 0);
        camera.up.set(0, 1, 0);
        break;
    }
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    
    // Controls (limited for 2D)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // Disable rotation for 2D
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: undefined, // Disable left mouse for orbit, we use it for drawing
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    
    // Groups for organization
    const gridGroup = new THREE.Group();
    gridGroup.name = 'grid';
    scene.add(gridGroup);
    
    const elementsGroup = new THREE.Group();
    elementsGroup.name = 'elements';
    scene.add(elementsGroup);
    
    const previewGroup = new THREE.Group();
    previewGroup.name = 'preview';
    scene.add(previewGroup);
    
    const snapGroup = new THREE.Group();
    snapGroup.name = 'snap';
    scene.add(snapGroup);
    
    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      gridGroup,
      elementsGroup,
      previewGroup,
      snapGroup,
    };
    
    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      sceneRef.current = null;
    };
  }, [sketchState.plane.type, width, height]);

  // Update grid when visibility changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { gridGroup } = sceneRef.current;
    
    // Clear existing grid
    while (gridGroup.children.length > 0) {
      const child = gridGroup.children[0];
      gridGroup.remove(child);
      if ((child as THREE.Line).geometry) {
        (child as THREE.Line).geometry.dispose();
      }
    }
    
    if (sketchState.gridVisible) {
      const gridGeometry = createGridGeometry(20, Math.floor(20 / sketchState.gridSize));
      const gridMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
      const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
      
      // Rotate grid based on plane
      switch (sketchState.plane.type) {
        case 'XZ':
          grid.rotation.x = Math.PI / 2;
          break;
        case 'YZ':
          grid.rotation.y = Math.PI / 2;
          break;
      }
      
      gridGroup.add(grid);
    }
  }, [sketchState.gridVisible, sketchState.gridSize, sketchState.plane.type]);

  // Update elements visualization
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { elementsGroup } = sceneRef.current;
    
    // Clear existing elements
    while (elementsGroup.children.length > 0) {
      const child = elementsGroup.children[0];
      elementsGroup.remove(child);
      if ((child as THREE.Line).geometry) {
        (child as THREE.Line).geometry.dispose();
      }
      if ((child as THREE.Line).material) {
        ((child as THREE.Line).material as THREE.Material).dispose();
      }
    }
    
    // Add elements
    for (const element of sketchState.elements) {
      const geometry = createElementGeometry(element, sketchState.plane);
      const color = element.selected ? COLORS.elementSelected : COLORS.element;
      const material = new THREE.LineBasicMaterial({ 
        color, 
        linewidth: element.selected ? 2 : 1 
      });
      const line = new THREE.LineSegments(geometry, material);
      line.userData.elementId = element.id;
      elementsGroup.add(line);
    }
  }, [sketchState.elements, sketchState.plane]);

  // Update preview
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { previewGroup } = sceneRef.current;
    
    // Clear preview
    while (previewGroup.children.length > 0) {
      const child = previewGroup.children[0];
      previewGroup.remove(child);
      if ((child as THREE.Line).geometry) {
        (child as THREE.Line).geometry.dispose();
      }
    }
    
    // Add preview if drawing
    if (drawingState.previewElement) {
      const geometry = createElementGeometry(drawingState.previewElement, sketchState.plane);
      const material = new THREE.LineBasicMaterial({ 
        color: COLORS.preview, 
        linewidth: 1,
        transparent: true,
        opacity: 0.7,
      });
      const line = new THREE.LineSegments(geometry, material);
      previewGroup.add(line);
    }
  }, [drawingState.previewElement, sketchState.plane]);

  // Update snap indicator
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { snapGroup } = sceneRef.current;
    
    // Clear snap indicators
    while (snapGroup.children.length > 0) {
      const child = snapGroup.children[0];
      snapGroup.remove(child);
    }
    
    // Add snap indicator if snapping
    if (currentSnap && drawingState.currentPoint) {
      const indicator = createSnapIndicator(drawingState.currentPoint, currentSnap, sketchState.plane);
      snapGroup.add(indicator);
    }
  }, [currentSnap, drawingState.currentPoint, sketchState.plane]);

  // Get mouse position in 2D sketch coordinates
  const getMousePosition = useCallback((event: MouseEvent): Point2D | null => {
    if (!sceneRef.current || !containerRef.current) return null;
    
    const { camera, renderer, raycaster, mouse } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    return projectRayToPlane(
      raycaster.ray.origin,
      raycaster.ray.direction,
      sketchState.plane
    );
  }, [sketchState.plane]);

  // Mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const rawPoint = getMousePosition(event);
    if (!rawPoint) return;
    
    // Apply snapping
    const { point: snappedPoint, snap } = applySnap(rawPoint, sketchState);
    setCurrentSnap(snap);
    
    onCursorMove(snappedPoint);
    
    // Update drawing preview
    if (drawingState.isDrawing && drawingState.startPoint) {
      setDrawingState(prev => {
        let previewElement: SketchElement | null = null;
        
        switch (sketchState.currentTool) {
          case 'line':
            previewElement = createLineElement(prev.startPoint!, snappedPoint);
            break;
          case 'rectangle':
            previewElement = createRectangleElement(prev.startPoint!, snappedPoint);
            break;
          case 'circle':
            const radius = Math.sqrt(
              Math.pow(snappedPoint.x - prev.startPoint!.x, 2) +
              Math.pow(snappedPoint.y - prev.startPoint!.y, 2)
            );
            previewElement = createCircleElement(prev.startPoint!, radius);
            break;
          case 'arc':
            if (prev.points.length === 1) {
              // Drawing from center to first point (radius)
              const r = Math.sqrt(
                Math.pow(snappedPoint.x - prev.startPoint!.x, 2) +
                Math.pow(snappedPoint.y - prev.startPoint!.y, 2)
              );
              previewElement = createCircleElement(prev.startPoint!, r);
            } else if (prev.points.length >= 2) {
              // Drawing arc
              const center = prev.startPoint!;
              const r = Math.sqrt(
                Math.pow(prev.points[1].x - center.x, 2) +
                Math.pow(prev.points[1].y - center.y, 2)
              );
              const startAngle = Math.atan2(prev.points[1].y - center.y, prev.points[1].x - center.x);
              const endAngle = Math.atan2(snappedPoint.y - center.y, snappedPoint.x - center.x);
              previewElement = createArcElement(center, r, startAngle, endAngle);
            }
            break;
          case 'polyline':
            if (prev.points.length > 0) {
              const allPoints = [...prev.points, snappedPoint];
              previewElement = createPolylineElement(allPoints);
            } else {
              previewElement = createLineElement(prev.startPoint!, snappedPoint);
            }
            break;
        }
        
        return { ...prev, currentPoint: snappedPoint, previewElement };
      });
    }
    
    // Handle dragging selected elements
    if (isDragging && dragStart && sketchState.selectedIds.length > 0) {
      const delta = {
        x: snappedPoint.x - dragStart.x,
        y: snappedPoint.y - dragStart.y,
      };
      
      const newElements = sketchState.elements.map(el =>
        sketchState.selectedIds.includes(el.id) ? moveElement(el, delta) : el
      );
      
      onStateChange({ ...sketchState, elements: newElements });
      setDragStart(snappedPoint);
    }
  }, [sketchState, drawingState, isDragging, dragStart, getMousePosition, onCursorMove, onStateChange]);

  // Mouse down handler
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    const rawPoint = getMousePosition(event);
    if (!rawPoint) return;
    
    const { point: snappedPoint } = applySnap(rawPoint, sketchState);
    
    if (sketchState.currentTool === 'select') {
      // Hit test for selection
      const hitElement = hitTestElements(snappedPoint, sketchState.elements, 0.2);
      
      if (hitElement) {
        const newState = selectElement(sketchState, hitElement.id, event.shiftKey);
        onStateChange(newState);
        
        // Start drag
        setIsDragging(true);
        setDragStart(snappedPoint);
      } else {
        onStateChange(clearSelection(sketchState));
      }
    } else {
      // Start drawing
      if (sketchState.currentTool === 'polyline' && drawingState.isDrawing) {
        // Continue polyline
        setDrawingState(prev => ({
          ...prev,
          points: [...prev.points, snappedPoint],
        }));
      } else if (sketchState.currentTool === 'arc' && drawingState.isDrawing) {
        // Arc needs 3 clicks
        setDrawingState(prev => ({
          ...prev,
          points: [...prev.points, snappedPoint],
        }));
      } else {
        // Start new drawing
        setDrawingState({
          isDrawing: true,
          startPoint: snappedPoint,
          currentPoint: snappedPoint,
          points: [snappedPoint],
          previewElement: null,
        });
      }
    }
  }, [sketchState, drawingState, getMousePosition, onStateChange]);

  // Mouse up handler
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button !== 0) return;
    
    const rawPoint = getMousePosition(event);
    if (!rawPoint) return;
    
    const { point: snappedPoint } = applySnap(rawPoint, sketchState);
    
    // End dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }
    
    // Finish drawing based on tool
    if (drawingState.isDrawing && drawingState.startPoint) {
      let newElement: SketchElement | null = null;
      let finishDrawing = true;
      
      switch (sketchState.currentTool) {
        case 'line':
          if (Math.abs(snappedPoint.x - drawingState.startPoint.x) > 0.01 ||
              Math.abs(snappedPoint.y - drawingState.startPoint.y) > 0.01) {
            newElement = createLineElement(drawingState.startPoint, snappedPoint);
          }
          break;
          
        case 'rectangle':
          if (Math.abs(snappedPoint.x - drawingState.startPoint.x) > 0.01 &&
              Math.abs(snappedPoint.y - drawingState.startPoint.y) > 0.01) {
            newElement = createRectangleElement(drawingState.startPoint, snappedPoint);
          }
          break;
          
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(snappedPoint.x - drawingState.startPoint.x, 2) +
            Math.pow(snappedPoint.y - drawingState.startPoint.y, 2)
          );
          if (radius > 0.01) {
            newElement = createCircleElement(drawingState.startPoint, radius);
          }
          break;
          
        case 'arc':
          // Arc requires 3 points, don't finish yet
          if (drawingState.points.length < 3) {
            finishDrawing = false;
          } else {
            const center = drawingState.startPoint;
            const r = Math.sqrt(
              Math.pow(drawingState.points[1].x - center.x, 2) +
              Math.pow(drawingState.points[1].y - center.y, 2)
            );
            const startAngle = Math.atan2(drawingState.points[1].y - center.y, drawingState.points[1].x - center.x);
            const endAngle = Math.atan2(snappedPoint.y - center.y, snappedPoint.x - center.x);
            newElement = createArcElement(center, r, startAngle, endAngle);
          }
          break;
          
        case 'polyline':
          // Polyline continues until double-click or Escape
          finishDrawing = false;
          break;
      }
      
      if (newElement) {
        onStateChange({
          ...sketchState,
          elements: [...sketchState.elements, newElement],
        });
      }
      
      if (finishDrawing) {
        setDrawingState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          points: [],
          previewElement: null,
        });
      }
    }
  }, [sketchState, drawingState, isDragging, getMousePosition, onStateChange]);

  // Double click handler (finish polyline)
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    if (sketchState.currentTool === 'polyline' && drawingState.isDrawing && drawingState.points.length >= 2) {
      const newElement = createPolylineElement(drawingState.points);
      onStateChange({
        ...sketchState,
        elements: [...sketchState.elements, newElement],
      });
      
      setDrawingState({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        points: [],
        previewElement: null,
      });
    }
  }, [sketchState, drawingState, onStateChange]);

  // Keyboard handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        // Cancel current drawing
        setDrawingState({
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          points: [],
          previewElement: null,
        });
        onStateChange(clearSelection(sketchState));
        break;
        
      case 'Delete':
      case 'Backspace':
        // Delete selected elements
        if (sketchState.selectedIds.length > 0) {
          event.preventDefault();
          onStateChange(deleteElements(sketchState, sketchState.selectedIds));
        }
        break;
        
      // Tool shortcuts
      case 'v':
      case 'V':
        onStateChange({ ...sketchState, currentTool: 'select' });
        break;
      case 'l':
      case 'L':
        onStateChange({ ...sketchState, currentTool: 'line' });
        break;
      case 'r':
      case 'R':
        onStateChange({ ...sketchState, currentTool: 'rectangle' });
        break;
      case 'c':
      case 'C':
        onStateChange({ ...sketchState, currentTool: 'circle' });
        break;
      case 'a':
      case 'A':
        onStateChange({ ...sketchState, currentTool: 'arc' });
        break;
      case 'p':
      case 'P':
        onStateChange({ ...sketchState, currentTool: 'polyline' });
        break;
    }
  }, [sketchState, onStateChange]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('keydown', handleKeyDown);
    
    // Set cursor based on tool
    canvas.style.cursor = sketchState.currentTool === 'select' ? 'default' : 'crosshair';
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleDoubleClick, handleKeyDown, sketchState.currentTool]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      data-testid="sketch-canvas"
    />
  );
}

export default SketchCanvas;
