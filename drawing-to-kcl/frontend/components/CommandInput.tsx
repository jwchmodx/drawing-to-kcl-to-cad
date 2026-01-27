'use client';

import React, { useState } from 'react';

export interface CommandInputProps {
  onSubmit: (command: string) => void;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSubmit }) => {
  const [command, setCommand] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(event.target.value);
  };

  const handleClick = () => {
    if (command.trim()) {
      onSubmit(command);
    }
  };

  return (
    <div>
      <label htmlFor="command-input">Modification command</label>
      <input
        id="command-input"
        type="text"
        aria-label="Modification command"
        value={command}
        onChange={handleChange}
      />
      <button type="button" onClick={handleClick}>
        Apply command
      </button>
    </div>
  );
};

