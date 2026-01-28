'use client';

import React, { useState } from 'react';

import { ImageUpload } from '@/components/ImageUpload';
import { KclEditor } from '@/components/KclEditor';
import { CommandInput } from '@/components/CommandInput';
import { KclPreview3D } from '@/components/KclPreview3D';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export default function Page() {
  const [kclCode, setKclCode] = useState('');
  const [preview, setPreview] = useState<unknown | null>(null);

  const handleImageSubmit = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_BASE_URL}/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (typeof data.kcl_code === 'string') {
        setKclCode(data.kcl_code);
      }
      if (data.preview !== undefined) {
        setPreview(data.preview);
      }
    } catch (error) {
      // Handle network errors gracefully
      console.error('Failed to convert image:', error);
    }
  };

  const handleCommandSubmit = async (command: string) => {
    try {
      const payload = {
        kcl_code: kclCode,
        command
      };

      const response = await fetch(`${BACKEND_BASE_URL}/modify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (typeof data.kcl_code === 'string') {
        setKclCode(data.kcl_code);
      }
      if (data.preview !== undefined) {
        setPreview(data.preview);
      }
    } catch (error) {
      // Handle network errors gracefully
      console.error('Failed to modify KCL:', error);
    }
  };

  return (
    <main>
      <h1>Drawing to KCL</h1>
      <ImageUpload onSubmit={handleImageSubmit} />
      {kclCode !== '' && <KclEditor value={kclCode} onChange={setKclCode} />}
      <CommandInput onSubmit={handleCommandSubmit} />
      {preview && (
        <section aria-label="KCL preview">
          <h2>Preview</h2>
          <KclPreview3D preview={preview} />
          <details>
            <summary>Raw JSON</summary>
            <pre data-testid="kcl-preview-json">{JSON.stringify(preview)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}

