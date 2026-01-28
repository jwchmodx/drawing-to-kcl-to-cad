import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { ImageUpload } from '../components/ImageUpload';

describe('ImageUpload', () => {
  it('calls onSubmit with selected file when submit button is clicked', () => {
    const handleSubmit = jest.fn();
    render(<ImageUpload onSubmit={handleSubmit} />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'drawing.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const button = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(file);
  });

  it('does not call onSubmit when no file is selected', () => {
    // Arrange: Component without file selected
    const handleSubmit = jest.fn();
    render(<ImageUpload onSubmit={handleSubmit} />);

    // Act: Click submit without selecting file
    const button = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(button);

    // Assert: Should not call onSubmit
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('handles file selection cancellation', () => {
    // Arrange: Component
    const handleSubmit = jest.fn();
    render(<ImageUpload onSubmit={handleSubmit} />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;

    // Act: Simulate file selection cancellation (null files)
    fireEvent.change(fileInput, { target: { files: null } });

    const button = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(button);

    // Assert: Should not call onSubmit
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('handles invalid file type', () => {
    // Arrange: Non-image file
    const handleSubmit = jest.fn();
    render(<ImageUpload onSubmit={handleSubmit} />);

    const fileInput = screen.getByLabelText(/upload drawing image/i) as HTMLInputElement;
    const file = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });

    // Act: Select non-image file
    fireEvent.change(fileInput, { target: { files: [file] } });

    const button = screen.getByRole('button', { name: /convert to kcl/i });
    fireEvent.click(button);

    // Assert: Should still call onSubmit (component doesn't validate file type)
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(file);
  });
});

