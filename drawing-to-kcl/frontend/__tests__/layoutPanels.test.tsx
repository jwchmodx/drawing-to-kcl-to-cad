/**
 * TDD: 레이아웃 및 3열 패널 검증.
 * - 왼쪽(코드), 가운데(3D 프리뷰), 오른쪽(채팅) 패널 존재, 리사이저, 첨부 버튼.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import Page from '../app/page';
import { loadWasmInstance, resetWasmInstance } from '@/lib/wasmLoader';
import { invokeKCLRun } from '@kcl-lang/wasm-lib';

jest.mock('@/lib/wasmLoader');
jest.mock('@kcl-lang/wasm-lib', () => ({ invokeKCLRun: jest.fn() }));

describe('Layout & Panels (3-column Cursor-style)', () => {
  const mockInstance = { instance: 'wasm-instance' };

  beforeEach(() => {
    (global.fetch as jest.Mock)?.mockReset?.();
    jest.clearAllMocks();
    resetWasmInstance();
    (loadWasmInstance as jest.Mock).mockResolvedValue(mockInstance);
    (invokeKCLRun as jest.Mock).mockReturnValue('');
    (global.fetch as jest.Mock)?.mockImplementation?.(() =>
      Promise.reject(new Error('Unmocked fetch'))
    );
  });

  it('renders three panels with data-testid', () => {
    render(<Page />);
    expect(screen.getByTestId('panel-left')).toBeInTheDocument();
    expect(screen.getByTestId('panel-center')).toBeInTheDocument();
    expect(screen.getByTestId('panel-right')).toBeInTheDocument();
  });

  it('left panel shows Files & Code header and hint', () => {
    render(<Page />);
    expect(screen.getByText(/Files & Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Attach image in Chat/i)).toBeInTheDocument();
  });

  it('right panel shows Chat and command input', () => {
    render(<Page />);
    expect(screen.getByText(/Chat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modification command/i)).toBeInTheDocument();
  });

  it('chat has attach file button for embedding image', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: /attach file/i })).toBeInTheDocument();
  });

  it('renders two panel resizers for drag-to-resize', () => {
    render(<Page />);
    expect(screen.getByTestId('resizer-left')).toBeInTheDocument();
    expect(screen.getByTestId('resizer-right')).toBeInTheDocument();
  });

  it('left panel has configurable width from state', () => {
    render(<Page />);
    const leftPanel = screen.getByTestId('panel-left');
    expect(leftPanel).toHaveStyle({ width: '280px' });
  });

  it('right panel has configurable width from state', () => {
    render(<Page />);
    const rightPanel = screen.getByTestId('panel-right');
    expect(rightPanel).toHaveStyle({ width: '320px' });
  });

  it('center panel uses flex-1 so preview is largest', () => {
    render(<Page />);
    const centerPanel = screen.getByTestId('panel-center');
    expect(centerPanel).toHaveClass('flex-1');
    expect(centerPanel).toHaveClass('min-w-0');
  });
});
