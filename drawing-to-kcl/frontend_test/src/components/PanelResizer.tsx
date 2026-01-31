import React, { useCallback, useRef } from 'react';

interface PanelResizerProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export function PanelResizer({ onResize, className = '' }: PanelResizerProps) {
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      let startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaX = moveEvent.clientX - startX;
        onResize(deltaX);
        startX = moveEvent.clientX;
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={`w-2 shrink-0 cursor-col-resize bg-white/5 hover:bg-primary/30 active:bg-primary/50 transition-colors border-x border-white/10 hover:border-primary/30 flex items-stretch ${className}`}
      onMouseDown={handleMouseDown}
    />
  );
}
