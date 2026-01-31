import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock requestAnimationFrame
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: FrameRequestCallback) => {
    setTimeout(cb, 16);
    return 1;
  })
);
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock WebGL for Three.js (expanded for full Three.js init)
const createMockWebGLContext = () => {
  const paramMap: Record<number, unknown> = {
    0x8b4c: 16,
    0x8872: 'WebGL 1.0',
    0x84e8: 32,
    0x8dfd: 32,
    0x887f: 16,
    0x8513: 16,
    0x8ddf: 16,
    0x8a30: 16,
    0x8b31: 16,
    0x8b4d: 16,
    0x8b4a: 16,
    0x8b49: 16,
    0x8b4b: 16,
    0x0d33: 16,
    0x846d: 16,
  };
  return {
    getParameter: vi.fn((param: number) => paramMap[param] ?? 0),
    getExtension: vi.fn(() => null),
    getShaderPrecisionFormat: vi.fn(() => ({ rangeMin: 127, rangeMax: 127, precision: 23 })),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    cullFace: vi.fn(),
    frontFace: vi.fn(),
    depthFunc: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    pixelStorei: vi.fn(),
    activeTexture: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    clearDepth: vi.fn(),
    depthMask: vi.fn(),
    colorMask: vi.fn(),
    bindFramebuffer: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 0x8cd5),
    canvas: document.createElement('canvas'),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(HTMLCanvasElement.prototype as any).getContext = vi.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return createMockWebGLContext() as unknown as WebGLRenderingContext;
  }
  return null;
});

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0.05,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}));
