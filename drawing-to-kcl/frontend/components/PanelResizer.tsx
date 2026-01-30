'use client';

import React, { useCallback, useRef } from 'react';

export interface PanelResizerProps {
  onDrag: (deltaX: number) => void;
  'data-testid'?: string;
}

export const PanelResizer: React.FC<PanelResizerProps> = ({ onDrag, 'data-testid': dataTestId }) => {
  const startX = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX.current;
        startX.current = moveEvent.clientX;
        onDrag(deltaX);
      };
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onDrag]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-testid={dataTestId ?? 'panel-resizer'}
      className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-zinc-700 transition-colors"
      onMouseDown={handleMouseDown}
    />
  );
};
