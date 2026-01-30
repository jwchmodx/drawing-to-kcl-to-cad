import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { CommandInput } from '../components/CommandInput';

describe('CommandInput', () => {
  it('calls onSubmit with entered command when submit button is clicked', () => {
    const handleSubmit = jest.fn();
    render(<CommandInput onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/modification command/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'add window' } });

    const button = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('add window');
  });

  it('does not call onSubmit when input is empty', () => {
    // Arrange: Component with empty input
    const handleSubmit = jest.fn();
    render(<CommandInput onSubmit={handleSubmit} />);

    // Act: Click submit without entering command
    const button = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(button);

    // Assert: Should not call onSubmit (component checks for trimmed value)
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when input is only whitespace', () => {
    // Arrange: Component
    const handleSubmit = jest.fn();
    render(<CommandInput onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/modification command/i) as HTMLInputElement;

    // Act: Enter only whitespace
    fireEvent.change(input, { target: { value: '   ' } });

    const button = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(button);

    // Assert: Should not call onSubmit
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('trims whitespace from command', () => {
    // Arrange: Component
    const handleSubmit = jest.fn();
    render(<CommandInput onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/modification command/i) as HTMLInputElement;

    // Act: Enter command with leading/trailing whitespace
    fireEvent.change(input, { target: { value: '  add window  ' } });

    const button = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(button);

    // Assert: Should call onSubmit with trimmed value
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('add window');
  });

  it('handles special characters in command', () => {
    // Arrange: Component
    const handleSubmit = jest.fn();
    render(<CommandInput onSubmit={handleSubmit} />);

    const input = screen.getByLabelText(/modification command/i) as HTMLInputElement;
    const specialCommand = 'add 日本語 window 🎨';

    // Act: Enter command with special characters
    fireEvent.change(input, { target: { value: specialCommand } });

    const button = screen.getByRole('button', { name: /apply command/i });
    fireEvent.click(button);

    // Assert: Should handle special characters
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(specialCommand);
  });

  it('shows attach file button when onAttachFile is provided', () => {
    const onAttachFile = jest.fn();
    render(<CommandInput onSubmit={jest.fn()} onAttachFile={onAttachFile} />);
    expect(screen.getByRole('button', { name: /attach file/i })).toBeInTheDocument();
  });

  it('calls onAttachFile when user selects a file via attach button', () => {
    const onAttachFile = jest.fn();
    render(<CommandInput onSubmit={jest.fn()} onAttachFile={onAttachFile} />);
    const fileInput = screen.getByTestId('attach-file-input') as HTMLInputElement;
    const file = new File(['image'], 'drawing.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onAttachFile).toHaveBeenCalledTimes(1);
    expect(onAttachFile).toHaveBeenCalledWith(file);
  });
});

