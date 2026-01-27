'use client';

import React from 'react';

export interface KclEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const KclEditor: React.FC<KclEditorProps> = ({ value, onChange }) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div>
      <label htmlFor="kcl-editor">KCL editor</label>
      <textarea
        id="kcl-editor"
        aria-label="KCL editor"
        value={value}
        onChange={handleChange}
        rows={10}
        cols={60}
      />
    </div>
  );
};

