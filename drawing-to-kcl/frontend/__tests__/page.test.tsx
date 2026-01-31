import React from 'react';
import { render, screen } from '@testing-library/react';

import Page from '../app/page';

describe('Page (AI 3D Modeling Workspace UI)', () => {
  it('renders header with Architect AI and menu', () => {
    render(<Page />);
    expect(screen.getByText('Architect AI')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Export Project')).toBeInTheDocument();
  });

  it('renders mode toggle (Design, Simulate, Animate)', () => {
    render(<Page />);
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Simulate')).toBeInTheDocument();
    expect(screen.getByText('Animate')).toBeInTheDocument();
  });

  it('renders Project Explorer sidebar', () => {
    render(<Page />);
    expect(screen.getByText('Project Explorer')).toBeInTheDocument();
    expect(screen.getByText('Chair_Prototype_v1')).toBeInTheDocument();
  });

  it('renders viewport tabs', () => {
    render(<Page />);
    expect(screen.getByText('Viewport')).toBeInTheDocument();
    expect(screen.getByText('Wireframe')).toBeInTheDocument();
    expect(screen.getByText('Node Editor')).toBeInTheDocument();
    expect(screen.getByText('UV Map')).toBeInTheDocument();
  });

  it('renders AI Assistant sidebar with input', () => {
    render(<Page />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask AI to refine, texture, or export/)).toBeInTheDocument();
  });

  it('does not use h-screen wrapper at page root (body is the flex container)', () => {
    const { container } = render(<Page />);
    const pageRoot = container.firstElementChild;
    expect(pageRoot).not.toHaveClass('h-screen');
  });

  it('has content area with flex-1 overflow-hidden', () => {
    const { container } = render(<Page />);
    const contentArea = container.querySelector('.flex-1.overflow-hidden');
    expect(contentArea).toBeInTheDocument();
  });

});
