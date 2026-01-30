import '@testing-library/jest-dom';

// Provide a default mock for fetch that tests can override as needed.
global.fetch = jest.fn();

// Polyfill TextDecoder/TextEncoder for Node.js test environment (required by @wasmer/wasi)
if (typeof TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Mock WebGL context for Three.js tests
const createMockWebGLContext = () => {
  const mockContext = {
    getParameter: jest.fn((param) => {
      // Common WebGL parameters that Three.js queries
      const paramMap: Record<number, any> = {
        0x8B4C: 16, // MAX_VERTEX_ATTRIBS
        0x8872: 'WebGL 1.0', // VERSION
        0x84E8: 32, // MAX_TEXTURE_IMAGE_UNITS
        0x8DFD: 32, // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        0x887F: 16, // MAX_TEXTURE_SIZE
        0x8513: 16, // MAX_CUBE_MAP_TEXTURE_SIZE
        0x8DDF: 16, // MAX_RENDERBUFFER_SIZE
        0x8A30: 16, // MAX_VARYING_VECTORS
        0x8B31: 16, // MAX_VERTEX_UNIFORM_VECTORS
        0x8B4D: 16, // MAX_FRAGMENT_UNIFORM_VECTORS
        0x8B4A: 16, // MAX_VERTEX_ATTRIBS
        0x8B49: 16, // MAX_VERTEX_UNIFORM_COMPONENTS
        0x8B4B: 16, // MAX_FRAGMENT_UNIFORM_COMPONENTS
        0x0D33: 16, // ALIASED_LINE_WIDTH_RANGE
        0x846D: 16, // ALIASED_POINT_SIZE_RANGE
      };
      return paramMap[param] ?? 0;
    }),
    getExtension: jest.fn(() => null),
    getShaderPrecisionFormat: jest.fn(() => ({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    })),
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    createProgram: jest.fn(() => ({})),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    useProgram: jest.fn(),
    createBuffer: jest.fn(() => ({})),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    blendFunc: jest.fn(),
    cullFace: jest.fn(),
    frontFace: jest.fn(),
    depthFunc: jest.fn(),
    pixelStorei: jest.fn(),
    activeTexture: jest.fn(),
    bindTexture: jest.fn(),
    createTexture: jest.fn(() => ({})),
    texImage2D: jest.fn(),
    texParameteri: jest.fn(),
    generateMipmap: jest.fn(),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
    uniform2f: jest.fn(),
    uniform3f: jest.fn(),
    uniform4f: jest.fn(),
    uniformMatrix4fv: jest.fn(),
    getUniformLocation: jest.fn(() => ({})),
    getAttribLocation: jest.fn(() => 0),
    clearDepth: jest.fn(),
    depthMask: jest.fn(),
    colorMask: jest.fn(),
    stencilMask: jest.fn(),
    stencilFunc: jest.fn(),
    stencilOp: jest.fn(),
    bindFramebuffer: jest.fn(),
    bindRenderbuffer: jest.fn(),
    createFramebuffer: jest.fn(() => ({})),
    createRenderbuffer: jest.fn(() => ({})),
    framebufferTexture2D: jest.fn(),
    framebufferRenderbuffer: jest.fn(),
    renderbufferStorage: jest.fn(),
    checkFramebufferStatus: jest.fn(() => 0x8CD5), // FRAMEBUFFER_COMPLETE
    deleteShader: jest.fn(),
    deleteProgram: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteTexture: jest.fn(),
    deleteFramebuffer: jest.fn(),
    deleteRenderbuffer: jest.fn(),
    isContextLost: jest.fn(() => false),
    canvas: document.createElement('canvas'),
  };
  return mockContext;
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return createMockWebGLContext();
  }
  return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock OrbitControls globally for all tests to avoid importing the ESM module
jest.mock('three/examples/jsm/controls/OrbitControls', () => {
  return {
    OrbitControls: jest.fn().mockImplementation(() => ({
      enableDamping: false,
      dampingFactor: 0.05,
      update: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

