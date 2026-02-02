/**
 * Export Engine - Export 3D meshes to various formats
 * Supports OBJ, GLTF/GLB, and STL exports
 */

import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

export type ExportFormat = 'obj' | 'gltf' | 'glb' | 'stl-ascii' | 'stl-binary';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
}

export interface MeshData {
  id?: string | null;
  vertices: [number, number, number][];
  indices: number[];
}

/**
 * Convert mesh data to Three.js scene
 */
function createSceneFromMeshes(meshes: MeshData[]): THREE.Scene {
  const scene = new THREE.Scene();
  
  meshes.forEach((meshData, index) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(meshData.vertices.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    if (meshData.indices && meshData.indices.length > 0) {
      geometry.setIndex(meshData.indices);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      side: THREE.DoubleSide,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = meshData.id || `mesh_${index}`;
    scene.add(mesh);
  });
  
  return scene;
}

/**
 * Export meshes to OBJ format
 */
export function exportToOBJ(meshes: MeshData[]): string {
  const scene = createSceneFromMeshes(meshes);
  const exporter = new OBJExporter();
  return exporter.parse(scene);
}

/**
 * Export meshes to GLTF format (JSON)
 */
export async function exportToGLTF(meshes: MeshData[]): Promise<object> {
  const scene = createSceneFromMeshes(meshes);
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        resolve(result as object);
      },
      (error) => {
        reject(error);
      },
      { binary: false }
    );
  });
}

/**
 * Export meshes to GLB format (binary GLTF)
 */
export async function exportToGLB(meshes: MeshData[]): Promise<ArrayBuffer> {
  const scene = createSceneFromMeshes(meshes);
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        resolve(result as ArrayBuffer);
      },
      (error) => {
        reject(error);
      },
      { binary: true }
    );
  });
}

/**
 * Export meshes to STL format
 */
export function exportToSTL(meshes: MeshData[], binary: boolean = true): string | DataView {
  const scene = createSceneFromMeshes(meshes);
  const exporter = new STLExporter();
  
  if (binary) {
    return exporter.parse(scene, { binary: true });
  } else {
    return exporter.parse(scene, { binary: false });
  }
}

/**
 * Download file from data
 */
function downloadFile(data: string | ArrayBuffer | DataView | object, filename: string, mimeType: string): void {
  let blob: Blob;
  
  if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType });
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: mimeType });
  } else if (ArrayBuffer.isView(data)) {
    // Handle TypedArray/DataView - convert to Uint8Array for safe Blob creation
    const bytes = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
    blob = new Blob([bytes.slice()], { type: mimeType });
  } else {
    // JSON object (GLTF)
    const jsonString = JSON.stringify(data, null, 2);
    blob = new Blob([jsonString], { type: mimeType });
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export meshes and trigger download
 */
export async function exportAndDownload(meshes: MeshData[], options: ExportOptions): Promise<void> {
  const { format, filename } = options;
  
  if (!meshes || meshes.length === 0) {
    throw new Error('No meshes to export');
  }
  
  switch (format) {
    case 'obj': {
      const objData = exportToOBJ(meshes);
      downloadFile(objData, `${filename}.obj`, 'text/plain');
      break;
    }
    
    case 'gltf': {
      const gltfData = await exportToGLTF(meshes);
      downloadFile(gltfData, `${filename}.gltf`, 'application/json');
      break;
    }
    
    case 'glb': {
      const glbData = await exportToGLB(meshes);
      downloadFile(glbData, `${filename}.glb`, 'application/octet-stream');
      break;
    }
    
    case 'stl-ascii': {
      const stlAscii = exportToSTL(meshes, false);
      downloadFile(stlAscii, `${filename}.stl`, 'text/plain');
      break;
    }
    
    case 'stl-binary': {
      const stlBinary = exportToSTL(meshes, true);
      downloadFile(stlBinary, `${filename}.stl`, 'application/octet-stream');
      break;
    }
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'obj':
      return '.obj';
    case 'gltf':
      return '.gltf';
    case 'glb':
      return '.glb';
    case 'stl-ascii':
    case 'stl-binary':
      return '.stl';
    default:
      return '';
  }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'obj':
      return 'text/plain';
    case 'gltf':
      return 'application/json';
    case 'glb':
      return 'application/octet-stream';
    case 'stl-ascii':
      return 'text/plain';
    case 'stl-binary':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Format descriptions for UI
 */
export const FORMAT_INFO: Record<ExportFormat, { label: string; description: string }> = {
  'obj': {
    label: 'OBJ',
    description: 'Wavefront OBJ - 범용 3D 형식, 대부분의 소프트웨어 지원',
  },
  'gltf': {
    label: 'GLTF',
    description: 'GL Transmission Format (JSON) - 웹 기반 3D, Blender 등',
  },
  'glb': {
    label: 'GLB',
    description: 'Binary GLTF - 단일 파일 바이너리, 효율적인 전송',
  },
  'stl-ascii': {
    label: 'STL (ASCII)',
    description: 'STL ASCII - 3D 프린팅용, 텍스트 형식으로 편집 가능',
  },
  'stl-binary': {
    label: 'STL (Binary)',
    description: 'STL Binary - 3D 프린팅용, 파일 크기가 작음',
  },
};
