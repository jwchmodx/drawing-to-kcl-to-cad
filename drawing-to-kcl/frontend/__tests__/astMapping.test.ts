import {
  createMapping,
  findAstNodeForGeometry,
  findGeometryForAstNode,
} from '@/lib/astMapping';
import type { ArtifactGraph, ArtifactNode } from '@/lib/types/artifactGraph';

describe('astMapping', () => {
  describe('createMapping', () => {
    it('creates mapping from AST nodes to geometry', () => {
      // Arrange: Artifact graph with AST node references
      const graph: ArtifactGraph = {
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            astNodeId: 'ast:1',
            geometry: {
              vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
              indices: [0, 1, 2],
            },
          },
        },
      };

      // Act: Create mapping
      const mapping = createMapping(graph);

      // Assert: Should create bidirectional mapping
      expect(mapping.astToGeometry).toHaveProperty('ast:1');
      expect(mapping.geometryToAst).toHaveProperty('solid:box1');
    });
  });

  describe('findAstNodeForGeometry', () => {
    it('finds AST node for given geometry ID', () => {
      // Arrange: Mapping with geometry
      const mapping = createMapping({
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            astNodeId: 'ast:1',
            geometry: null,
          },
        },
      });

      // Act: Find AST node
      const astNodeId = findAstNodeForGeometry(mapping, 'solid:box1');

      // Assert: Should return AST node ID
      expect(astNodeId).toBe('ast:1');
    });

    it('returns null for non-existent geometry', () => {
      // Arrange: Mapping
      const mapping = createMapping({
        artifacts: [],
        nodes: {},
      });

      // Act: Find AST node for non-existent geometry
      const astNodeId = findAstNodeForGeometry(mapping, 'solid:box999');

      // Assert: Should return null
      expect(astNodeId).toBeNull();
    });
  });

  describe('findGeometryForAstNode', () => {
    it('finds geometry for given AST node ID', () => {
      // Arrange: Mapping with AST node
      const mapping = createMapping({
        artifacts: ['solid:box1'],
        nodes: {
          'solid:box1': {
            id: 'solid:box1',
            type: 'solid',
            astNodeId: 'ast:1',
            geometry: null,
          },
        },
      });

      // Act: Find geometry
      const geometryId = findGeometryForAstNode(mapping, 'ast:1');

      // Assert: Should return geometry ID
      expect(geometryId).toBe('solid:box1');
    });

    it('returns null for non-existent AST node', () => {
      // Arrange: Mapping
      const mapping = createMapping({
        artifacts: [],
        nodes: {},
      });

      // Act: Find geometry for non-existent AST node
      const geometryId = findGeometryForAstNode(mapping, 'ast:999');

      // Assert: Should return null
      expect(geometryId).toBeNull();
    });
  });
});
