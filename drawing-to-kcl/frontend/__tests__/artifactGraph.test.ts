import {
  parseArtifactGraph,
  extractMeshes,
  findArtifactById,
  type ArtifactGraph,
  type ArtifactNode,
  type MeshData,
} from '@/lib/types/artifactGraph';

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
});
