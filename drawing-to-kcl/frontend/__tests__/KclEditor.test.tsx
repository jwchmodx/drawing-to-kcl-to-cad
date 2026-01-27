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
});

