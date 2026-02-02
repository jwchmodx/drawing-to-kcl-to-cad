/**
 * Tests for new FORGE CAD features:
 * - Boolean operations (union, subtract, intersect)
 * - Chamfer
 * - Revolve
 * - Pattern (linear, circular)
 * - Shell
 */

import { buildGeometrySpecFromKcl } from '../lib/geometryRuntime';
import * as booleanEngine from '../lib/booleanEngine';
import * as chamferEngine from '../lib/chamferEngine';
import * as revolveEngine from '../lib/revolveEngine';
import * as patternEngine from '../lib/patternEngine';
import * as shellEngine from '../lib/shellEngine';

describe('Boolean Operations Parser', () => {
  test('parses union operation', () => {
    const kcl = `
      let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
      let cyl1 = cylinder(radius: 0.5, height: 3, center: [0, 0, 0])
      let result = union(box1, cyl1)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.booleans).toHaveLength(1);
    expect(spec.booleans[0].operation).toBe('union');
    expect(spec.booleans[0].sourceAId).toBe('solid:box1');
    expect(spec.booleans[0].sourceBId).toBe('solid:cyl1');
  });

  test('parses subtract operation', () => {
    const kcl = `let result = subtract(box1, cylinder1)`;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.booleans).toHaveLength(1);
    expect(spec.booleans[0].operation).toBe('subtract');
  });

  test('parses intersect operation', () => {
    const kcl = `let result = intersect(sphere1, box1)`;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.booleans).toHaveLength(1);
    expect(spec.booleans[0].operation).toBe('intersect');
  });
});

describe('Chamfer Parser', () => {
  test('parses chamfer operation', () => {
    const kcl = `
      let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
      let chamfered = chamfer(box1.edge[0], distance: 0.2)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.chamfers).toHaveLength(1);
    expect(spec.chamfers[0].sourceId).toBe('solid:box1');
    expect(spec.chamfers[0].edgeIndex).toBe(0);
    expect(spec.chamfers[0].distance).toBe(0.2);
  });
});

describe('Revolve Parser', () => {
  test('parses revolve operation with profile', () => {
    const kcl = `
      let revolved = revolve([[0.5, 0], [1, 0], [1, 2], [0.5, 2]], axis: [0, 1, 0], angle: 360)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.revolves).toHaveLength(1);
    expect(spec.revolves[0].profile).toHaveLength(4);
    expect(spec.revolves[0].axis).toEqual([0, 1, 0]);
    expect(spec.revolves[0].angle).toBe(360);
  });

  test('parses revolve with center', () => {
    const kcl = `
      let revolved = revolve([[0.5, 0], [1, 2]], axis: [0, 1, 0], angle: 180, center: [1, 0, 0])
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.revolves).toHaveLength(1);
    expect(spec.revolves[0].center).toEqual([1, 0, 0]);
    expect(spec.revolves[0].angle).toBe(180);
  });
});

describe('Linear Pattern Parser', () => {
  test('parses linear pattern operation', () => {
    const kcl = `
      let hole = cylinder(radius: 0.1, height: 1, center: [0, 0, 0])
      let holes = linear_pattern(hole, direction: [1, 0, 0], count: 5, spacing: 2)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.linearPatterns).toHaveLength(1);
    expect(spec.linearPatterns[0].sourceId).toBe('solid:hole');
    expect(spec.linearPatterns[0].direction).toEqual([1, 0, 0]);
    expect(spec.linearPatterns[0].count).toBe(5);
    expect(spec.linearPatterns[0].spacing).toBe(2);
  });
});

describe('Circular Pattern Parser', () => {
  test('parses circular pattern operation', () => {
    const kcl = `
      let spoke = box(size: [0.1, 0.5, 0.1], center: [0, 0.25, 0])
      let wheel = circular_pattern(spoke, axis: [0, 0, 1], center: [0, 0, 0], count: 8)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.circularPatterns).toHaveLength(1);
    expect(spec.circularPatterns[0].sourceId).toBe('solid:spoke');
    expect(spec.circularPatterns[0].axis).toEqual([0, 0, 1]);
    expect(spec.circularPatterns[0].center).toEqual([0, 0, 0]);
    expect(spec.circularPatterns[0].count).toBe(8);
    expect(spec.circularPatterns[0].angle).toBe(360);
  });

  test('parses circular pattern with custom angle', () => {
    const kcl = `
      let result = circular_pattern(hole, axis: [0, 1, 0], center: [0, 0, 0], count: 4, angle: 180)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.circularPatterns).toHaveLength(1);
    expect(spec.circularPatterns[0].angle).toBe(180);
  });
});

describe('Shell Parser', () => {
  test('parses shell operation', () => {
    const kcl = `
      let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
      let case1 = shell(box1, thickness: 0.1)
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.shells).toHaveLength(1);
    expect(spec.shells[0].sourceId).toBe('solid:box1');
    expect(spec.shells[0].thickness).toBe(0.1);
    expect(spec.shells[0].openFaces).toBeUndefined();
  });

  test('parses shell with open faces', () => {
    const kcl = `
      let case2 = shell(box1, thickness: 0.5, open_faces: [3])
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.shells).toHaveLength(1);
    expect(spec.shells[0].thickness).toBe(0.5);
    expect(spec.shells[0].openFaces).toEqual([3]);
  });

  test('parses shell with multiple open faces', () => {
    const kcl = `
      let case3 = shell(box1, thickness: 0.2, open_faces: [0, 3, 5])
    `;
    const spec = buildGeometrySpecFromKcl(kcl);
    
    expect(spec.shells).toHaveLength(1);
    expect(spec.shells[0].openFaces).toEqual([0, 3, 5]);
  });
});

// Engine unit tests
describe('Boolean Engine', () => {
  test('creates box geometry', () => {
    const geom = booleanEngine.createBoxGeometry([2, 2, 2], [0, 0, 0]);
    expect(geom).toBeDefined();
    expect(geom.getAttribute('position')).toBeDefined();
  });

  test('creates cylinder geometry', () => {
    const geom = booleanEngine.createCylinderGeometry(1, 2, [0, 0, 0]);
    expect(geom).toBeDefined();
  });

  test('converts to/from buffer geometry', () => {
    const vertices = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
    const indices = [0, 1, 2];
    const normals = [[0, 0, 1], [0, 0, 1], [0, 0, 1]];
    
    const geom = booleanEngine.toBufferGeometry(vertices, indices, normals);
    const result = booleanEngine.fromBufferGeometry(geom);
    
    expect(result.vertices).toHaveLength(3);
    expect(result.indices).toHaveLength(3);
  });
});

describe('Chamfer Engine', () => {
  test('gets box edges', () => {
    const edges = chamferEngine.getBoxEdges([2, 2, 2], [0, 0, 0]);
    expect(edges).toHaveLength(12);
  });

  test('generates chamfer surface', () => {
    const edges = chamferEngine.getBoxEdges([2, 2, 2], [0, 0, 0]);
    const chamfer = chamferEngine.generateChamferSurface(edges[0], 0.2);
    
    expect(chamfer.vertices).toHaveLength(4);  // quad
    expect(chamfer.indices).toHaveLength(6);   // 2 triangles
  });

  test('chamfers box edge', () => {
    const result = chamferEngine.chamferBoxEdge([2, 2, 2], [0, 0, 0], 0, 0.2);
    
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
  });
});

describe('Revolve Engine', () => {
  test('creates torus', () => {
    const torus = revolveEngine.createTorus(2, 0.5, [0, 0, 0]);
    
    expect(torus.vertices.length).toBeGreaterThan(0);
    expect(torus.indices.length).toBeGreaterThan(0);
  });

  test('creates lathe geometry', () => {
    const lathe = revolveEngine.createLathe(
      [0.5, 1, 0.5],  // radii
      [0, 1, 2],       // heights
      [0, 0, 0]
    );
    
    expect(lathe.vertices.length).toBeGreaterThan(0);
  });

  test('revolves profile partially', () => {
    const profile = [{ x: 0.5, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const result = revolveEngine.revolve(profile, [0, 1, 0], 180, 16, [0, 0, 0]);
    
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  test('predefined profiles', () => {
    const rect = revolveEngine.rectangleProfile(0.5, 1, 2);
    expect(rect).toHaveLength(4);
    
    const circle = revolveEngine.circleProfile(2, 0.5, 8);
    expect(circle.length).toBeGreaterThan(0);
    
    const lShape = revolveEngine.lProfile(1, 2, 0.2);
    expect(lShape).toHaveLength(6);
  });
});

describe('Pattern Engine', () => {
  const sampleVertices = [[0, 0, 0], [1, 0, 0], [0.5, 1, 0]];
  const sampleIndices = [0, 1, 2];
  const sampleNormals = [[0, 0, 1], [0, 0, 1], [0, 0, 1]];

  test('creates linear pattern', () => {
    const result = patternEngine.linearPattern(
      sampleVertices,
      sampleIndices,
      sampleNormals,
      [1, 0, 0],
      3,
      2
    );
    
    expect(result.vertices).toHaveLength(9);  // 3 copies * 3 vertices
    expect(result.indices).toHaveLength(9);   // 3 copies * 3 indices
  });

  test('creates circular pattern', () => {
    const result = patternEngine.circularPattern(
      sampleVertices,
      sampleIndices,
      sampleNormals,
      [0, 1, 0],
      [0, 0, 0],
      4
    );
    
    expect(result.vertices).toHaveLength(12);  // 4 copies * 3 vertices
  });

  test('creates grid pattern', () => {
    const result = patternEngine.gridPattern(
      sampleVertices,
      sampleIndices,
      sampleNormals,
      [1, 0, 0],
      [0, 0, 1],
      2,
      2,
      1,
      1
    );
    
    expect(result.vertices).toHaveLength(12);  // 2x2=4 copies * 3 vertices
  });

  test('creates mirror pattern', () => {
    const result = patternEngine.mirrorPattern(
      sampleVertices,
      sampleIndices,
      sampleNormals,
      [1, 0, 0],
      [0, 0, 0],
      true
    );
    
    expect(result.vertices).toHaveLength(6);  // original + mirrored
  });

  test('creates spiral pattern', () => {
    const result = patternEngine.spiralPattern(
      sampleVertices,
      sampleIndices,
      sampleNormals,
      [0, 1, 0],
      [0, 0, 0],
      8,
      1,
      1
    );
    
    expect(result.vertices).toHaveLength(24);  // 8 copies * 3 vertices
  });
});

describe('Shell Engine', () => {
  test('shells a box', () => {
    const result = shellEngine.shellBox([2, 2, 2], [0, 0, 0], 0.2);
    
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
  });

  test('shells a box with open face', () => {
    const result = shellEngine.shellBox([2, 2, 2], [0, 0, 0], 0.2, [3]);  // top open
    
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  test('shells a cylinder', () => {
    const result = shellEngine.shellCylinder(1, 2, [0, 0, 0], 0.1);
    
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
  });

  test('shells a cylinder with open ends', () => {
    const result = shellEngine.shellCylinder(1, 2, [0, 0, 0], 0.1, 16, true);
    
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  test('shells a sphere', () => {
    const result = shellEngine.shellSphere(1, [0, 0, 0], 0.1);
    
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  test('shells a sphere with open top', () => {
    const result = shellEngine.shellSphere(1, [0, 0, 0], 0.1, 16, 8, true, false);
    
    expect(result.vertices.length).toBeGreaterThan(0);
  });

  test('shells arbitrary mesh', () => {
    const vertices = [
      [0, 0, 0], [1, 0, 0], [0.5, 1, 0],
      [0.5, 0.5, 1]
    ];
    const indices = [
      0, 1, 2,  // base
      0, 1, 3,  // front
      1, 2, 3,  // right
      2, 0, 3   // left
    ];
    const normals = [
      [0, 0, -1], [0, 0, -1], [0, 0, -1],
      [0, 0.5, 0.5]
    ];
    
    const result = shellEngine.shellMesh(vertices, indices, normals, 0.1);
    
    expect(result.vertices).toHaveLength(8);  // original + offset
    expect(result.indices).toHaveLength(24);  // original + reversed
  });
});
