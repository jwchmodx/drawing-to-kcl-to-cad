/// <reference types="vite/client" />

declare module 'three/examples/jsm/controls/OrbitControls' {
  import type { Camera } from 'three';
  export class OrbitControls {
    constructor(camera: Camera, domElement?: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    update(): void;
    dispose(): void;
  }
}
