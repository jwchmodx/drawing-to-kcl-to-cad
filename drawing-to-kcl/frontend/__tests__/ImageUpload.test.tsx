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
});

