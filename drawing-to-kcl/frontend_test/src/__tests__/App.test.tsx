import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, within } from './test-utils';
import App from '../App';

vi.mock('../components/KclPreview3D', () => ({
  KclPreview3D: () => <div data-testid="kcl-preview-3d-mock">Preview</div>,
}));

describe('App', () => {
  let container: HTMLElement;

  beforeEach(() => {
    const result = render(<App />);
    container = result.container;
  });

  describe('header', () => {
    it('renders Architect title', () => {
      expect(within(container).getByText(/Architect/)).toBeInTheDocument();
    });

    it('renders menu items File, Edit, Modify, Render, Window', () => {
      expect(within(container).getByText('File')).toBeInTheDocument();
      expect(within(container).getByText('Edit')).toBeInTheDocument();
      expect(within(container).getByText('Modify')).toBeInTheDocument();
      expect(within(container).getByText('Render')).toBeInTheDocument();
      expect(within(container).getByText('Window')).toBeInTheDocument();
    });
  });

  describe('layout panels', () => {
    it('renders Project Explorer section', () => {
      expect(within(container).getByText('Project Explorer')).toBeInTheDocument();
    });

    it('renders AI Assistant section', () => {
      expect(within(container).getByText('AI Assistant')).toBeInTheDocument();
    });

    it('renders KclPreview3D in main viewport', () => {
      expect(within(container).getByTestId('kcl-preview-3d-mock')).toBeInTheDocument();
    });

    it('renders at least one panel resizer', () => {
      const resizers = within(container).getAllByRole('separator', { hidden: true });
      expect(resizers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('mode toggle', () => {
    it('renders Design, Simulate, Animate options', () => {
      expect(within(container).getByText('Design')).toBeInTheDocument();
      expect(within(container).getByText('Simulate')).toBeInTheDocument();
      expect(within(container).getByText('Animate')).toBeInTheDocument();
    });
  });

  describe('AI input', () => {
    it('renders placeholder for AI commands', () => {
      expect(within(container).getByPlaceholderText(/Ask AI to refine, texture, or export/)).toBeInTheDocument();
    });
  });
});
