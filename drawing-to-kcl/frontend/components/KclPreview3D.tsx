import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

    const { meshes } = (preview as PreviewLike) ?? {};
    if (!meshes || meshes.length === 0) {
      return;
    }

    const meshPreview = meshes[0];
    if (!meshPreview.vertices || meshPreview.vertices.length === 0) {
      return;
    }

    // Wrap Three.js initialization in try-catch to handle WebGL context failures
    // (e.g., in test environments or when WebGL is not available)
    let renderer: THREE.WebGLRenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;
    let animationFrameId: number | null = null;

    try {
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 300;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(2, 2, 2);
      camera.lookAt(0, 0, 0);

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

      material = new THREE.MeshStandardMaterial({ color: 0xff8800, flatShading: false });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const animate = () => {
        if (renderer && mesh) {
          mesh.rotation.y += 0.01;
          renderer.render(scene, camera);
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
      if (renderer) {
        renderer.dispose();
      }
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [preview]);

  return <div ref={containerRef} style={{ width: '300px', height: '300px' }} data-testid="kcl-preview-3d" />;
};

