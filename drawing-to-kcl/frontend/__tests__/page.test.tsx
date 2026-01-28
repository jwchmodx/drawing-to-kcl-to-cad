import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Page from '../app/page';
import {
  mockSuccessfulConvertResponse,
  mockSuccessfulModifyResponse,
  mockNetworkError,
  createMockFetchResponse,
} from './testHelpers';

describe('Main Page integration', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('uploads an image, calls /convert, and shows returned KCL code', async () => {
    // Arrange: Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockSuccessfulConvertResponse('kcl_from_test();', {
        artifacts: ['solid:box1'],
        bbox: [0, 0, 0, 1, 2, 3],
        meshes: [
          {
            id: 'solid:box1',
            vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
            indices: [0, 1, 2],
          },
        ],
      })
    );

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    // Act: Upload image and convert
    fireEvent.change(fileInput, { target: { files: [file] } });
    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    // Assert: Should call API and display results
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/\/convert$/);

    const editor = await screen.findByLabelText(/kcl editor/i);
    expect((editor as HTMLTextAreaElement).value).toContain('kcl_from_test();');

    // Preview JSON should also be rendered
    const previewJson = await screen.findByTestId('kcl-preview-json');
    expect(previewJson.textContent).toContain('solid:box1');

    // 3D preview container should exist
    const preview3d = await screen.findByTestId('kcl-preview-3d');
    expect(preview3d).toBeInTheDocument();
  });

  it('submits a modification command, calls /modify, and updates editor', async () => {
    // Arrange: Mock two API responses (convert then modify)
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockSuccessfulConvertResponse('initial_kcl();', {
          artifacts: ['solid:initial'],
          bbox: [0, 0, 0, 1, 1, 1],
          meshes: [
            {
              id: 'solid:initial',
              vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
              indices: [0, 1, 2],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccessfulModifyResponse('modified_kcl();', {
          artifacts: ['solid:modified'],
          bbox: [0, 0, 0, 2, 2, 2],
          meshes: [
            {
              id: 'solid:modified',
              vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
              indices: [0, 1, 2],
            },
          ],
        })
      );

    render(<Page />);

    // Act: First convert an image
    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    const editor = await screen.findByLabelText(/kcl editor/i);
    expect((editor as HTMLTextAreaElement).value).toContain('initial_kcl();');

    // Then modify with a command
    const commandInput = screen.getByLabelText(/modification command/i) as HTMLInputElement;
    fireEvent.change(commandInput, { target: { value: 'add window' } });
    const applyButton = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(applyButton);

    // Assert: Should call modify endpoint and update editor
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const secondCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(secondCall[0]).toMatch(/\/modify$/);
    expect(secondCall[1]?.method).toBe('PATCH');

    const body = JSON.parse(secondCall[1]?.body as string);
    expect(body.command).toBe('add window');
    expect(body.kcl_code).toContain('initial_kcl();');

    await waitFor(() => {
      expect((screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement).value).toContain('modified_kcl();');
    });

    // Preview should update to reflect modified response
    const previewJson = await screen.findByTestId('kcl-preview-json');
    expect(previewJson.textContent).toContain('solid:modified');
  });

  it('handles API error response on convert', async () => {
    // Arrange: Mock fetch to return error
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockFetchResponse({ error: 'Internal server error' }, false)
    );

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    // Assert: Should handle error gracefully (component may show error or not update)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    // Component should not crash - KclEditor may not be rendered if kclCode is empty
    // which is expected behavior when API fails
    expect(screen.getByLabelText(/upload drawing image/i)).toBeInTheDocument();
  });

  it('handles network failure on convert', async () => {
    // Arrange: Mock fetch to throw network error
    (global.fetch as jest.Mock).mockImplementationOnce(() => mockNetworkError());

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    
    // Act: Click convert (will trigger network error, but should be caught)
    fireEvent.click(convertButton);

    // Assert: Should handle network error gracefully
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    // Component should not crash - KclEditor may not be rendered if kclCode is empty
    // which is expected behavior when API fails
    expect(screen.getByLabelText(/upload drawing image/i)).toBeInTheDocument();
  });

  it('handles response without preview field', async () => {
    // Arrange: Mock response without preview
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockFetchResponse({
        id: '1',
        kcl_code: 'kcl_from_test();',
        // preview field missing
      })
    );

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    // Assert: Should handle missing preview
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const editor = await screen.findByLabelText(/kcl editor/i);
    expect((editor as HTMLTextAreaElement).value).toContain('kcl_from_test();');
  });

  it('handles API error response on modify', async () => {
    // Arrange: Mock successful convert, then error on modify
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        mockSuccessfulConvertResponse('initial_kcl();', { artifacts: [], bbox: null, meshes: [] })
      )
      .mockResolvedValueOnce(createMockFetchResponse({ error: 'Bad request' }, false));

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
    });

    const commandInput = screen.getByLabelText(/modification command/i) as HTMLInputElement;
    fireEvent.change(commandInput, { target: { value: 'add window' } });

    const applyButton = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(applyButton);

    // Assert: Should handle error gracefully
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    // Component should not crash
    expect(screen.getByLabelText(/kcl editor/i)).toBeInTheDocument();
  });
});

