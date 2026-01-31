/** Sample mesh: box size [100, 50, 30], center [0, 0, 0] */
export const SAMPLE_PREVIEW = {
  meshes: [
    {
      id: 'solid:box1',
      vertices: [
        [-50, -25, -15],
        [50, -25, -15],
        [50, 25, -15],
        [-50, 25, -15],
        [-50, -25, 15],
        [50, -25, 15],
        [50, 25, 15],
        [-50, 25, 15],
      ] as [number, number, number][],
      indices: [
        0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 5, 1, 0, 4, 5, 3, 2, 6, 3, 6, 7,
        0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
      ],
    },
  ],
};

export const MIN_LEFT_PANEL = 180;
export const MAX_LEFT_PANEL = 480;
export const MIN_RIGHT_PANEL = 200;
export const MAX_RIGHT_PANEL = 560;
export const DEFAULT_LEFT_PANEL = 256;
export const DEFAULT_RIGHT_PANEL = 320;
