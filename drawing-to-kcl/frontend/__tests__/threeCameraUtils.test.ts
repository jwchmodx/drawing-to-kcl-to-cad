/**
 * Unit tests for threeCameraUtils - pure math utilities for bounding box
 * calculation and camera parameter computation.
 * 
 * These tests verify bbox computation and camera positioning logic without
 * requiring actual WebGL/Three.js context.
 */

import {
  computeBoundingBox,
  computeCameraForBounds,
  type Vec3,
  type BoundingBox,
} from '../lib/threeCameraUtils';

describe('threeCameraUtils', () => {
  describe('computeBoundingBox', () => {
    it('computes bbox for a single box geometry', () => {
      // Arrange: Box vertices from geometry runtime (size [100, 50, 30], center [0, 0, 0])
      // Based on generateBoxGeometry in artifactGraph.ts:
      // w=100, h=50, d=30, center=[0,0,0]
      // halfW=50, halfH=25, halfD=15
      const vertices: Vec3[] = [
        [-50, -25, -15], // bottom-left-back
        [50, -25, -15],  // bottom-right-back
        [50, 25, -15],   // top-right-back
        [-50, 25, -15],  // top-left-back
        [-50, -25, 15],  // bottom-left-front
        [50, -25, 15],   // bottom-right-front
        [50, 25, 15],    // top-right-front
        [-50, 25, 15],   // top-left-front
      ];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([-50, -25, -15]);
      expect(result!.max).toEqual([50, 25, 15]);
      expect(result!.center).toEqual([0, 0, 0]);
      // Radius should be half the diagonal: sqrt(50^2 + 25^2 + 15^2) = sqrt(3350) ≈ 57.88
      expect(result!.radius).toBeCloseTo(57.88, 1);
    });

    it('computes bbox for offset box geometry', () => {
      // Arrange: Box with center at [10, 20, 30], size [20, 20, 20]
      // half = 10, so min = [0, 10, 20], max = [20, 30, 40]
      const vertices: Vec3[] = [
        [0, 10, 20],   // bottom-left-back
        [20, 10, 20],  // bottom-right-back
        [20, 30, 20],  // top-right-back
        [0, 30, 20],   // top-left-back
        [0, 10, 40],   // bottom-left-front
        [20, 10, 40],  // bottom-right-front
        [20, 30, 40],  // top-right-front
        [0, 30, 40],   // top-left-front
      ];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([0, 10, 20]);
      expect(result!.max).toEqual([20, 30, 40]);
      expect(result!.center).toEqual([10, 20, 30]);
      // Radius = sqrt(10^2 + 10^2 + 10^2) = sqrt(300) ≈ 17.32
      expect(result!.radius).toBeCloseTo(17.32, 1);
    });

    it('handles very large box geometry', () => {
      // Arrange: Very large box
      const vertices: Vec3[] = [
        [-1000, -1000, -1000],
        [1000, -1000, -1000],
        [1000, 1000, -1000],
        [-1000, 1000, -1000],
        [-1000, -1000, 1000],
        [1000, -1000, 1000],
        [1000, 1000, 1000],
        [-1000, 1000, 1000],
      ];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([-1000, -1000, -1000]);
      expect(result!.max).toEqual([1000, 1000, 1000]);
      expect(result!.center).toEqual([0, 0, 0]);
      // Radius = sqrt(1000^2 * 3) = sqrt(3000000) ≈ 1732.05
      expect(result!.radius).toBeCloseTo(1732.05, 1);
    });

    it('handles very small box geometry', () => {
      // Arrange: Very small box
      const vertices: Vec3[] = [
        [-0.1, -0.1, -0.1],
        [0.1, -0.1, -0.1],
        [0.1, 0.1, -0.1],
        [-0.1, 0.1, -0.1],
        [-0.1, -0.1, 0.1],
        [0.1, -0.1, 0.1],
        [0.1, 0.1, 0.1],
        [-0.1, 0.1, 0.1],
      ];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([-0.1, -0.1, -0.1]);
      expect(result!.max).toEqual([0.1, 0.1, 0.1]);
      expect(result!.center).toEqual([0, 0, 0]);
      // Radius = sqrt(0.1^2 * 3) = sqrt(0.03) ≈ 0.173
      expect(result!.radius).toBeCloseTo(0.173, 2);
    });

    it('handles flat box (one dimension is zero)', () => {
      // Arrange: Flat box (height = 0)
      const vertices: Vec3[] = [
        [-10, 0, -10],
        [10, 0, -10],
        [10, 0, 10],
        [-10, 0, 10],
      ];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([-10, 0, -10]);
      expect(result!.max).toEqual([10, 0, 10]);
      expect(result!.center).toEqual([0, 0, 0]);
      // Radius = sqrt(10^2 + 0^2 + 10^2) = sqrt(200) ≈ 14.14
      expect(result!.radius).toBeCloseTo(14.14, 1);
    });

    it('returns null for empty vertex array', () => {
      // Arrange
      const vertices: Vec3[] = [];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).toBeNull();
    });

    it('handles single vertex', () => {
      // Arrange
      const vertices: Vec3[] = [[5, 10, 15]];

      // Act
      const result = computeBoundingBox(vertices);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([5, 10, 15]);
      expect(result!.max).toEqual([5, 10, 15]);
      expect(result!.center).toEqual([5, 10, 15]);
      expect(result!.radius).toBe(0);
    });
  });

  describe('computeCameraForBounds', () => {
    it('computes camera parameters for a box bbox', () => {
      // Arrange: Box bbox (size [100, 50, 30], center [0, 0, 0])
      const bounds: BoundingBox = {
        min: [-50, -25, -15],
        max: [50, 25, 15],
        center: [0, 0, 0],
        radius: Math.sqrt(50 * 50 + 25 * 25 + 15 * 15), // ≈ 58.31
      };
      const aspect = 1.0; // square viewport

      // Act
      const result = computeCameraForBounds(bounds, aspect);

      // Assert
      expect(result.position).toBeDefined();
      expect(result.position.length).toBe(3);
      // Position should be away from center
      const distance = Math.sqrt(
        result.position[0] ** 2 +
        result.position[1] ** 2 +
        result.position[2] ** 2
      );
      expect(distance).toBeGreaterThan(bounds.radius);
      
      expect(result.near).toBeGreaterThan(0);
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.lookAt).toEqual(bounds.center);
    });

    it('computes camera parameters with different aspect ratios', () => {
      // Arrange
      const bounds: BoundingBox = {
        min: [-10, -10, -10],
        max: [10, 10, 10],
        center: [0, 0, 0],
        radius: Math.sqrt(10 * 10 * 3), // ≈ 17.32
      };

      // Act: Test wide aspect ratio
      const wideResult = computeCameraForBounds(bounds, 2.0); // 2:1 wide
      const tallResult = computeCameraForBounds(bounds, 0.5); // 1:2 tall

      // Assert: Both should produce valid camera parameters
      expect(wideResult.near).toBeGreaterThan(0);
      expect(wideResult.far).toBeGreaterThan(wideResult.near);
      expect(tallResult.near).toBeGreaterThan(0);
      expect(tallResult.far).toBeGreaterThan(tallResult.near);
      // LookAt should always be center
      expect(wideResult.lookAt).toEqual(bounds.center);
      expect(tallResult.lookAt).toEqual(bounds.center);
    });

    it('handles very large bbox', () => {
      // Arrange
      const bounds: BoundingBox = {
        min: [-1000, -1000, -1000],
        max: [1000, 1000, 1000],
        center: [0, 0, 0],
        radius: Math.sqrt(1000 * 1000 * 3), // ≈ 1732.05
      };
      const aspect = 1.0;

      // Act
      const result = computeCameraForBounds(bounds, aspect);

      // Assert
      expect(result.near).toBeGreaterThan(0);
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.far).toBeGreaterThan(bounds.radius * 2); // Far should be beyond model
      expect(result.lookAt).toEqual(bounds.center);
    });

    it('handles very small bbox', () => {
      // Arrange
      const bounds: BoundingBox = {
        min: [-0.1, -0.1, -0.1],
        max: [0.1, 0.1, 0.1],
        center: [0, 0, 0],
        radius: Math.sqrt(0.1 * 0.1 * 3), // ≈ 0.173
      };
      const aspect = 1.0;

      // Act
      const result = computeCameraForBounds(bounds, aspect);

      // Assert
      expect(result.near).toBeGreaterThan(0);
      expect(result.near).toBeLessThan(0.1); // Near should be very close
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.lookAt).toEqual(bounds.center);
    });

    it('handles flat bbox (zero radius)', () => {
      // Arrange: Single point
      const bounds: BoundingBox = {
        min: [5, 10, 15],
        max: [5, 10, 15],
        center: [5, 10, 15],
        radius: 0,
      };
      const aspect = 1.0;

      // Act
      const result = computeCameraForBounds(bounds, aspect);

      // Assert: Should use default distance when radius is 0
      expect(result.near).toBeGreaterThan(0);
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.lookAt).toEqual(bounds.center);
      // Position should be offset from center
      const distance = Math.sqrt(
        (result.position[0] - bounds.center[0]) ** 2 +
        (result.position[1] - bounds.center[1]) ** 2 +
        (result.position[2] - bounds.center[2]) ** 2
      );
      expect(distance).toBeGreaterThan(0);
    });

    it('positions camera at reasonable distance from model', () => {
      // Arrange
      const bounds: BoundingBox = {
        min: [-10, -10, -10],
        max: [10, 10, 10],
        center: [0, 0, 0],
        radius: Math.sqrt(10 * 10 * 3), // ≈ 17.32
      };
      const aspect = 1.0;

      // Act
      const result = computeCameraForBounds(bounds, aspect);

      // Assert: Camera distance should be reasonable (not too close, not too far)
      const distance = Math.sqrt(
        result.position[0] ** 2 +
        result.position[1] ** 2 +
        result.position[2] ** 2
      );
      // Should be at least 1.5x radius away, but not more than 10x
      expect(distance).toBeGreaterThan(bounds.radius * 1.5);
      expect(distance).toBeLessThan(bounds.radius * 10);
    });
  });
});
