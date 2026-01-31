/**
 * Unit tests for threeCameraUtils - pure math utilities for bounding box
 * and camera parameter computation.
 */

import { describe, it, expect } from 'vitest';
import {
  computeBoundingBox,
  computeCameraForBounds,
  type Vec3,
  type BoundingBox,
} from '../lib/threeCameraUtils';

describe('threeCameraUtils', () => {
  describe('computeBoundingBox', () => {
    it('computes bbox for a single box geometry', () => {
      const vertices: Vec3[] = [
        [-50, -25, -15],
        [50, -25, -15],
        [50, 25, -15],
        [-50, 25, -15],
        [-50, -25, 15],
        [50, -25, 15],
        [50, 25, 15],
        [-50, 25, 15],
      ];
      const result = computeBoundingBox(vertices);
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([-50, -25, -15]);
      expect(result!.max).toEqual([50, 25, 15]);
      expect(result!.center).toEqual([0, 0, 0]);
      expect(result!.radius).toBeCloseTo(57.88, 1);
    });

    it('computes bbox for offset box geometry', () => {
      const vertices: Vec3[] = [
        [0, 10, 20],
        [20, 10, 20],
        [20, 30, 20],
        [0, 30, 20],
        [0, 10, 40],
        [20, 10, 40],
        [20, 30, 40],
        [0, 30, 40],
      ];
      const result = computeBoundingBox(vertices);
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([0, 10, 20]);
      expect(result!.max).toEqual([20, 30, 40]);
      expect(result!.center).toEqual([10, 20, 30]);
      expect(result!.radius).toBeCloseTo(17.32, 1);
    });

    it('returns null for empty vertex array', () => {
      expect(computeBoundingBox([])).toBeNull();
    });

    it('handles single vertex', () => {
      const vertices: Vec3[] = [[5, 10, 15]];
      const result = computeBoundingBox(vertices);
      expect(result).not.toBeNull();
      expect(result!.min).toEqual([5, 10, 15]);
      expect(result!.max).toEqual([5, 10, 15]);
      expect(result!.center).toEqual([5, 10, 15]);
      expect(result!.radius).toBe(0);
    });
  });

  describe('computeCameraForBounds', () => {
    it('computes camera parameters for a box bbox', () => {
      const bounds: BoundingBox = {
        min: [-50, -25, -15],
        max: [50, 25, 15],
        center: [0, 0, 0],
        radius: Math.sqrt(50 * 50 + 25 * 25 + 15 * 15),
      };
      const result = computeCameraForBounds(bounds, 1.0);
      expect(result.position).toBeDefined();
      expect(result.position.length).toBe(3);
      expect(result.near).toBeGreaterThan(0);
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.lookAt).toEqual(bounds.center);
    });

    it('handles flat bbox (zero radius)', () => {
      const bounds: BoundingBox = {
        min: [5, 10, 15],
        max: [5, 10, 15],
        center: [5, 10, 15],
        radius: 0,
      };
      const result = computeCameraForBounds(bounds, 1.0);
      expect(result.near).toBeGreaterThan(0);
      expect(result.far).toBeGreaterThan(result.near);
      expect(result.lookAt).toEqual(bounds.center);
    });
  });
});
