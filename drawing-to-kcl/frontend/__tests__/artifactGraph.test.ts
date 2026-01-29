import {
  parseArtifactGraph,
  parseKclRunOutput,
  extractMeshes,
  findArtifactById,
  buildArtifactGraphFromGeometry,
  type ArtifactGraph,
  type ArtifactNode,
  type MeshData,
} from '@/lib/types/artifactGraph';
import type { GeometrySpec } from '@/lib/types/geometrySpec';

describe('artifactGraph', () => {
  describe('parseArtifactGraph', () => {
    it('parses valid artifact graph from WASM result', () => {
      // Arrange: Valid artifact graph structure
      const wasmResult = {
        artifacts: ['solid:box1', 'solid:box2'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: { vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], indices: [0, 1, 2] },
          },
        },
      };

      // Act: Parse artifact graph
      const graph = parseArtifactGraph(wasmResult);

      // Assert: Should return valid ArtifactGraph
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.artifacts).toContain('solid:box2');
      expect(graph.nodes).toBeDefined();
    });

    it('handles empty artifact graph', () => {
      // Arrange: Empty artifact graph
      const wasmResult = { artifacts: [], nodes: {} };

      // Act: Parse empty graph
      const graph = parseArtifactGraph(wasmResult);

      // Assert: Should return empty graph
      expect(graph.artifacts).toEqual([]);
      expect(Object.keys(graph.nodes)).toHaveLength(0);
    });

    it('handles invalid artifact graph structure', () => {
      // Arrange: Invalid structure
      const wasmResult = null;

      // Act & Assert: Should throw error or return empty graph
      expect(() => parseArtifactGraph(wasmResult as any)).toThrow();
    });
  });

  describe('parseKclRunOutput', () => {
    it('parses JSON string output from WASM into an artifact graph', () => {
      // Arrange: JSON string that mirrors the expected artifact graph structure
      const raw = JSON.stringify({
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: {
              vertices: [
                [0, 0, 0],
                [1, 0, 0],
                [0, 1, 0],
              ],
              indices: [0, 1, 2],
            },
          },
        },
      });

      // Act
      const graph = parseKclRunOutput(raw);

      // Assert
      expect(graph.artifacts).toEqual(['solid:box1']);
      expect(graph.nodes['solid:box1']).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry?.vertices).toHaveLength(3);
      expect(graph.nodes['solid:box1'].geometry?.indices).toEqual([0, 1, 2]);
    });

    it('delegates to parseArtifactGraph when given an object', () => {
      // Arrange: Same structure but already parsed
      const obj = {
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: {
              vertices: [
                [0, 0, 0],
                [1, 0, 0],
                [0, 1, 0],
              ],
              indices: [0, 1, 2],
            },
          },
        },
      };

      // Act
      const graph = parseKclRunOutput(obj);

      // Assert
      expect(graph.artifacts).toEqual(['solid:box1']);
      expect(graph.nodes['solid:box1']).toBeDefined();
    });

    it('returns empty graph when given a non-JSON string (e.g. YAML output)', () => {
      // Arrange: Non-JSON string (e.g. YAML or plain text)
      const raw = 'a: 1\nb: 2';

      // Act
      const graph = parseKclRunOutput(raw);

      // Assert: Falls back to empty graph instead of throwing
      expect(graph.artifacts).toEqual([]);
      expect(Object.keys(graph.nodes)).toHaveLength(0);
    });

    it('returns empty graph when given unsupported type', () => {
      // Arrange: Number is not a supported format
      const raw = 12345 as unknown;

      // Act
      const graph = parseKclRunOutput(raw);

      // Assert: Returns empty graph without throwing
      expect(graph.artifacts).toEqual([]);
      expect(Object.keys(graph.nodes)).toHaveLength(0);
    });
  });

  describe('extractMeshes', () => {
    it('extracts meshes from artifact graph', () => {
      // Arrange: Artifact graph with meshes
      const graph: ArtifactGraph = {
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: {
              vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
              indices: [0, 1, 2],
            },
          },
        },
      };

      // Act: Extract meshes
      const meshes = extractMeshes(graph);

      // Assert: Should return mesh data
      expect(meshes).toHaveLength(1);
      expect(meshes[0].id).toBe('solid:box1');
      expect(meshes[0].vertices).toHaveLength(3);
      expect(meshes[0].indices).toHaveLength(3);
    });

    it('handles artifact graph without meshes', () => {
      // Arrange: Graph without geometry
      const graph: ArtifactGraph = {
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: null,
          },
        },
      };

      // Act: Extract meshes
      const meshes = extractMeshes(graph);

      // Assert: Should return empty array
      expect(meshes).toEqual([]);
    });
  });

  describe('findArtifactById', () => {
    it('finds artifact by ID', () => {
      // Arrange: Artifact graph
      const graph: ArtifactGraph = {
        artifacts: ['solid:box1', 'solid:box2'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: null,
          },
          'solid:box2': {
            id: 'solid:box2',
            type: 'solid',
            geometry: null,
          },
        },
      };

      // Act: Find artifact
      const artifact = findArtifactById(graph, 'solid:box1');

      // Assert: Should return correct artifact
      expect(artifact).toBeDefined();
      expect(artifact?.id).toBe('solid:box1');
    });

    it('returns null for non-existent artifact', () => {
      // Arrange: Artifact graph
      const graph: ArtifactGraph = {
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            geometry: null,
          },
        },
      };

      // Act: Find non-existent artifact
      const artifact = findArtifactById(graph, 'solid:box999');

      // Assert: Should return null
      expect(artifact).toBeNull();
    });
  });

  describe('buildArtifactGraphFromGeometry', () => {
    it('builds artifact graph from geometry spec with single box', () => {
      // Arrange: Geometry spec with one box
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [100, 50, 30],
            center: [0, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should produce artifact graph with geometry
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.nodes['solid:box1']).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry?.vertices.length).toBeGreaterThan(0);
      expect(graph.nodes['solid:box1'].geometry?.indices.length).toBeGreaterThan(0);
      // Box has 8 vertices and 12 triangles (36 indices)
      expect(graph.nodes['solid:box1'].geometry?.vertices.length).toBe(8);
      expect(graph.nodes['solid:box1'].geometry?.indices.length).toBe(36);
    });

    it('handles geometry spec with missing size', () => {
      // Arrange: Box with missing size
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [NaN, 50, 30],
            center: [0, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should return empty graph or skip invalid box
      expect(graph.artifacts.length).toBe(0);
      expect(Object.keys(graph.nodes).length).toBe(0);
    });

    it('handles geometry spec with missing center', () => {
      // Arrange: Box with missing center
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [100, 50, 30],
            center: [NaN, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should return empty graph or skip invalid box
      expect(graph.artifacts.length).toBe(0);
      expect(Object.keys(graph.nodes).length).toBe(0);
    });

    it('handles empty geometry spec', () => {
      // Arrange: Empty geometry spec
      const geomSpec: GeometrySpec = {
        artifacts: [],
        boxes: [],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should return empty graph
      expect(graph.artifacts).toEqual([]);
      expect(Object.keys(graph.nodes).length).toBe(0);
    });

    it('builds artifact graph with multiple boxes', () => {
      // Arrange: Geometry spec with two boxes
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1', 'solid:box2'],
        boxes: [
          {
            id: 'solid:box1',
            size: [100, 50, 30],
            center: [0, 0, 0],
          },
          {
            id: 'solid:box2',
            size: [80, 40, 20],
            center: [50, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should produce graph with both boxes
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.artifacts).toContain('solid:box2');
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      expect(graph.nodes['solid:box2'].geometry).toBeDefined();
      expect(graph.nodes['solid:box2'].geometry?.vertices.length).toBe(8);
    });

    it('handles box with zero size', () => {
      // Arrange: Box with zero size
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [0, 0, 0],
            center: [0, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should still generate geometry (degenerate box)
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry?.vertices.length).toBe(8);
    });

    it('handles box with very large size values', () => {
      // Arrange: Box with very large size
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [1000000, 500000, 300000],
            center: [0, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should generate geometry without errors
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry?.vertices.length).toBe(8);
    });

    it('handles box with negative size values', () => {
      // Arrange: Box with negative size
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [-100, -50, -30],
            center: [0, 0, 0],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should still generate geometry (negative size creates inverted box)
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      expect(graph.nodes['solid:box1'].geometry?.vertices.length).toBe(8);
    });

    it('handles box with offset center', () => {
      // Arrange: Box with non-zero center
      const geomSpec: GeometrySpec = {
        artifacts: ['solid:box1'],
        boxes: [
          {
            id: 'solid:box1',
            size: [100, 50, 30],
            center: [50, 25, 15],
          },
        ],
      };

      // Act: Build artifact graph
      const graph = buildArtifactGraphFromGeometry(geomSpec);

      // Assert: Should generate geometry with correct center offset
      expect(graph.artifacts).toContain('solid:box1');
      expect(graph.nodes['solid:box1'].geometry).toBeDefined();
      const vertices = graph.nodes['solid:box1'].geometry?.vertices || [];
      // Check that vertices are offset by center
      expect(vertices.length).toBe(8);
      // First vertex should be at center - half size
      expect(vertices[0][0]).toBeCloseTo(50 - 50, 5);
      expect(vertices[0][1]).toBeCloseTo(25 - 25, 5);
      expect(vertices[0][2]).toBeCloseTo(15 - 15, 5);
    });
  });
});
