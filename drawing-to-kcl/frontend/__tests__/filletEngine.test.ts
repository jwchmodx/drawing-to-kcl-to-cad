/**
 * Tests for filletEngine.ts
 */

import {
  getBoxEdges,
  generateFilletSurface,
  filletBoxEdge,
  filletAllBoxEdges,
  vec3,
  add,
  sub,
  scale,
  normalize,
  length,
  type EdgeInfo,
} from '../lib/filletEngine';

describe('Vector Utilities', () => {
  test('vec3 creates a vector', () => {
    const v = vec3(1, 2, 3);
    expect(v).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('add adds two vectors', () => {
    const a = vec3(1, 2, 3);
    const b = vec3(4, 5, 6);
    expect(add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
  });

  test('sub subtracts two vectors', () => {
    const a = vec3(5, 7, 9);
    const b = vec3(1, 2, 3);
    expect(sub(a, b)).toEqual({ x: 4, y: 5, z: 6 });
  });

  test('scale scales a vector', () => {
    const v = vec3(1, 2, 3);
    expect(scale(v, 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  test('length calculates vector length', () => {
    const v = vec3(3, 4, 0);
    expect(length(v)).toBe(5);
  });

  test('normalize normalizes a vector', () => {
    const v = vec3(3, 4, 0);
    const n = normalize(v);
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(n.z).toBeCloseTo(0);
  });
});

describe('getBoxEdges', () => {
  test('returns 12 edges for a box', () => {
    const edges = getBoxEdges([2, 2, 2], [0, 0, 0]);
    expect(edges).toHaveLength(12);
  });

  test('edges have correct structure', () => {
    const edges = getBoxEdges([2, 2, 2], [0, 0, 0]);
    
    for (const edge of edges) {
      expect(edge).toHaveProperty('index');
      expect(edge).toHaveProperty('start');
      expect(edge).toHaveProperty('end');
      expect(edge).toHaveProperty('direction');
      expect(edge).toHaveProperty('length');
      expect(edge).toHaveProperty('face1Normal');
      expect(edge).toHaveProperty('face2Normal');
      expect(edge).toHaveProperty('name');
    }
  });

  test('edge 0 is back-bottom edge', () => {
    const edges = getBoxEdges([2, 2, 2], [0, 0, 0]);
    const edge0 = edges[0];
    
    expect(edge0.name).toBe('back-bottom');
    expect(edge0.start).toEqual({ x: -1, y: -1, z: -1 });
    expect(edge0.end).toEqual({ x: 1, y: -1, z: -1 });
    expect(edge0.length).toBe(2);
  });

  test('edge lengths match box dimensions', () => {
    const edges = getBoxEdges([4, 3, 2], [0, 0, 0]);
    
    // X-direction edges (0, 2, 4, 6)
    expect(edges[0].length).toBe(4);
    expect(edges[2].length).toBe(4);
    expect(edges[4].length).toBe(4);
    expect(edges[6].length).toBe(4);
    
    // Y-direction edges (1, 3, 5, 7)
    expect(edges[1].length).toBe(3);
    expect(edges[3].length).toBe(3);
    expect(edges[5].length).toBe(3);
    expect(edges[7].length).toBe(3);
    
    // Z-direction edges (8, 9, 10, 11)
    expect(edges[8].length).toBe(2);
    expect(edges[9].length).toBe(2);
    expect(edges[10].length).toBe(2);
    expect(edges[11].length).toBe(2);
  });
});

describe('generateFilletSurface', () => {
  test('generates vertices and indices for fillet', () => {
    const edges = getBoxEdges([2, 2, 2], [0, 0, 0]);
    const edge = edges[0];
    
    const fillet = generateFilletSurface(edge, 0.3, 8);
    
    expect(fillet.vertices.length).toBeGreaterThan(0);
    expect(fillet.indices.length).toBeGreaterThan(0);
    expect(fillet.normals.length).toBe(fillet.vertices.length);
  });

  test('fillet vertices are in correct range', () => {
    const edges = getBoxEdges([2, 2, 2], [0, 0, 0]);
    const edge = edges[0];  // back-bottom edge
    
    const fillet = generateFilletSurface(edge, 0.3, 8);
    
    for (const v of fillet.vertices) {
      // All vertices should be near the edge (within radius + tolerance)
      expect(v[0]).toBeGreaterThanOrEqual(-1.1);
      expect(v[0]).toBeLessThanOrEqual(1.1);
      expect(v[1]).toBeGreaterThanOrEqual(-1.1);
      expect(v[1]).toBeLessThanOrEqual(-0.7);  // near bottom
      expect(v[2]).toBeGreaterThanOrEqual(-1.1);
      expect(v[2]).toBeLessThanOrEqual(-0.7);  // near back
    }
  });
});

describe('filletBoxEdge', () => {
  test('generates geometry for single edge fillet', () => {
    const result = filletBoxEdge([2, 2, 2], [0, 0, 0], 0, 0.3, 8);
    
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
  });

  test('handles edge index bounds', () => {
    // Valid edge indices are 0-11
    const result1 = filletBoxEdge([2, 2, 2], [0, 0, 0], 0, 0.3);
    const result2 = filletBoxEdge([2, 2, 2], [0, 0, 0], 11, 0.3);
    
    expect(result1.vertices.length).toBeGreaterThan(0);
    expect(result2.vertices.length).toBeGreaterThan(0);
  });

  test('clamps radius to valid range', () => {
    // Radius should be clamped to not exceed box dimensions
    const result = filletBoxEdge([2, 2, 2], [0, 0, 0], 0, 10, 8);  // radius too large
    
    expect(result.vertices.length).toBeGreaterThan(0);
    // No NaN values
    for (const v of result.vertices) {
      expect(Number.isFinite(v[0])).toBe(true);
      expect(Number.isFinite(v[1])).toBe(true);
      expect(Number.isFinite(v[2])).toBe(true);
    }
  });
});

describe('filletAllBoxEdges', () => {
  test('generates rounded box geometry', () => {
    const result = filletAllBoxEdges([2, 2, 2], [0, 0, 0], 0.3, 4);
    
    expect(result.vertices.length).toBeGreaterThan(0);
    expect(result.indices.length).toBeGreaterThan(0);
    expect(result.normals.length).toBe(result.vertices.length);
  });

  test('geometry has no NaN values', () => {
    const result = filletAllBoxEdges([2, 2, 2], [0, 0, 0], 0.3, 4);
    
    for (const v of result.vertices) {
      expect(Number.isFinite(v[0])).toBe(true);
      expect(Number.isFinite(v[1])).toBe(true);
      expect(Number.isFinite(v[2])).toBe(true);
    }
    
    for (const idx of result.indices) {
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(result.vertices.length);
    }
  });

  test('different segment counts affect vertex count', () => {
    const result4 = filletAllBoxEdges([2, 2, 2], [0, 0, 0], 0.3, 4);
    const result8 = filletAllBoxEdges([2, 2, 2], [0, 0, 0], 0.3, 8);
    
    // Higher segments should produce more vertices
    expect(result8.vertices.length).toBeGreaterThan(result4.vertices.length);
  });
});

describe('Integration: KCL Fillet Parsing', () => {
  const { buildGeometrySpecFromKcl } = require('../lib/geometryRuntime');
  const { buildArtifactGraphFromGeometry } = require('../lib/types/artifactGraph');

  test('parses basic fillet syntax', () => {
    const code = `let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[0], radius: 0.3)`;
    
    const spec = buildGeometrySpecFromKcl(code);
    
    expect(spec.boxes).toHaveLength(1);
    expect(spec.fillets).toHaveLength(1);
    expect(spec.fillets[0]).toMatchObject({
      sourceId: 'solid:box1',
      edgeIndex: 0,
      radius: 0.3,
    });
  });

  test('parses fillet with segments parameter', () => {
    const code = `let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[5], radius: 0.2, segments: 16)`;
    
    const spec = buildGeometrySpecFromKcl(code);
    
    expect(spec.fillets).toHaveLength(1);
    expect(spec.fillets[0]).toMatchObject({
      sourceId: 'solid:box1',
      edgeIndex: 5,
      radius: 0.2,
      segments: 16,
    });
  });

  test('builds geometry from fillet spec', () => {
    const code = `let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[0], radius: 0.3)`;
    
    const spec = buildGeometrySpecFromKcl(code);
    const graph = buildArtifactGraphFromGeometry(spec);
    
    // Box1 should have modified geometry from fillet
    const boxNode = graph.nodes['solid:box1'];
    expect(boxNode).toBeDefined();
    expect(boxNode.geometry).not.toBeNull();
    expect(boxNode.geometry!.vertices.length).toBeGreaterThan(8);  // More than original box
  });

  test('edge indices 0-11 all work', () => {
    for (let i = 0; i < 12; i++) {
      const code = `let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[${i}], radius: 0.2)`;
      
      const spec = buildGeometrySpecFromKcl(code);
      const graph = buildArtifactGraphFromGeometry(spec);
      
      const boxNode = graph.nodes['solid:box1'];
      expect(boxNode.geometry).not.toBeNull();
      
      // No NaN in vertices
      for (const v of boxNode.geometry!.vertices) {
        expect(Number.isFinite(v[0])).toBe(true);
        expect(Number.isFinite(v[1])).toBe(true);
        expect(Number.isFinite(v[2])).toBe(true);
      }
    }
  });
});
