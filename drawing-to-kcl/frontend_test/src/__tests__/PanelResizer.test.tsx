import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act, within } from './test-utils';
import { PanelResizer } from '../components/PanelResizer';

function renderPanelResizer(props: { onResize?: ReturnType<typeof vi.fn>; className?: string } = {}) {
  const onResize = props.onResize ?? vi.fn();
  const result = render(<PanelResizer onResize={onResize} className={props.className} />);
  const resizer = within(result.container).getByRole('separator');
  return { resizer, onResize };
}

function dragResizer(resizer: HTMLElement, fromX: number, toX: number) {
  act(() => fireEvent.mouseDown(resizer, { clientX: fromX }));
  act(() => fireEvent.mouseMove(document, { clientX: toX }));
}

function endDrag() {
  act(() => fireEvent.mouseUp(document));
}

describe('PanelResizer', () => {
  describe('rendering', () => {
    it('renders separator with vertical orientation', () => {
      const { resizer } = renderPanelResizer();
      expect(resizer).toBeInTheDocument();
      expect(resizer).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('applies custom className', () => {
      const { resizer } = renderPanelResizer({ onResize: vi.fn(), className: 'custom-class' });
      expect(resizer).toHaveClass('custom-class');
    });
  });

  describe('drag behavior', () => {
    it('calls onResize with deltaX on move right then left', () => {
      const onResize = vi.fn();
      const { resizer } = renderPanelResizer({ onResize });

      dragResizer(resizer, 100, 150);
      expect(onResize).toHaveBeenCalledWith(50);

      act(() => fireEvent.mouseMove(document, { clientX: 120 }));
      expect(onResize).toHaveBeenCalledWith(-30);

      endDrag();
    });

    it('stops calling onResize after mouseup', () => {
      const onResize = vi.fn();
      const { resizer } = renderPanelResizer({ onResize });

      dragResizer(resizer, 100, 150);
      endDrag();
      onResize.mockClear();

      act(() => fireEvent.mouseMove(document, { clientX: 200 }));
      expect(onResize).not.toHaveBeenCalled();
    });
  });

  describe('mousedown', () => {
    it('prevents default to avoid text selection', () => {
      const { resizer } = renderPanelResizer();
      const event = new MouseEvent('mousedown', { clientX: 100, bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      fireEvent(resizer, event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
