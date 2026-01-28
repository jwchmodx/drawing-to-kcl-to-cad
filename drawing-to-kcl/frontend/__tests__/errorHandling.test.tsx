import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import {
  formatKclError,
  formatWasmError,
  formatNetworkError,
} from '@/lib/errorHandler';
import { ErrorDisplay } from '@/components/ErrorDisplay';

describe('errorHandler', () => {
  describe('formatKclError', () => {
    it('formats KCL syntax error message', () => {
      // Arrange: KCL syntax error
      const error = new Error('Syntax error at line 5: unexpected token');

      // Act: Format error
      const formatted = formatKclError(error);

      // Assert: Should return user-friendly message
      expect(formatted).toContain('KCL');
      expect(formatted).toContain('line 5');
    });

    it('handles generic KCL error', () => {
      // Arrange: Generic error
      const error = new Error('KCL execution failed');

      // Act: Format error
      const formatted = formatKclError(error);

      // Assert: Should return formatted message
      expect(formatted).toBeTruthy();
    });
  });

  describe('formatWasmError', () => {
    it('formats WASM initialization error', () => {
      // Arrange: WASM error
      const error = new Error('Failed to load WASM module');

      // Act: Format error
      const formatted = formatWasmError(error);

      // Assert: Should return user-friendly message
      expect(formatted).toContain('WASM');
    });

    it('handles network error during WASM loading', () => {
      // Arrange: Network error
      const error = new Error('Network request failed');

      // Act: Format error
      const formatted = formatWasmError(error);

      // Assert: Should mention network issue (case-insensitive)
      expect(formatted.toLowerCase()).toContain('network');
    });
  });

  describe('formatNetworkError', () => {
    it('formats network error message', () => {
      // Arrange: Network error
      const error = new Error('Network error');

      // Act: Format error
      const formatted = formatNetworkError(error);

      // Assert: Should return user-friendly message (case-insensitive)
      expect(formatted.toLowerCase()).toContain('network');
    });

    it('handles fetch error', () => {
      // Arrange: Fetch error
      const error = new Error('Failed to fetch');

      // Act: Format error
      const formatted = formatNetworkError(error);

      // Assert: Should return formatted message
      expect(formatted).toBeTruthy();
    });

    it('handles CORS error', () => {
      // Arrange: CORS error (typically "Failed to fetch" or "NetworkError")
      const error = new Error('Failed to fetch');
      (error as any).name = 'TypeError';

      // Act: Format error
      const formatted = formatNetworkError(error);

      // Assert: Should return user-friendly message
      expect(formatted.toLowerCase()).toContain('network');
      expect(formatted.toLowerCase()).toContain('unable to connect');
    });

    it('handles connection refused error', () => {
      // Arrange: Connection refused error
      const error = new Error('Connection refused');

      // Act: Format error
      const formatted = formatNetworkError(error);

      // Assert: Should return formatted message
      expect(formatted).toBeTruthy();
    });

    it('handles timeout error', () => {
      // Arrange: Timeout error
      const error = new Error('Request timeout');

      // Act: Format error
      const formatted = formatNetworkError(error);

      // Assert: Should return formatted message
      expect(formatted).toBeTruthy();
    });
  });
});

describe('ErrorDisplay', () => {
  it('renders error message', () => {
    // Arrange: Error message
    const error = 'KCL syntax error at line 5';

    // Act: Render component
    render(<ErrorDisplay error={error} />);

    // Assert: Should display error
    expect(screen.getByText(/KCL syntax error/i)).toBeInTheDocument();
  });

  it('handles null error', () => {
    // Arrange: No error
    const error = null;

    // Act: Render component
    const { container } = render(<ErrorDisplay error={error} />);

    // Assert: Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('renders with custom className', () => {
    // Arrange: Error with custom class
    const error = 'Test error';

    // Act: Render component
    const { container } = render(<ErrorDisplay error={error} className="custom-class" />);

    // Assert: Should have custom class
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
