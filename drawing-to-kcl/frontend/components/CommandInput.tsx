'use client';

import React, { useRef, useState } from 'react';

export interface CommandInputProps {
  onSubmit: (command: string) => void;
  onAttachFile?: (file: File) => void;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSubmit, onAttachFile }) => {
  const [command, setCommand] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(event.target.value);
  };

  const handleClick = () => {
    const trimmed = command.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAttachFile) {
      onAttachFile(file);
    }
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="command-input" className="text-xs font-medium text-zinc-400">
        Modification command
      </label>
      <div className="flex gap-1">
        {onAttachFile && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Attach file"
              tabIndex={-1}
              className="sr-only"
              data-testid="attach-file-input"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleAttachClick}
              aria-label="Attach file"
              data-testid="attach-file-button"
              className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              title="Attach image"
            >
              +
            </button>
          </>
        )}
        <input
          id="command-input"
          type="text"
          aria-label="Modification command"
          value={command}
          onChange={handleChange}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="e.g. add window"
        />
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        Apply command
      </button>
    </div>
  );
};

