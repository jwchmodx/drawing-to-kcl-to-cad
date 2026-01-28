/**
 * Shared test helpers and utilities for frontend tests.
 */

/**
 * Creates a mock fetch response with the given data.
 */
export function createMockFetchResponse(data: unknown, ok: boolean = true): Response {
  return {
    ok,
    json: async () => data,
    status: ok ? 200 : 500,
  } as Response;
}

/**
 * Creates a mock fetch that returns a successful response with KCL data.
 */
export function mockSuccessfulConvertResponse(kclCode: string = 'object();', preview?: unknown) {
  return createMockFetchResponse({
    id: '1',
    kcl_code: kclCode,
    preview: preview || {
      artifacts: ['solid:box1'],
      bbox: [0, 0, 0, 1, 1, 1],
      meshes: [
        {
          id: 'solid:box1',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          indices: [0, 1, 2],
        },
      ],
    },
  });
}

/**
 * Creates a mock fetch that returns a successful modify response.
 */
export function mockSuccessfulModifyResponse(kclCode: string, preview?: unknown) {
  return createMockFetchResponse({
    kcl_code: kclCode,
    preview: preview || {
      artifacts: ['solid:modified'],
      bbox: [0, 0, 0, 2, 2, 2],
      meshes: [
        {
          id: 'solid:modified',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          indices: [0, 1, 2],
        },
      ],
    },
  });
}

/**
 * Creates a mock fetch that throws a network error.
 */
export function mockNetworkError(): Promise<never> {
  return Promise.reject(new Error('Network error'));
}
