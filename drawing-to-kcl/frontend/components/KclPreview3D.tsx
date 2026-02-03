import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import {
  computeBoundingBox,
  computeCameraForBounds,
  BoundingBox,
} from '../lib/threeCameraUtils';
import { SectionEngine, PlaneType, SectionEngineState, createDefaultSectionState } from '../lib/sectionEngine';
import { SectionControls } from './SectionControls';
import { getMaterialEngine, MaterialEngine } from '../lib/materialEngine';
import { MaterialProperties } from '../lib/materialPresets';
import type { EditMode, Transform } from '@/hooks/useDirectEdit';

type MeshPreview = {
  id?: string | null;
  vertices: [number, number, number][];
  indices: number[];
};

type PreviewLike = {
  meshes?: MeshPreview[];
};

export interface FaceSelection {
  meshId: string | null;
  faceIndex: number;
  normal: [number, number, number];
  center: [number, number, number];
}

export type ViewType = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'perspective';

export interface KclPreview3DRef {
  setView: (view: ViewType) => void;
  focusOnSelection: () => void;
  resetCamera: () => void;
  getCurrentView: () => ViewType;
  /** Update material for a specific mesh */
  updateMeshMaterial: (meshId: string) => void;
  /** Update all mesh materials from the material engine */
  refreshMaterials: () => void;
  /** Live update material properties on a mesh (for preview) */
  updateMaterialLive: (meshId: string, properties: Partial<MaterialProperties>) => void;
  /** Get scene reference for external use */
  getSceneRef: () => SceneRef | null;
  /** Get mesh by ID */
  getMeshById: (meshId: string) => THREE.Mesh | null;
  /** Update gizmo target */
  setGizmoTarget: (meshId: string | null) => void;
  /** Set gizmo mode */
  setGizmoMode: (mode: 'translate' | 'rotate' | 'scale') => void;
}

export interface SceneRef {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  transformControls: TransformControls | null;
  meshes: THREE.Mesh[];
  highlightMesh: THREE.Mesh | null;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  sectionEngine: SectionEngine | null;
}

export interface KclPreview3DProps {
  preview: unknown;
  onFaceSelect?: (selection: FaceSelection | null) => void;
  selectedFace?: FaceSelection | null;
  editMode?: boolean;
  showSectionControls?: boolean;
  onSectionPanelClose?: () => void;
  onViewChange?: (view: ViewType) => void;
  /** Enable material system integration */
  enableMaterials?: boolean;
  /** Callback when mesh selection changes (for material panel) */
  onMeshSelect?: (meshId: string | null) => void;
  /** Material engine instance (uses singleton if not provided) */
  materialEngine?: MaterialEngine;
  /** Direct edit mode */
  directEditMode?: EditMode;
  /** Show transform gizmo */
  showGizmo?: boolean;
  /** Selected mesh ID for gizmo */
  selectedMeshId?: string | null;
  /** Callback when transform changes */
  onTransformChange?: (transform: Transform) => void;
  /** Callback when transform ends */
  onTransformEnd?: (transform: Transform) => void;
  /** Callback for push/pull drag */
  onPushPullDrag?: (delta: number) => void;
  /** Callback for push/pull end */
  onPushPullEnd?: (delta: number) => void;
}

function getAllRenderableMeshes(preview: unknown): MeshPreview[] {
  const { meshes } = (preview as PreviewLike) ?? {};
  if (!meshes || meshes.length === 0) {
    return [];
  }
  return meshes.filter(m => m.vertices && m.vertices.length > 0);
}

/**
 * Extract transform from THREE.Object3D
 */
function extractTransform(object: THREE.Object3D): Transform {
  const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'XYZ');
  
  return {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [
      THREE.MathUtils.radToDeg(euler.x),
      THREE.MathUtils.radToDeg(euler.y),
      THREE.MathUtils.radToDeg(euler.z),
    ],
    scale: [object.scale.x, object.scale.y, object.scale.z],
  };
}

/**
 * Three.js-based preview renderer with face selection and transform gizmo support.
 */
export const KclPreview3D = forwardRef<KclPreview3DRef, KclPreview3DProps>(({ 
  preview, 
  onFaceSelect,
  selectedFace,
  editMode = false,
  showSectionControls = true,
  onSectionPanelClose,
  onViewChange,
  enableMaterials = true,
  onMeshSelect,
  materialEngine: providedMaterialEngine,
  directEditMode = 'select',
  showGizmo = false,
  selectedMeshId = null,
  onTransformChange,
  onTransformEnd,
  onPushPullDrag,
  onPushPullEnd,
}, ref) => {
  // Material engine (use provided or singleton)
  const materialEngine = providedMaterialEngine ?? getMaterialEngine();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boundsRef = useRef<BoundingBox | null>(null);
  const currentViewRef = useRef<ViewType>('perspective');
  const sceneRef = useRef<SceneRef | null>(null);
  const pushPullStateRef = useRef<{
    active: boolean;
    startY: number;
    startHeight: number;
  }>({ active: false, startY: 0, startHeight: 0 });

  // Camera view functions
  const setView = useCallback((view: ViewType) => {
    if (!sceneRef.current) return;
    
    const { camera, controls } = sceneRef.current;
    const bounds = boundsRef.current;
    const center = bounds?.center || [0, 0, 0];
    const distance = bounds ? Math.max(bounds.radius * 2.5, 3) : 5;
    
    let position: [number, number, number];
    
    switch (view) {
      case 'front':
        position = [center[0], center[1], center[2] + distance];
        break;
      case 'back':
        position = [center[0], center[1], center[2] - distance];
        break;
      case 'left':
        position = [center[0] - distance, center[1], center[2]];
        break;
      case 'right':
        position = [center[0] + distance, center[1], center[2]];
        break;
      case 'top':
        position = [center[0], center[1] + distance, center[2]];
        break;
      case 'bottom':
        position = [center[0], center[1] - distance, center[2]];
        break;
      case 'perspective':
      default:
        position = [
          center[0] + distance * 0.5,
          center[1] + distance * 0.5,
          center[2] + distance * 0.5,
        ];
        break;
    }
    
    camera.position.set(...position);
    controls.target.set(center[0], center[1], center[2]);
    controls.update();
    
    currentViewRef.current = view;
    onViewChange?.(view);
  }, [onViewChange]);

  const focusOnSelection = useCallback(() => {
    if (!sceneRef.current || !selectedFace) return;
    
    const { camera, controls } = sceneRef.current;
    const center = selectedFace.center;
    const distance = 3;
    
    // Position camera along the face normal
    const normal = selectedFace.normal;
    camera.position.set(
      center[0] + normal[0] * distance,
      center[1] + normal[1] * distance,
      center[2] + normal[2] * distance
    );
    controls.target.set(center[0], center[1], center[2]);
    controls.update();
  }, [selectedFace]);

  const resetCamera = useCallback(() => {
    setView('perspective');
  }, [setView]);

  const getCurrentView = useCallback(() => {
    return currentViewRef.current;
  }, []);

  // Material update functions
  const updateMeshMaterial = useCallback((meshId: string) => {
    if (!sceneRef.current || !enableMaterials || !materialEngine) return;
    
    const mesh = sceneRef.current.meshes.find(m => m.userData.meshId === meshId);
    if (mesh) {
      const newMaterial = materialEngine.getMaterialForMesh(meshId);
      newMaterial.flatShading = true;
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      mesh.material = newMaterial;
    }
  }, [enableMaterials, materialEngine]);

  const refreshMaterials = useCallback(() => {
    if (!sceneRef.current || !enableMaterials || !materialEngine) return;
    
    sceneRef.current.meshes.forEach(mesh => {
      const meshId = mesh.userData.meshId;
      if (meshId) {
        const newMaterial = materialEngine.getMaterialForMesh(meshId);
        newMaterial.flatShading = true;
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        mesh.material = newMaterial;
      }
    });
  }, [enableMaterials, materialEngine]);

  const updateMaterialLive = useCallback((meshId: string, properties: Partial<MaterialProperties>) => {
    if (!sceneRef.current) return;
    
    const mesh = sceneRef.current.meshes.find(m => m.userData.meshId === meshId);
    if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      if (properties.color !== undefined) {
        mesh.material.color.set(properties.color);
      }
      if (properties.metalness !== undefined) {
        mesh.material.metalness = properties.metalness;
      }
      if (properties.roughness !== undefined) {
        mesh.material.roughness = properties.roughness;
      }
      if (properties.opacity !== undefined) {
        mesh.material.opacity = properties.opacity;
        mesh.material.transparent = properties.opacity < 1;
        mesh.material.depthWrite = properties.opacity >= 1;
      }
      mesh.material.needsUpdate = true;
    }
  }, []);

  const getSceneRef = useCallback(() => {
    return sceneRef.current;
  }, []);

  const getMeshById = useCallback((meshId: string): THREE.Mesh | null => {
    if (!sceneRef.current) return null;
    return sceneRef.current.meshes.find(m => m.userData.meshId === meshId) || null;
  }, []);

  const setGizmoTarget = useCallback((meshId: string | null) => {
    if (!sceneRef.current?.transformControls) return;
    
    const tc = sceneRef.current.transformControls;
    
    if (meshId) {
      const mesh = sceneRef.current.meshes.find(m => m.userData.meshId === meshId);
      if (mesh) {
        tc.attach(mesh);
        (tc as unknown as THREE.Object3D).visible = true;
      }
    } else {
      tc.detach();
      (tc as unknown as THREE.Object3D).visible = false;
    }
  }, []);

  const setGizmoMode = useCallback((mode: 'translate' | 'rotate' | 'scale') => {
    if (!sceneRef.current?.transformControls) return;
    sceneRef.current.transformControls.setMode(mode);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setView,
    focusOnSelection,
    resetCamera,
    getCurrentView,
    updateMeshMaterial,
    refreshMaterials,
    updateMaterialLive,
    getSceneRef,
    getMeshById,
    setGizmoTarget,
    setGizmoMode,
  }), [setView, focusOnSelection, resetCamera, getCurrentView, updateMeshMaterial, refreshMaterials, updateMaterialLive, getSceneRef, getMeshById, setGizmoTarget, setGizmoMode]);

  // Section state management
  const [sectionState, setSectionState] = useState<SectionEngineState>(createDefaultSectionState());

  // Section control handlers
  const handleToggleSectionEnabled = useCallback((enabled: boolean) => {
    if (sceneRef.current?.sectionEngine) {
      sceneRef.current.sectionEngine.setEnabled(enabled);
      setSectionState(sceneRef.current.sectionEngine.getState());
    }
  }, []);

  const handleTogglePlane = useCallback((type: PlaneType, enabled: boolean) => {
    if (sceneRef.current?.sectionEngine) {
      sceneRef.current.sectionEngine.updatePlane(type, { enabled });
      setSectionState(sceneRef.current.sectionEngine.getState());
    }
  }, []);

  const handlePositionChange = useCallback((type: PlaneType, position: number) => {
    if (sceneRef.current?.sectionEngine) {
      sceneRef.current.sectionEngine.updatePlane(type, { position });
      setSectionState(sceneRef.current.sectionEngine.getState());
    }
  }, []);

  const handleFlipPlane = useCallback((type: PlaneType, flip: boolean) => {
    if (sceneRef.current?.sectionEngine) {
      sceneRef.current.sectionEngine.updatePlane(type, { flip });
      setSectionState(sceneRef.current.sectionEngine.getState());
    }
  }, []);

  const getPlaneRange = useCallback((type: PlaneType) => {
    if (sceneRef.current?.sectionEngine) {
      return sceneRef.current.sectionEngine.getPlaneRange(type);
    }
    return { min: -10, max: 10 };
  }, []);

  // Handle mouse click for face/object selection
  const handleClick = useCallback((event: MouseEvent) => {
    if (!sceneRef.current || !editMode) return;
    
    const { renderer, camera, meshes, raycaster, mouse, scene, transformControls } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const faceIndex = hit.faceIndex ?? 0;
      const face = hit.face;
      const hitMesh = hit.object as THREE.Mesh;
      const meshId = hitMesh.userData.meshId || null;
      
      if (face && onFaceSelect) {
        // Calculate face center
        const geometry = hitMesh.geometry;
        const position = geometry.getAttribute('position');
        const indices = geometry.index;
        
        let v0: THREE.Vector3, v1: THREE.Vector3, v2: THREE.Vector3;
        if (indices) {
          const i = faceIndex * 3;
          v0 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i));
          v1 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 1));
          v2 = new THREE.Vector3().fromBufferAttribute(position, indices.getX(i + 2));
        } else {
          const i = faceIndex * 3;
          v0 = new THREE.Vector3().fromBufferAttribute(position, i);
          v1 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
          v2 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
        }
        
        const center = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3);
        
        const selection: FaceSelection = {
          meshId,
          faceIndex,
          normal: [face.normal.x, face.normal.y, face.normal.z],
          center: [center.x, center.y, center.z],
        };
        
        onFaceSelect(selection);
        
        // Highlight selected face
        highlightFace(scene, hitMesh, faceIndex);
      }
      
      onMeshSelect?.(meshId);
      
      // Attach transform controls if in transform mode
      if (transformControls && showGizmo && directEditMode !== 'select' && directEditMode !== 'pushpull') {
        transformControls.attach(hitMesh);
        (transformControls as unknown as THREE.Object3D).visible = true;
      }
    } else {
      onFaceSelect?.(null);
      onMeshSelect?.(null);
      clearHighlight(scene);
      
      if (transformControls) {
        transformControls.detach();
        (transformControls as unknown as THREE.Object3D).visible = false;
      }
    }
  }, [editMode, onFaceSelect, onMeshSelect, showGizmo, directEditMode]);

  // Push/Pull mouse handlers
  const handlePushPullMouseDown = useCallback((event: MouseEvent) => {
    if (!sceneRef.current || directEditMode !== 'pushpull' || !selectedFace) return;
    
    pushPullStateRef.current = {
      active: true,
      startY: event.clientY,
      startHeight: 0,
    };
    
    sceneRef.current.controls.enabled = false;
  }, [directEditMode, selectedFace]);

  const handlePushPullMouseMove = useCallback((event: MouseEvent) => {
    if (!pushPullStateRef.current.active || directEditMode !== 'pushpull') return;
    
    const delta = (pushPullStateRef.current.startY - event.clientY) * 0.01;
    onPushPullDrag?.(delta);
  }, [directEditMode, onPushPullDrag]);

  const handlePushPullMouseUp = useCallback((event: MouseEvent) => {
    if (!pushPullStateRef.current.active || directEditMode !== 'pushpull') return;
    
    const delta = (pushPullStateRef.current.startY - event.clientY) * 0.01;
    onPushPullEnd?.(delta);
    
    pushPullStateRef.current = { active: false, startY: 0, startHeight: 0 };
    
    if (sceneRef.current) {
      sceneRef.current.controls.enabled = true;
    }
  }, [directEditMode, onPushPullEnd]);

  // Highlight a specific face
  const highlightFace = (scene: THREE.Scene, mesh: THREE.Mesh, faceIndex: number) => {
    clearHighlight(scene);
    
    const geometry = mesh.geometry;
    const indices = geometry.index;
    const position = geometry.getAttribute('position');
    
    // Create highlight geometry for the selected face
    const highlightGeom = new THREE.BufferGeometry();
    const vertices: number[] = [];
    
    if (indices) {
      const i = faceIndex * 3;
      for (let j = 0; j < 3; j++) {
        const idx = indices.getX(i + j);
        vertices.push(
          position.getX(idx),
          position.getY(idx),
          position.getZ(idx)
        );
      }
    }
    
    highlightGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    
    const highlightMesh = new THREE.Mesh(highlightGeom, highlightMat);
    highlightMesh.name = 'faceHighlight';
    highlightMesh.renderOrder = 999;
    scene.add(highlightMesh);
    
    if (sceneRef.current) {
      sceneRef.current.highlightMesh = highlightMesh;
    }
  };

  const clearHighlight = (scene: THREE.Scene) => {
    const existing = scene.getObjectByName('faceHighlight');
    if (existing) {
      scene.remove(existing);
      (existing as THREE.Mesh).geometry.dispose();
      ((existing as THREE.Mesh).material as THREE.Material).dispose();
    }
    if (sceneRef.current) {
      sceneRef.current.highlightMesh = null;
    }
  };

  // Update gizmo when mode changes
  useEffect(() => {
    if (!sceneRef.current?.transformControls) return;
    
    const tc = sceneRef.current.transformControls;
    
    if (directEditMode === 'translate') {
      tc.setMode('translate');
    } else if (directEditMode === 'rotate') {
      tc.setMode('rotate');
    } else if (directEditMode === 'scale') {
      tc.setMode('scale');
    }
    
    (tc as unknown as THREE.Object3D).visible = showGizmo && selectedMeshId !== null && 
      directEditMode !== 'select' && directEditMode !== 'pushpull';
  }, [directEditMode, showGizmo, selectedMeshId]);

  // Update gizmo target when selection changes
  useEffect(() => {
    if (!sceneRef.current?.transformControls) return;
    
    const tc = sceneRef.current.transformControls;
    
    if (selectedMeshId && showGizmo) {
      const mesh = sceneRef.current.meshes.find(m => m.userData.meshId === selectedMeshId);
      if (mesh) {
        tc.attach(mesh);
      }
    } else {
      tc.detach();
    }
  }, [selectedMeshId, showGizmo]);

  useEffect(() => {
    if (!containerRef.current) return;

    const meshPreviews = getAllRenderableMeshes(preview);
    if (meshPreviews.length === 0) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let transformControls: TransformControls | null = null;
    let animationFrameId: number | null = null;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    try {
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 300;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x09090b);
      
      // Compute combined bounding box
      const allVertices = meshPreviews.flatMap(m => m.vertices);
      const bounds = computeBoundingBox(allVertices);
      boundsRef.current = bounds; // Store for view functions
      const aspect = width / height;
      
      let camera: THREE.PerspectiveCamera;
      if (bounds) {
        const cameraParams = computeCameraForBounds(bounds, aspect);
        camera = new THREE.PerspectiveCamera(45, aspect, cameraParams.near, cameraParams.far);
        camera.position.set(...cameraParams.position);
        camera.lookAt(...cameraParams.lookAt);
      } else {
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
      }

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setClearColor(0x09090b, 1);
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);

      // Lighting - fully bright, no shadows
      const light = new THREE.DirectionalLight(0xffffff, 0.4);
      light.position.set(5, 8, 7);
      scene.add(light);
      // Very strong ambient - almost flat lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      
      // Add grid helper
      const gridHelper = new THREE.GridHelper(10, 10, 0x00d4ff, 0x1c232d);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      // Create meshes
      const threeMeshes: THREE.Mesh[] = [];
      
      meshPreviews.forEach((meshPreview, index) => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(meshPreview.vertices.flat());
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (meshPreview.indices && meshPreview.indices.length > 0) {
          geometry.setIndex(meshPreview.indices);
        }
        geometry.computeVertexNormals();
        geometries.push(geometry);

        const meshId = meshPreview.id || `mesh_${index}`;
        
        // Use material engine if enabled, otherwise fallback to default
        let material: THREE.MeshStandardMaterial;
        if (enableMaterials && materialEngine) {
          material = materialEngine.getMaterialForMesh(meshId);
          material.flatShading = true;
          material.side = THREE.DoubleSide; // Prevent back-face culling at grazing angles
        } else {
          material = new THREE.MeshStandardMaterial({ 
            color: 0xffaa44,
            flatShading: true,
            side: THREE.DoubleSide,
          });
        }
        // Prevent z-fighting between mesh and edge lines at certain view angles
        material.polygonOffset = true;
        material.polygonOffsetFactor = 1;
        material.polygonOffsetUnits = 1;
        // Opaque meshes must write to depth buffer for correct ordering
        if (!material.transparent) {
          material.depthWrite = true;
        }
        material.needsUpdate = true;
        materials.push(material);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.meshId = meshId;
        mesh.userData.meshIndex = index;
        scene.add(mesh);
        threeMeshes.push(mesh);
        
        // Add edge lines for clear boundaries - render after mesh to avoid z-fighting
        const edgeGeometry = new THREE.EdgesGeometry(geometry, 25); // 25° threshold reduces visual clutter
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0x333333,
          depthTest: true,
          depthWrite: false, // edges don't occlude mesh
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.name = `edges_${index}`;
        edges.renderOrder = 1;
        scene.add(edges);
        
        // Add wireframe for edit mode
        if (editMode) {
          const wireframeMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, opacity: 0.3, transparent: true });
          const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            wireframeMat
          );
          wireframe.name = `wireframe_${index}`;
          scene.add(wireframe);
        }
      });

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;

      // Initialize TransformControls
      transformControls = new TransformControls(camera, renderer.domElement);
      transformControls.setSize(0.8);
      (transformControls as unknown as THREE.Object3D).visible = false;
      scene.add(transformControls as unknown as THREE.Object3D);

      // TransformControls event handlers
      transformControls.addEventListener('dragging-changed', (event) => {
        // Disable orbit controls while dragging gizmo
        controls!.enabled = !event.value;
      });

      transformControls.addEventListener('change', () => {
        if (transformControls!.object) {
          const transform = extractTransform(transformControls!.object);
          onTransformChange?.(transform);
        }
      });

      transformControls.addEventListener('mouseUp', () => {
        if (transformControls!.object) {
          const transform = extractTransform(transformControls!.object);
          onTransformEnd?.(transform);
        }
      });

      // Initialize section engine
      const sectionEngine = new SectionEngine(renderer, scene);
      
      // Calculate bounds for section planes
      if (bounds) {
        const box = new THREE.Box3(
          new THREE.Vector3(bounds.min[0], bounds.min[1], bounds.min[2]),
          new THREE.Vector3(bounds.max[0], bounds.max[1], bounds.max[2])
        );
        sectionEngine.setBounds(box);
      }

      // Store references for raycasting
      sceneRef.current = {
        scene,
        camera,
        renderer,
        controls,
        transformControls,
        meshes: threeMeshes,
        highlightMesh: null,
        raycaster: new THREE.Raycaster(),
        mouse: new THREE.Vector2(),
        sectionEngine,
      };
      
      // Update section state
      setSectionState(sectionEngine.getState());

      // Add click listener for face selection
      if (editMode) {
        renderer.domElement.addEventListener('click', handleClick);
        renderer.domElement.addEventListener('mousedown', handlePushPullMouseDown);
        renderer.domElement.addEventListener('mousemove', handlePushPullMouseMove);
        renderer.domElement.addEventListener('mouseup', handlePushPullMouseUp);
        renderer.domElement.style.cursor = 'crosshair';
      }

      const animate = () => {
        if (renderer && controls) {
          controls.update();
          renderer.render(scene, camera);
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      animate();
    } catch (error) {
      console.warn('Failed to initialize Three.js renderer:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (renderer) {
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.domElement.removeEventListener('mousedown', handlePushPullMouseDown);
        renderer.domElement.removeEventListener('mousemove', handlePushPullMouseMove);
        renderer.domElement.removeEventListener('mouseup', handlePushPullMouseUp);
      }
      if (transformControls) {
        transformControls.detach();
        transformControls.dispose();
      }
      if (controls) {
        controls.dispose();
      }
      if (sceneRef.current?.sectionEngine) {
        sceneRef.current.sectionEngine.dispose();
      }
      if (renderer) {
        renderer.dispose();
      }
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      sceneRef.current = null;
    };
  }, [preview, editMode, handleClick, handlePushPullMouseDown, handlePushPullMouseMove, handlePushPullMouseUp, enableMaterials, materialEngine, onTransformChange, onTransformEnd]);

  // Determine cursor based on mode
  const getCursor = () => {
    switch (directEditMode) {
      case 'translate':
        return 'move';
      case 'rotate':
        return 'crosshair';
      case 'scale':
        return 'nwse-resize';
      case 'pushpull':
        return 'ns-resize';
      default:
        return editMode ? 'crosshair' : 'default';
    }
  };

  return (
    <div className="relative w-full h-full min-h-0">
      <div 
        ref={containerRef} 
        className="w-full h-full" 
        data-testid="kcl-preview-3d"
        style={{ cursor: getCursor() }}
      />
      
      {/* Direct Edit Mode Indicator */}
      {editMode && directEditMode !== 'select' && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-cyan/20 border border-cyan/30 rounded-lg text-xs font-medium text-cyan">
          {directEditMode === 'translate' && '↔ Move Mode (G)'}
          {directEditMode === 'rotate' && '↻ Rotate Mode (R)'}
          {directEditMode === 'scale' && '⬡ Scale Mode (S)'}
          {directEditMode === 'pushpull' && '⬆ Push/Pull Mode (P)'}
        </div>
      )}
      
      {/* Section Controls UI */}
      {showSectionControls && (
        <div className="absolute top-3 right-3 z-10">
          <SectionControls
            state={sectionState}
            onToggleEnabled={handleToggleSectionEnabled}
            onTogglePlane={handleTogglePlane}
            onPositionChange={handlePositionChange}
            onFlipPlane={handleFlipPlane}
            getPlaneRange={getPlaneRange}
            onClose={onSectionPanelClose}
          />
        </div>
      )}
    </div>
  );
});

KclPreview3D.displayName = 'KclPreview3D';
