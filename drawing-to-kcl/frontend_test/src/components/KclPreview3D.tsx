import React, { useEffect, useRef } from 'react';
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

export interface KclPreview3DProps {
  preview: unknown;
}

function getFirstRenderableMesh(preview: unknown): MeshPreview | null {
  const { meshes } = (preview as PreviewLike) ?? {};
  if (!meshes || meshes.length === 0) {
    return null;
  }
  const meshPreview = meshes[0];
  if (!meshPreview.vertices || meshPreview.vertices.length === 0) {
    return null;
  }
  return meshPreview;
}

/**
 * Very small Three.js-based preview renderer.
 *
 * It expects the `preview` object to follow the KclPreview JSON contract:
 * `{ meshes: [{ vertices: [[x,y,z],...], indices: [0,1,2,...] }, ...] }`
 *
 * For now we render only the first mesh, centered and with a simple camera/light.
 */
export const KclPreview3D: React.FC<KclPreview3DProps> = ({ preview }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const meshPreview = getFirstRenderableMesh(preview);
    if (!meshPreview) return;

    // Wrap Three.js initialization in try-catch to handle WebGL context failures
    // (e.g., in test environments or when WebGL is not available)
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;
    let sphereGeom: THREE.SphereGeometry | null = null;
    let sphereMat: THREE.MeshBasicMaterial | null = null;
    let controls: OrbitControls | null = null;
    let animationFrameId: number | null = null;

    try {
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 300;

      const scene = new THREE.Scene();

      // Compute bounding box and camera parameters
      const bounds = computeBoundingBox(meshPreview.vertices);
      const aspect = width / height;

      let camera: THREE.PerspectiveCamera;
      if (bounds) {
        // Use computed camera parameters based on bbox
        const cameraParams = computeCameraForBounds(bounds, aspect);
        camera = new THREE.PerspectiveCamera(45, aspect, cameraParams.near, cameraParams.far);
        camera.position.set(...cameraParams.position);
        camera.lookAt(...cameraParams.lookAt);
      } else {
        // Fallback to default camera position if bbox computation fails
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(2, 2, 2);
        camera.lookAt(0, 0, 0);
      }

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 5, 5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));

      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(meshPreview.vertices.flat());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (meshPreview.indices && meshPreview.indices.length > 0) {
        geometry.setIndex(meshPreview.indices);
      }
      geometry.computeVertexNormals();

      material = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        flatShading: false,
        side: THREE.DoubleSide, // Render both sides so back-facing faces are lit (avoids black triangles)
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // AxesHelper: fixed at bottom-right, orientation syncs with main camera
      const axesScene = new THREE.Scene();
      const axesSize = 80;
      const axesGroup = new THREE.Group();
      const axesHelper = new THREE.AxesHelper(1);
      axesHelper.setColors(
        new THREE.Color(0xff0000), // X = red
        new THREE.Color(0x00ff00), // Y = green
        new THREE.Color(0x0088ff)  // Z = blue
      );
      axesHelper.scale.setScalar(0.5);
      axesGroup.add(axesHelper);
      sphereGeom = new THREE.SphereGeometry(0.05, 16, 16);
      sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      axesGroup.add(sphere);
      axesScene.add(axesGroup);
      const axesCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      axesCamera.position.set(0.8, 0.8, 1.5);
      axesCamera.lookAt(0, 0, 0);

      // Create OrbitControls for mouse interaction
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const GIZMO_MARGIN = 16;
      const animate = () => {
        if (renderer && mesh && controls && containerRef.current) {
          const w = containerRef.current.clientWidth || width;
          const h = containerRef.current.clientHeight || height;
          if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
          controls.update();
          // Sync axes orientation with main camera (so they rotate as you orbit)
          axesGroup.quaternion.copy(camera.quaternion);
          renderer.render(scene, camera);
          // Axes overlay: fixed bottom-right
          renderer.setViewport(w - axesSize - GIZMO_MARGIN, GIZMO_MARGIN, axesSize, axesSize);
          renderer.setScissor(w - axesSize - GIZMO_MARGIN, GIZMO_MARGIN, axesSize, axesSize);
          renderer.setScissorTest(true);
          renderer.clearDepth(); // clear depth so axes render on top
          renderer.render(axesScene, axesCamera);
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, w, h);
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      animate();
    } catch (error) {
      // WebGL initialization failed (e.g., in test environment)
      // Silently fail - container will remain empty
      console.warn('Failed to initialize Three.js renderer:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (controls) {
        controls.dispose();
      }
      if (renderer) {
        renderer.dispose();
      }
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
      if (sphereGeom) {
        sphereGeom.dispose();
      }
      if (sphereMat) {
        sphereMat.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [preview]);

  return <div ref={containerRef} className="w-full h-full min-h-0" data-testid="kcl-preview-3d" />;
};
