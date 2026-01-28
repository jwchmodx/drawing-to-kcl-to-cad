import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { KclEditor } from '../components/KclEditor';

describe('KclEditor', () => {
  it('renders provided code and calls onChange when edited', () => {
    const handleChange = jest.fn();
    render(<KclEditor value="initial code" onChange={handleChange} />);

    const textarea = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('initial code');

    fireEvent.change(textarea, { target: { value: 'updated code' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('updated code');
  });

  it('handles empty value', () => {
    // Arrange: Empty value
    const handleChange = jest.fn();
    render(<KclEditor value="" onChange={handleChange} />);

    // Assert: Should render empty textarea
    const textarea = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('handles very long code', () => {
    // Arrange: Very long code (but not too long to avoid performance issues)
    // 100 repetitions of 'object();\n' = 10 characters * 100 = 1000 characters exactly
    const longCode = 'object();\n'.repeat(100);
    const handleChange = jest.fn();
    render(<KclEditor value={longCode} onChange={handleChange} />);

    // Assert: Should render long code
    const textarea = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe(longCode);
    // 100 * 10 = 1000 characters exactly, so use >= instead of >
    expect(textarea.value.length).toBeGreaterThanOrEqual(1000);
  });

  it('handles special characters', () => {
    // Arrange: Code with special characters
    const specialCode = '// 日本語\n// émojis: 🎨\nobject();';
    const handleChange = jest.fn();
    render(<KclEditor value={specialCode} onChange={handleChange} />);

    // Assert: Should preserve special characters
    const textarea = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe(specialCode);
    expect(textarea.value).toContain('日本語');
    expect(textarea.value).toContain('🎨');
  });

  it('handles multiple onChange calls', () => {
    // Arrange: Component
    const handleChange = jest.fn();
    render(<KclEditor value="initial" onChange={handleChange} />);

    const textarea = screen.getByLabelText(/kcl editor/i) as HTMLTextAreaElement;

    // Act: Change multiple times
    fireEvent.change(textarea, { target: { value: 'first' } });
    fireEvent.change(textarea, { target: { value: 'second' } });
    fireEvent.change(textarea, { target: { value: 'third' } });

    // Assert: Should call onChange for each change
    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(handleChange).toHaveBeenNthCalledWith(1, 'first');
    expect(handleChange).toHaveBeenNthCalledWith(2, 'second');
    expect(handleChange).toHaveBeenNthCalledWith(3, 'third');
  });
});

