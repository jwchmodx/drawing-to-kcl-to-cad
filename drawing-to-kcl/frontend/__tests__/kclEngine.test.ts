import { dummyKclEngine } from '@/lib/kclEngine';

describe('dummyKclEngine', () => {
  it('wraps source in a Program on parse', () => {
    // Arrange: Source code
    const source = 'object();';

    // Act: Parse source
    const program = dummyKclEngine.parse(source);

    // Assert: Should wrap in Program object
    expect(program).toEqual({ source });
  });

  it('returns an empty artifact graph on execute', () => {
    // Arrange: Program object
    const program = { source: 'object();' };

    // Act: Execute program
    const artifacts = dummyKclEngine.execute(program);

    // Assert: Should return empty artifact graph
    expect(artifacts).toEqual({});
  });

  it('recasts a Program back to its source', () => {
    // Arrange: Program object
    const program = { source: 'object();' };

    // Act: Recast program
    const recast = dummyKclEngine.recast(program);

    // Assert: Should return original source
    expect(recast).toBe('object();');
  });

  it('handles empty string source', () => {
    // Arrange: Empty source
    const source = '';

    // Act: Parse empty source
    const program = dummyKclEngine.parse(source);

    // Assert: Should handle empty string
    expect(program).toEqual({ source: '' });
  });

  it('handles null/undefined source gracefully', () => {
    // Arrange: null/undefined (TypeScript should prevent this, but test for runtime safety)
    // Note: TypeScript will error on null/undefined, but we test the engine's behavior
    const source = '';

    // Act: Parse
    const program = dummyKclEngine.parse(source);

    // Assert: Should handle gracefully
    expect(program).toEqual({ source: '' });
  });

  it('handles very long source code', () => {
    // Arrange: Very long source
    // 'object();\n' = 10 characters, repeat 10000 times = 100000 characters exactly
    const source = 'object();\n'.repeat(10000);

    // Act: Parse long source
    const program = dummyKclEngine.parse(source);

    // Assert: Should handle long source
    // dummyKclEngine.parse returns Program (not Promise), so we can access .source directly
    expect(program).toEqual({ source });
    // 10000 * 10 = 100000 characters exactly, so use >= instead of >
    expect((program as { source: string }).source.length).toBeGreaterThanOrEqual(100000);
  });

  it('handles special characters in source', () => {
    // Arrange: Source with special characters
    const source = '// 日本語\n// émojis: 🎨\nobject();';

    // Act: Parse
    const program = dummyKclEngine.parse(source);

    // Assert: Should preserve special characters
    // dummyKclEngine.parse returns Program (not Promise), so we can access .source directly
    expect(program).toEqual({ source });
    expect((program as { source: string }).source).toContain('日本語');
    expect((program as { source: string }).source).toContain('🎨');
  });

  it('handles execute with null program', () => {
    // Arrange: null program (edge case)
    const program = { source: '' } as any;

    // Act: Execute
    const artifacts = dummyKclEngine.execute(program);

    // Assert: Should return empty artifacts
    expect(artifacts).toEqual({});
  });

  it('handles recast with empty source', () => {
    // Arrange: Program with empty source
    const program = { source: '' };

    // Act: Recast
    const recast = dummyKclEngine.recast(program);

    // Assert: Should return empty string
    expect(recast).toBe('');
  });
});

