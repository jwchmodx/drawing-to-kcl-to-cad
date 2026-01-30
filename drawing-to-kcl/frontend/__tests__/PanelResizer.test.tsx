/**
 * TDD: PanelResizer - 드래그로 패널 너비 조절.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { PanelResizer } from '../components/PanelResizer';

describe('PanelResizer', () => {
  it('renders resizer with data-testid', () => {
    const onDrag = jest.fn();
    render(<PanelResizer onDrag={onDrag} data-testid="resizer-left" />);
    expect(screen.getByTestId('resizer-left')).toBeInTheDocument();
  });

  it('has cursor col-resize for drag affordance', () => {
    const onDrag = jest.fn();
    render(<PanelResizer onDrag={onDrag} data-testid="resizer" />);
    const resizer = screen.getByTestId('resizer');
    expect(resizer).toHaveClass(/cursor-col-resize|col-resize/);
  });

  it('calls onDrag with deltaX when user drags', () => {
    const onDrag = jest.fn();
    render(<PanelResizer onDrag={onDrag} data-testid="resizer" />);
    const resizer = screen.getByTestId('resizer');

    fireEvent.mouseDown(resizer, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 150 });
    expect(onDrag).toHaveBeenCalledWith(50);
    fireEvent.mouseUp(document);
  });

  it('calls onDrag with negative deltaX when dragging left', () => {
    const onDrag = jest.fn();
    render(<PanelResizer onDrag={onDrag} data-testid="resizer" />);
    const resizer = screen.getByTestId('resizer');

    fireEvent.mouseDown(resizer, { clientX: 200 });
    fireEvent.mouseMove(document, { clientX: 180 });
    expect(onDrag).toHaveBeenCalledWith(-20);
    fireEvent.mouseUp(document);
  });

  it('stops calling onDrag after mouseup', () => {
    const onDrag = jest.fn();
    render(<PanelResizer onDrag={onDrag} data-testid="resizer" />);
    const resizer = screen.getByTestId('resizer');

    fireEvent.mouseDown(resizer, { clientX: 0 });
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 50 });
    expect(onDrag).not.toHaveBeenCalled();
  });
});
