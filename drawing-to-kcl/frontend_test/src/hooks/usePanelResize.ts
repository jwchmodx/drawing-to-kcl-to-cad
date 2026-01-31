import { useCallback, useState } from 'react';

/**
 * Hook for resizable panel width with min/max bounds.
 * @param initialWidth - Initial width in px
 * @param min - Minimum width
 * @param max - Maximum width
 * @param deltaSign - +1 when resizer is on the left of panel (drag right = grow), -1 when on the right (drag right = shrink)
 */
export function usePanelResize(
  initialWidth: number,
  min: number,
  max: number,
  deltaSign: 1 | -1 = 1
) {
  const [width, setWidth] = useState(initialWidth);
  const onResize = useCallback(
    (deltaX: number) => {
      setWidth((w) => {
        const next = w + deltaSign * deltaX;
        return Math.min(max, Math.max(min, next));
      });
    },
    [min, max, deltaSign]
  );
  return [width, onResize] as const;
}
