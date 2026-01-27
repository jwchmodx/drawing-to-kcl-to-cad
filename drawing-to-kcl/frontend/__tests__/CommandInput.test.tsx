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
});

