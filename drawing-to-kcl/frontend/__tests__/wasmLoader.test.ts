// Mock @kcl-lang/wasm-lib before importing wasmLoader
jest.mock('@kcl-lang/wasm-lib', () => ({
  load: jest.fn(),
}));

import { loadWasmInstance, resetWasmInstance } from '@/lib/wasmLoader';
import { load } from '@kcl-lang/wasm-lib';

describe('wasmLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWasmInstance();
  });

  it('loads WASM module successfully', async () => {
    // Arrange: Mock successful WASM load
    const mockInstance = { instance: 'wasm-instance' };
    (load as jest.Mock).mockResolvedValueOnce(mockInstance);
     (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    // Act: Load WASM instance
    const instance = await loadWasmInstance();

    // Assert: Should return the loaded instance
    expect(load).toHaveBeenCalledTimes(1);
    expect(instance).toBe(mockInstance);
  });

  it('handles WASM module loading failure', async () => {
    // Arrange: Mock failed WASM load
    const error = new Error('Failed to load WASM module');
    (load as jest.Mock).mockRejectedValueOnce(error);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    // Act & Assert: Should throw error
    await expect(loadWasmInstance()).rejects.toThrow('Failed to load WASM module');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('handles network error during WASM loading', async () => {
    // Arrange: Mock network error
    const networkError = new Error('Network request failed');
    (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

    // Act & Assert: Should throw network error
    await expect(loadWasmInstance()).rejects.toThrow('Network request failed');
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    // Arrange: Mock WASM load
    const mockInstance = { instance: 'wasm-instance' };
    (load as jest.Mock).mockResolvedValue(mockInstance);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    // Act: Load multiple times
    const instance1 = await loadWasmInstance();
    const instance2 = await loadWasmInstance();

    // Assert: Should return same instance and only load once
    expect(instance1).toBe(instance2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
