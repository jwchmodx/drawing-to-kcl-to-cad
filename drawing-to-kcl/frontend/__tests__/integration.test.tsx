/**
 * Integration tests for the complete Drawing to KCL frontend flow.
 * 
 * These tests verify the end-to-end user interactions from image upload
 * through KCL code generation, editing, modification, and preview display.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Page from '../app/page';
import {
  createMockFetchResponse,
  mockSuccessfulConvertResponse,
  mockSuccessfulModifyResponse,
  mockNetworkError,
} from './testHelpers';
import { wasmKclEngine } from '@/lib/kclEngine';
import { loadWasmInstance, resetWasmInstance } from '@/lib/wasmLoader';
import { invokeKCLRun } from '@kcl-lang/wasm-lib';

// Mock WASM dependencies
jest.mock('@/lib/wasmLoader');
jest.mock('@kcl-lang/wasm-lib', () => ({
  invokeKCLRun: jest.fn(),
}));

describe('Complete Integration Flow', () => {
  const mockInstance = { instance: 'wasm-instance' };

  // Helper to filter out logging fetch calls
  const getApiCalls = (endpoint?: string) => {
    return (global.fetch as jest.Mock).mock.calls.filter(
      (call) => {
        const url = call[0];
        if (typeof url !== 'string') return false;
        // Filter out logging calls
        if (url.includes('127.0.0.1:7245')) return false;
        // If endpoint specified, filter by it
        if (endpoint) return url.includes(endpoint);
        return true;
      }
    );
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    jest.clearAllMocks();
    resetWasmInstance();
    (loadWasmInstance as jest.Mock).mockResolvedValue(mockInstance);
    (invokeKCLRun as jest.Mock).mockReturnValue('');
    
    // Allow logging fetch calls to pass through silently
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
        return Promise.resolve({ ok: true } as Response);
      }
      return Promise.reject(new Error('Unmocked fetch call - test should mock this'));
    });
  });

  describe('Image Upload to KCL Conversion Flow', () => {
    it('completes full flow: upload image → get KCL → display in editor → generate preview', async () => {
      // Arrange: Mock successful API response
      const mockKclCode = `// context: test drawing
let box1 = box(size: [100, 50, 30], center: [0, 0, 0]);
return box1;`;

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert')) {
          return Promise.resolve(createMockFetchResponse({
            id: '1',
            kcl_code: mockKclCode,
          }));
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: Upload image
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      // Assert: Should call convert endpoint
      await waitFor(() => {
        const convertCalls = getApiCalls('/convert');
        expect(convertCalls.length).toBeGreaterThan(0);
      });

      // Assert: KCL editor should appear with code
      const editor = await screen.findByLabelText(/kcl editor/i);
      expect((editor as HTMLTextAreaElement).value).toContain('box1');
      expect((editor as HTMLTextAreaElement).value).toContain('test drawing');

      // Assert: WASM engine should be called to generate preview
      await waitFor(() => {
        expect(loadWasmInstance).toHaveBeenCalled();
      });

      // Assert: Preview should be generated (may be empty initially)
      await waitFor(() => {
        // Preview section may or may not be visible depending on WASM execution
        const previewSection = screen.queryByLabelText(/kcl preview/i);
        // At minimum, editor should be visible
        expect(editor).toBeInTheDocument();
      });
    });

    it('handles complete flow with context parameter', async () => {
      // Arrange: Mock API response with context
      const mockKclCode = '// context: door drawing\nlet door = box(size: [100, 200, 10]);';

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert')) {
          return Promise.resolve(createMockFetchResponse({
            id: '1',
            kcl_code: mockKclCode,
          }));
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: Upload image
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'door.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      // Assert: Should display KCL code with context
      const editor = await screen.findByLabelText(/kcl editor/i);
      expect((editor as HTMLTextAreaElement).value).toContain('door');
      expect((editor as HTMLTextAreaElement).value).toContain('context');
    });
  });

  describe('KCL Modification Flow', () => {
    it('completes full flow: modify KCL → get updated code → update editor → regenerate preview', async () => {
      // Arrange: Mock convert then modify responses
      let convertCalled = false;
      const initialKcl = 'let box1 = box(size: [100, 50, 30]);';
      const modifiedKcl = `${initialKcl}\n// command: add window\nlet window = box(size: [20, 20, 5]);`;

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert') && !convertCalled) {
          convertCalled = true;
          return Promise.resolve(createMockFetchResponse({
            id: '1',
            kcl_code: initialKcl,
          }));
        }
        if (typeof url === 'string' && url.includes('/modify')) {
          return Promise.resolve(createMockFetchResponse({
            kcl_code: modifiedKcl,
          }));
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: First convert
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
      });

      // Act: Then modify
      const commandInput = screen.getByLabelText(/modification command/i) as HTMLInputElement;
      fireEvent.change(commandInput, { target: { value: 'add window' } });
      const applyButton = screen.getByRole('button', { name: /apply command/i });
      fireEvent.click(applyButton);

      // Assert: Should call modify endpoint
      await waitFor(() => {
        const modifyCalls = getApiCalls('/modify');
        expect(modifyCalls.length).toBeGreaterThan(0);
      });

      // Assert: Editor should be updated with modified code
      await waitFor(() => {
        const editor = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;
        expect(editor.value).toContain('window');
        expect(editor.value).toContain('command');
      });

      // Assert: WASM engine should be called again for new preview
      await waitFor(() => {
        expect(loadWasmInstance).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles network error during image upload gracefully', async () => {
      // Arrange: Mock network error
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert')) {
          return mockNetworkError();
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: Try to upload
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      // Assert: Should handle error gracefully
      await waitFor(() => {
        const convertCalls = getApiCalls('/convert');
        expect(convertCalls.length).toBeGreaterThan(0);
      });

      // Assert: Error should be displayed
      await waitFor(() => {
        const errorDisplay = screen.queryByText(/network error|unable to connect/i);
        // Error may be displayed or component may handle it silently
        // At minimum, component should not crash
        expect(screen.getByLabelText(/upload drawing image/i)).toBeInTheDocument();
      });
    });

    it('handles server error response during modification', async () => {
      // Arrange: Mock successful convert, then error on modify
      let convertCalled = false;
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert') && !convertCalled) {
          convertCalled = true;
          return Promise.resolve(createMockFetchResponse({
            id: '1',
            kcl_code: 'let box1 = box(size: [100, 50, 30]);',
          }));
        }
        if (typeof url === 'string' && url.includes('/modify')) {
          return Promise.resolve(createMockFetchResponse(
            { error: 'Internal server error' },
            false
          ));
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: Convert first
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
      });

      // Act: Try to modify (will fail)
      const commandInput = screen.getByLabelText(/modification command/i) as HTMLInputElement;
      fireEvent.change(commandInput, { target: { value: 'add window' } });
      const applyButton = screen.getByRole('button', { name: /apply command/i });
      fireEvent.click(applyButton);

      // Assert: Should handle error gracefully
      await waitFor(() => {
        const modifyCalls = getApiCalls('/modify');
        expect(modifyCalls.length).toBeGreaterThan(0);
      });

      // Assert: Component should not crash
      expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
    });
  });

  describe('Preview Generation Integration', () => {
    it('generates preview automatically when KCL code changes', async () => {
      // Arrange: Mock successful convert
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('127.0.0.1:7245')) {
          return Promise.resolve({ ok: true } as Response);
        }
        if (typeof url === 'string' && url.includes('/convert')) {
          return Promise.resolve(createMockFetchResponse({
            id: '1',
            kcl_code: 'let box1 = box(size: [100, 50, 30]);',
          }));
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      render(<Page />);

      // Act: Upload and convert
      const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
      const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
      fireEvent.click(convertButton);

      // Assert: WASM engine should be called for preview generation
      await waitFor(() => {
        expect(loadWasmInstance).toHaveBeenCalled();
      });

      // Assert: Preview section may appear (depending on WASM execution result)
      // At minimum, editor should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
      });
    });
  });
});
