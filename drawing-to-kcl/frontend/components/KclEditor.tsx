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
    <div className="flex flex-col gap-1">
      <label htmlFor="kcl-editor" className="text-xs font-medium text-zinc-400">
        KCL editor
      </label>
      <textarea
        id="kcl-editor"
        aria-label="KCL editor"
        value={value}
        onChange={handleChange}
        rows={10}
        className="w-full resize-y rounded border border-zinc-700 bg-zinc-800 p-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        placeholder="// KCL code or load from image"
      />
    </div>
  );
};

