import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import { useKclModel } from '@/lib/useKclModel';

function TestComponent({ initial }: { initial: string }) {
  const { source, program, artifacts, parse, execute, recast, setSource } = useKclModel(initial);

  return (
    <div>
      <div data-testid="source">{source}</div>
      <div data-testid="has-program">{program ? 'yes' : 'no'}</div>
      <div data-testid="has-artifacts">{artifacts ? 'yes' : 'no'}</div>
      <button
        type="button"
        onClick={() => {
          void parse();
        }}
      >
        parse
      </button>
      <button
        type="button"
        onClick={() => {
          void execute();
        }}
      >
        execute
      </button>
      <button
        type="button"
        onClick={() => {
          void recast();
        }}
      >
        recast
      </button>
      <button
        type="button"
        onClick={() => {
          setSource('updated();');
        }}
      >
        update-source
      </button>
    </div>
  );
}

describe('useKclModel', () => {
  it('initializes with the given source and can parse/execute/recast with dummy engine', async () => {
    render(<TestComponent initial="object();" />);

    expect(screen.getByTestId('source').textContent).toBe('object();');
    expect(screen.getByTestId('has-program').textContent).toBe('no');
    expect(screen.getByTestId('has-artifacts').textContent).toBe('no');

    const parseButton = screen.getByText('parse');
    await act(async () => {
      parseButton.click();
    });

    expect(screen.getByTestId('has-program').textContent).toBe('yes');

    const executeButton = screen.getByText('execute');
    await act(async () => {
      executeButton.click();
    });

    // Dummy engine returns an empty object for artifacts, which is truthy
    expect(screen.getByTestId('has-artifacts').textContent).toBe('yes');

    const updateButton = screen.getByText('update-source');
    await act(async () => {
      updateButton.click();
    });
    expect(screen.getByTestId('source').textContent).toBe('updated();');

    // Parse again after updating source to get the new program
    await act(async () => {
      parseButton.click();
    });

    const recastButton = screen.getByText('recast');
    await act(async () => {
      recastButton.click();
    });
    // Dummy recast returns the program's source, which should be 'updated();'
    await waitFor(() => {
      expect(screen.getByTestId('source').textContent).toBe('updated();');
    });
  });

  it('handles empty initial source', () => {
    // Arrange: Empty initial source
    render(<TestComponent initial="" />);

    // Assert: Should initialize with empty source
    expect(screen.getByTestId('source').textContent).toBe('');
    expect(screen.getByTestId('has-program').textContent).toBe('no');
  });

  it('handles execute when program is null', async () => {
    // Arrange: Component without parsing first
    render(<TestComponent initial="object();" />);

    // Act: Try to execute without parsing
    const executeButton = screen.getByText('execute');
    await act(async () => {
      executeButton.click();
    });

    // Assert: Should not crash, artifacts should remain null
    expect(screen.getByTestId('has-artifacts').textContent).toBe('no');
  });

  it('handles recast when program is null', async () => {
    // Arrange: Component without parsing first
    render(<TestComponent initial="object();" />);

    // Act: Try to recast without parsing
    const recastButton = screen.getByText('recast');
    await act(async () => {
      recastButton.click();
    });

    // Assert: Should not crash, source should remain unchanged
    expect(screen.getByTestId('source').textContent).toBe('object();');
  });

  it('handles very long source code', () => {
    // Arrange: Very long source (but not too long to avoid performance issues)
    // 100 repetitions of 'object();\n' = 10 characters * 100 = 1000 characters exactly
    const longSource = 'object();\n'.repeat(100);

    render(<TestComponent initial={longSource} />);

    // Assert: Should handle long source
    const sourceElement = screen.getByTestId('source');
    expect(sourceElement.textContent).toBe(longSource);
    // 100 * 10 = 1000 characters exactly, so use >= instead of >
    expect(sourceElement.textContent?.length).toBeGreaterThanOrEqual(1000);
  });
});

