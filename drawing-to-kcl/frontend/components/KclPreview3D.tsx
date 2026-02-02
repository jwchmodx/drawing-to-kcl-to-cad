import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  computeBoundingBox,
  computeCameraForBounds,
} from '../lib/threeCameraUtils';

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

export interface KclPreview3DProps {
  preview: unknown;
  onFaceSelect?: (selection: FaceSelection | null) => void;
  selectedFace?: FaceSelection | null;
  editMode?: boolean;
}

function getAllRenderableMeshes(preview: unknown): MeshPreview[] {
  const { meshes } = (preview as PreviewLike) ?? {};
  if (!meshes || meshes.length === 0) {
    return [];
  }
  return meshes.filter(m => m.vertices && m.vertices.length > 0);
}

/**
 * Three.js-based preview renderer with face selection support.
 */
export const KclPreview3D: React.FC<KclPreview3DProps> = ({ 
  preview, 
  onFaceSelect,
  selectedFace,
  editMode = false 
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    meshes: THREE.Mesh[];
    highlightMesh: THREE.Mesh | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  // Handle mouse click for face selection
  const handleClick = useCallback((event: MouseEvent) => {
    if (!sceneRef.current || !editMode || !onFaceSelect) return;
    
    const { renderer, camera, meshes, raycaster, mouse, scene } = sceneRef.current;
    const rect = renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const faceIndex = hit.faceIndex ?? 0;
      const face = hit.face;
      
      if (face) {
        // Calculate face center
        const geometry = (hit.object as THREE.Mesh).geometry;
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
        
        // Get mesh ID from userData
        const meshId = (hit.object as THREE.Mesh).userData.meshId || null;
        
        const selection: FaceSelection = {
          meshId,
          faceIndex,
          normal: [face.normal.x, face.normal.y, face.normal.z],
          center: [center.x, center.y, center.z],
        };
        
        onFaceSelect(selection);
        
        // Highlight selected face
        highlightFace(scene, hit.object as THREE.Mesh, faceIndex);
      }
    } else {
      onFaceSelect(null);
      clearHighlight(scene);
    }
  }, [editMode, onFaceSelect]);

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

  useEffect(() => {
    if (!containerRef.current) return;

    const meshPreviews = getAllRenderableMeshes(preview);
    if (meshPreviews.length === 0) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let animationFrameId: number | null = null;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    try {
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 300;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x08090b);
      
      // Compute combined bounding box
      const allVertices = meshPreviews.flatMap(m => m.vertices);
      const bounds = computeBoundingBox(allVertices);
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

        const material = new THREE.MeshBasicMaterial({ 
          color: 0xffaa44,  // Brighter orange, no lighting effects
        });
        materials.push(material);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.meshId = meshPreview.id || `mesh_${index}`;
        mesh.userData.meshIndex = index;
        scene.add(mesh);
        threeMeshes.push(mesh);
        
        // Add edge lines for clear boundaries - darker and thicker
        const edgeGeometry = new THREE.EdgesGeometry(geometry, 15); // lower threshold = more edges
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.name = `edges_${index}`;
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
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Store references for raycasting
      sceneRef.current = {
        scene,
        camera,
        renderer,
        controls,
        meshes: threeMeshes,
        highlightMesh: null,
        raycaster: new THREE.Raycaster(),
        mouse: new THREE.Vector2(),
      };

      // Add click listener for face selection
      if (editMode) {
        renderer.domElement.addEventListener('click', handleClick);
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
      }
      if (controls) {
        controls.dispose();
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
  }, [preview, editMode, handleClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-0" 
      data-testid="kcl-preview-3d"
    />
  );
};
