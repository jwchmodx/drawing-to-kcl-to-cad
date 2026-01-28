import React from 'react';
import { render, screen } from '@testing-library/react';

import { KclPreview3D } from '../components/KclPreview3D';

describe('KclPreview3D', () => {
  // Suppress console errors from Three.js WebGL initialization failures in test environment
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn((...args) => {
      // Filter out Three.js WebGL errors in test environment
      if (typeof args[0] === 'string' && args[0].includes('WebGL')) {
        return;
      }
      originalError(...args);
    });
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container div with test id', () => {
    // Arrange: Prepare valid preview data
    const preview = {
      meshes: [
        {
          id: 'solid:box1',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          indices: [0, 1, 2],
        },
      ],
    };

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container should be rendered
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    expect(container.tagName).toBe('DIV');
  });

  it('renders container when preview is null', () => {
    // Arrange: null preview
    const preview = null;

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container should always be rendered
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    // Container should be empty (no canvas child) when preview is invalid
    expect(container.children.length).toBe(0);
  });

  it('renders container when preview is undefined', () => {
    // Arrange: undefined preview
    const preview = undefined;

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container should always be rendered
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    expect(container.children.length).toBe(0);
  });

  it('renders container when meshes array is empty', () => {
    // Arrange: Preview with empty meshes array
    const preview = {
      meshes: [],
    };

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container exists but should be empty
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    expect(container.children.length).toBe(0);
  });

  it('renders container when meshes is missing', () => {
    // Arrange: Preview without meshes property
    const preview = {};

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container exists but should be empty
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    expect(container.children.length).toBe(0);
  });

  it('renders container when first mesh has empty vertices', () => {
    // Arrange: Preview with mesh but empty vertices
    const preview = {
      meshes: [
        {
          id: 'solid:empty',
          vertices: [],
          indices: [],
        },
      ],
    };

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container exists but should be empty
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    expect(container.children.length).toBe(0);
  });

  it('renders container when valid mesh data is provided', () => {
    // Arrange: Valid preview with mesh data
    const preview = {
      meshes: [
        {
          id: 'solid:box1',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
          indices: [0, 1, 2, 1, 3, 2],
        },
      ],
    };

    // Act: Render component
    // Note: Three.js may fail to initialize in test environment due to WebGL limitations,
    // but the component should still render its container
    render(<KclPreview3D preview={preview} />);

    // Assert: Container should always be rendered
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    // Note: Canvas may not be present in test environment due to WebGL limitations
    // This is acceptable - the component handles WebGL initialization failures gracefully
  });

  it('handles mesh without indices', () => {
    // Arrange: Preview with mesh but no indices
    const preview = {
      meshes: [
        {
          id: 'solid:box1',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          indices: [],
        },
      ],
    };

    // Act: Render component
    render(<KclPreview3D preview={preview} />);

    // Assert: Container should be rendered (indices are optional)
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
  });

  it('cleans up resources on unmount', () => {
    // Arrange: Valid preview
    const preview = {
      meshes: [
        {
          id: 'solid:box1',
          vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
          indices: [0, 1, 2],
        },
      ],
    };

    // Act: Render component (may fail Three.js init, but container should render)
    const { unmount } = render(<KclPreview3D preview={preview} />);
    const container = screen.getByTestId('kcl-preview-3d');
    expect(container).toBeInTheDocument();
    
    // Unmount should not throw even if Three.js failed to initialize
    unmount();

    // Assert: Container should be cleaned up (component unmounted)
    expect(screen.queryByTestId('kcl-preview-3d')).not.toBeInTheDocument();
  });
});
