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
    <div>
      <label htmlFor="drawing-upload">Upload drawing image</label>
      <input
        id="drawing-upload"
        type="file"
        accept="image/*"
        aria-label="Upload drawing image"
        onChange={handleChange}
      />
      <button type="button" onClick={handleClick}>
        Convert to KCL
      </button>
    </div>
  );
};

