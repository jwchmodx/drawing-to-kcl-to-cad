import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Page from '../app/page';

describe('Main Page integration', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('uploads an image, calls /convert, and shows returned KCL code', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '1',
        kcl_code: 'kcl_from_test();',
        preview: {
          artifacts: ['solid:box1'],
          bbox: [0, 0, 0, 1, 2, 3]
        }
      })
    });

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toMatch(/\/convert$/);

    const editor = await screen.findByLabelText(/kcl editor/i);
    expect((editor as HTMLTextAreaElement).value).toContain('kcl_from_test();');

    // Preview JSON should also be rendered
    const preview = await screen.findByTestId('kcl-preview');
    expect(preview.textContent).toContain('solid:box1');
  });

  it('submits a modification command, calls /modify, and updates editor', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '1',
          kcl_code: 'initial_kcl();',
          preview: {
            artifacts: ['solid:initial'],
            bbox: [0, 0, 0, 1, 1, 1]
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kcl_code: 'modified_kcl();',
          preview: {
            artifacts: ['solid:modified'],
            bbox: [0, 0, 0, 2, 2, 2]
          }
        })
      });

    render(<Page />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    const convertButton = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(convertButton);

    const editor = await screen.findByLabelText(/kcl editor/i);
    expect((editor as HTMLTextAreaElement).value).toContain('initial_kcl();');

    const commandInput = screen.getByLabelText(/modification command/i) as HTMLInputElement;
    fireEvent.change(commandInput, { target: { value: 'add window' } });

    const applyButton = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(applyButton);

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
    const preview = await screen.findByTestId('kcl-preview');
    expect(preview.textContent).toContain('solid:modified');
  });
});

