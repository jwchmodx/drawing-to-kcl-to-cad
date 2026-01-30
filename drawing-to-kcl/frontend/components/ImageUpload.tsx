'use client';

import React, { useState } from 'react';

export interface ImageUploadProps {
  onSubmit: (file: File) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onSubmit }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleClick = () => {
    if (file) {
      onSubmit(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="drawing-upload" className="text-xs font-medium text-zinc-400">
        Upload drawing image
      </label>
      <input
        id="drawing-upload"
        type="file"
        accept="image/*"
        aria-label="Upload drawing image"
        onChange={handleChange}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-zinc-600 file:px-2 file:py-1 file:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={!file}
        className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        Convert to KCL
      </button>
    </div>
  );
};

