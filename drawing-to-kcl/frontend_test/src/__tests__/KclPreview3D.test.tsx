import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, within } from './test-utils';
import { KclPreview3D } from '../components/KclPreview3D';
import { validPreview, emptyPreview, invalidPreview } from './fixtures';

describe('KclPreview3D', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('container rendering', () => {
    it('renders div with data-testid when preview has valid mesh', () => {
      const { container } = render(<KclPreview3D preview={validPreview} />);
      const el = within(container).getByTestId('kcl-preview-3d');
      expect(el).toBeInTheDocument();
      expect(el.tagName).toBe('DIV');
    });

    it('renders without throwing for valid mesh data', () => {
      const { container } = render(<KclPreview3D preview={validPreview} />);
      expect(within(container).getByTestId('kcl-preview-3d')).toBeInTheDocument();
    });
  });

  describe('empty or null preview', () => {
    it('renders empty container when preview is null', () => {
      const { container } = render(<KclPreview3D preview={null} />);
      const el = within(container).getByTestId('kcl-preview-3d');
      expect(el).toBeInTheDocument();
      expect(el.children.length).toBe(0);
    });

    it('renders empty container when preview is undefined', () => {
      const { container } = render(<KclPreview3D preview={undefined} />);
      const el = within(container).getByTestId('kcl-preview-3d');
      expect(el).toBeInTheDocument();
      expect(el.children.length).toBe(0);
    });

    it('renders empty container when meshes array is empty', () => {
      const { container } = render(<KclPreview3D preview={emptyPreview} />);
      const el = within(container).getByTestId('kcl-preview-3d');
      expect(el).toBeInTheDocument();
      expect(el.children.length).toBe(0);
    });
  });

  describe('invalid preview structure', () => {
    it('renders container when preview has no meshes property', () => {
      const { container } = render(<KclPreview3D preview={invalidPreview} />);
      expect(within(container).getByTestId('kcl-preview-3d')).toBeInTheDocument();
    });
  });
});
