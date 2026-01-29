import { buildGeometrySpecFromKcl } from '@/lib/geometryRuntime';
import type { GeometrySpec } from '@/lib/types/geometrySpec';

describe('geometryRuntime', () => {
  describe('buildGeometrySpecFromKcl', () => {
    it('parses single box from KCL code', () => {
      // Arrange: KCL code with single box
      const kclCode = `# Generated dummy KCL code
let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse box correctly
      expect(spec.artifacts).toContain('solid:box1');
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].id).toBe('solid:box1');
      expect(spec.boxes[0].size).toEqual([100, 50, 30]);
      expect(spec.boxes[0].center).toEqual([0, 0, 0]);
    });

    it('parses two boxes from KCL code', () => {
      // Arrange: KCL code with two boxes
      const kclCode = `let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);
let box2 = box(size: [80, 40, 20], center: [50, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse both boxes
      expect(spec.artifacts).toContain('solid:box1');
      expect(spec.artifacts).toContain('solid:box2');
      expect(spec.boxes).toHaveLength(2);
      expect(spec.boxes[0].size).toEqual([100, 50, 30]);
      expect(spec.boxes[1].size).toEqual([80, 40, 20]);
    });

    it('parses boxes with union operation', () => {
      // Arrange: KCL code with boxes and union
      const kclCode = `let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);
let box2 = box(size: [80, 40, 20], center: [50, 0, 0]);
let combined = union(box1, box2);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse boxes (union is ignored for now)
      expect(spec.artifacts).toContain('solid:box1');
      expect(spec.artifacts).toContain('solid:box2');
      expect(spec.boxes).toHaveLength(2);
    });

    it('handles KCL code with comments and blank lines', () => {
      // Arrange: KCL code with comments and blank lines
      const kclCode = `# This is a comment
// Another comment

let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);

# End comment`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse box despite comments
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].id).toBe('solid:box1');
    });

    it('parses box definition hidden inside comment helper line', () => {
      // Arrange: KCL code where geometry hint is provided in a commented line
      const kclCode = `# Generated dummy KCL code
a = 1
b = 2
result = a + b
result
# geom: let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec: GeometrySpec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Geometry runtime should still find the box in the comment
      expect(spec.artifacts).toContain('solid:box1');
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].size).toEqual([100, 50, 30]);
      expect(spec.boxes[0].center).toEqual([0, 0, 0]);
    });

    it('handles KCL code with unrelated function calls', () => {
      // Arrange: KCL code with box and unrelated calls
      const kclCode = `let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);
let other = someOtherFunction();
let value = 42;`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should only parse box, ignore other calls
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].id).toBe('solid:box1');
    });

    it('handles invalid box definitions gracefully', () => {
      // Arrange: KCL code with invalid box (missing parameters)
      const kclCode = `let box1 = box(size: [100, 50, 30]);
let box2 = box();`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should return empty or minimal spec
      expect(spec.boxes.length).toBe(0);
      expect(spec.artifacts.length).toBe(0);
    });

    it('handles empty KCL code', () => {
      // Arrange: Empty KCL code
      const kclCode = '';

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should return empty spec
      expect(spec.boxes).toEqual([]);
      expect(spec.artifacts).toEqual([]);
    });

    it('handles KCL code with non-numeric array values', () => {
      // Arrange: KCL code with invalid numeric values
      const kclCode = `let box1 = box(size: [100, "invalid", 30], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should skip invalid box or handle gracefully
      expect(spec.boxes.length).toBe(0);
    });

    it('parses boxes with float values', () => {
      // Arrange: KCL code with float values
      const kclCode = `let box1 = box(size: [100.5, 50.25, 30.75], center: [0.0, 0.0, 0.0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse floats correctly
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].size).toEqual([100.5, 50.25, 30.75]);
      expect(spec.boxes[0].center).toEqual([0.0, 0.0, 0.0]);
    });

    it('handles box definitions with whitespace variations', () => {
      // Arrange: KCL code with various whitespace
      const kclCode = `let box1 = box( size: [100,50,30] , center:[0,0,0] );
let box2=box(size:[80,40,20],center:[50,0,0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse both boxes despite whitespace differences
      expect(spec.boxes).toHaveLength(2);
      expect(spec.boxes[0].size).toEqual([100, 50, 30]);
      expect(spec.boxes[1].size).toEqual([80, 40, 20]);
    });

    it('handles very large numeric values', () => {
      // Arrange: KCL code with very large values
      const kclCode = `let box1 = box(size: [1000000, 500000, 300000], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse large values correctly
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].size).toEqual([1000000, 500000, 300000]);
    });

    it('handles zero size values', () => {
      // Arrange: KCL code with zero size
      const kclCode = `let box1 = box(size: [0, 0, 0], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse zero values (geometry builder will handle validation)
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].size).toEqual([0, 0, 0]);
    });

    it('handles negative size values', () => {
      // Arrange: KCL code with negative size
      const kclCode = `let box1 = box(size: [-100, -50, -30], center: [0, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse negative values (geometry builder will handle validation)
      expect(spec.boxes).toHaveLength(1);
      expect(spec.boxes[0].size).toEqual([-100, -50, -30]);
    });

    it('handles KCL code with multiple box calls on same line', () => {
      // Arrange: KCL code with multiple boxes on one line (edge case)
      // Note: Current implementation parses one box per line
      const kclCode = `let box1 = box(size: [100, 50, 30], center: [0, 0, 0]); let box2 = box(size: [80, 40, 20], center: [50, 0, 0]);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should parse at least the first box (one per line limitation)
      expect(spec.boxes.length).toBeGreaterThanOrEqual(1);
      expect(spec.boxes[0].id).toBe('solid:box1');
    });

    it('handles KCL code with box inside other expressions', () => {
      // Arrange: KCL code with box in complex expression
      const kclCode = `let result = union(box(size: [100, 50, 30], center: [0, 0, 0]), other);`;

      // Act: Build geometry spec
      const spec = buildGeometrySpecFromKcl(kclCode);

      // Assert: Should not parse box from inside other expressions (current regex limitation)
      // This is acceptable - we only parse top-level box definitions
      expect(spec.boxes.length).toBe(0);
    });
  });
});
