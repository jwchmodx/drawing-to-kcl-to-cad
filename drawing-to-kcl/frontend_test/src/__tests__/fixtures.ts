/**
 * Shared test fixtures for preview data.
 */

export const validPreview = {
  meshes: [
    {
      id: 'solid:box1',
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
      ],
      indices: [0, 1, 2],
    },
  ],
};

export const emptyPreview = { meshes: [] };
export const invalidPreview = {};
