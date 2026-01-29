import { wasmKclEngine } from '@/lib/kclEngine';
import { loadWasmInstance, resetWasmInstance } from '@/lib/wasmLoader';
import { invokeKCLRun } from '@kcl-lang/wasm-lib';

// Mock dependencies
jest.mock('@/lib/wasmLoader');
jest.mock('@kcl-lang/wasm-lib', () => ({
  invokeKCLRun: jest.fn(),
}));

describe('wasmKclEngine', () => {
  const mockInstance = { instance: 'wasm-instance' };

  beforeEach(() => {
    jest.clearAllMocks();
    resetWasmInstance();
    (loadWasmInstance as jest.Mock).mockResolvedValue(mockInstance);
  });

  describe('parse', () => {
    it('parses valid KCL code successfully', async () => {
      // Arrange: Valid KCL code
      const source = 'object();';
      // invokeKCLRun returns YAML string output
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('');

      // Act: Parse source
      const program = await wasmKclEngine.parse(source);

      // Assert: Should return Program object
      expect(loadWasmInstance).toHaveBeenCalledTimes(1);
      expect(invokeKCLRun).toHaveBeenCalledWith(mockInstance, {
        filename: 'parse.k',
        source,
      });
      expect(program).toEqual({ source });
    });

    it('handles invalid KCL code with syntax error', async () => {
      // Arrange: Invalid KCL code
      const source = 'invalid syntax {';
      // invokeKCLRun returns error message in YAML output
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('error: Syntax error: unexpected token');

      // Act & Assert: Should throw error
      await expect(wasmKclEngine.parse(source)).rejects.toThrow('KCL parse error');
    });

    it('handles empty string source', async () => {
      // Arrange: Empty source
      const source = '';
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('');

      // Act: Parse empty source
      const program = await wasmKclEngine.parse(source);

      // Assert: Should handle empty string
      expect(program).toEqual({ source: '' });
    });

    it('handles very long source code', async () => {
      // Arrange: Very long source
      const source = 'object();\n'.repeat(1000);
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('');

      // Act: Parse long source
      const program = await wasmKclEngine.parse(source);

      // Assert: Should handle long source
      // 1000 * 10 = 10000 characters exactly
      expect(program.source.length).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('execute', () => {
    it('executes program and returns artifact graph', async () => {
      // Arrange: Valid program
      const program = { source: 'object();' };
      // invokeKCLRun returns JSON string output representing an artifact graph
      (invokeKCLRun as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
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
        }),
      );

      // Act: Execute program
      const artifacts = await wasmKclEngine.execute(program);

      // Assert: Should return parsed artifact graph
      expect(loadWasmInstance).toHaveBeenCalledTimes(1);
      expect(invokeKCLRun).toHaveBeenCalledWith(mockInstance, {
        filename: 'execute.k',
        source: program.source,
      });
      expect(artifacts.artifacts).toEqual(['solid:box1']);
      expect(artifacts.nodes['solid:box1']).toBeDefined();
      expect(artifacts.nodes['solid:box1'].geometry?.vertices).toHaveLength(3);
      expect(artifacts.nodes['solid:box1'].geometry?.indices).toEqual([0, 1, 2]);
    });

    it('handles execution error', async () => {
      // Arrange: Program that causes error
      const program = { source: 'invalid();' };
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('error: Execution error');

      // Act & Assert: Should throw error
      await expect(wasmKclEngine.execute(program)).rejects.toThrow('KCL execution error');
    });

    it('handles empty artifact graph', async () => {
      // Arrange: Program that produces no artifacts
      const program = { source: '// empty program' };
      (invokeKCLRun as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          artifacts: [],
          nodes: {},
        }),
      );

      // Act: Execute program
      const artifacts = await wasmKclEngine.execute(program);

      // Assert: Should return empty artifact graph structure
      expect(artifacts.artifacts).toEqual([]);
      expect(Object.keys(artifacts.nodes)).toHaveLength(0);
    });
  });

  describe('recast', () => {
    it('recasts program to formatted code', async () => {
      // Arrange: Program with unformatted code
      const program = { source: 'object(  );' };
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('');

      // Act: Recast program
      const recast = await wasmKclEngine.recast(program);

      // Assert: Should return code (original for now, as recast API not available)
      expect(loadWasmInstance).toHaveBeenCalledTimes(1);
      expect(invokeKCLRun).toHaveBeenCalledWith(mockInstance, {
        filename: 'recast.k',
        source: program.source,
      });
      expect(recast).toBe(program.source);
    });

    it('handles recast error', async () => {
      // Arrange: Program that causes recast error
      const program = { source: 'invalid();' };
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('error: Recast error');

      // Act & Assert: Should throw error
      await expect(wasmKclEngine.recast(program)).rejects.toThrow('KCL recast error');
    });

    it('handles empty source in recast', async () => {
      // Arrange: Program with empty source
      const program = { source: '' };
      (invokeKCLRun as jest.Mock).mockReturnValueOnce('');

      // Act: Recast program
      const recast = await wasmKclEngine.recast(program);

      // Assert: Should return empty string
      expect(recast).toBe('');
    });
  });

  describe('integration', () => {
    it('performs full workflow: parse → execute → recast', async () => {
      // Arrange: KCL source code
      const source = 'object();';
      const program = { source };

      (invokeKCLRun as jest.Mock)
        .mockReturnValueOnce('') // parse
        .mockReturnValueOnce(
          JSON.stringify({
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
          }),
        ) // execute
        .mockReturnValueOnce(''); // recast

      // Act: Perform full workflow
      const parsed = await wasmKclEngine.parse(source);
      const executed = await wasmKclEngine.execute(parsed);
      const recasted = await wasmKclEngine.recast(parsed);

      // Assert: All steps should succeed
      expect(parsed).toEqual(program);
      expect(executed.artifacts).toEqual(['solid:box1']);
      expect(recasted).toBe(source);
      expect(invokeKCLRun).toHaveBeenCalledTimes(3);
    });
  });
});
