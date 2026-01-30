'use client';

import React, { useState, useEffect } from 'react';

import { KclEditor } from '@/components/KclEditor';
import { CommandInput } from '@/components/CommandInput';
import { KclPreview3D } from '@/components/KclPreview3D';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { PanelResizer } from '@/components/PanelResizer';
import { wasmKclEngine } from '@/lib/kclEngine';
import { extractMeshes, buildArtifactGraphFromGeometry } from '@/lib/types/artifactGraph';
import { buildGeometrySpecFromKcl } from '@/lib/geometryRuntime';
import { formatKclError, formatNetworkError } from '@/lib/errorHandler';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export default function Page() {
  const [kclCode, setKclCode] = useState('');
  const [preview, setPreview] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [centerOpen, setCenterOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);

  const MIN_PANEL = 200;
  const MAX_PANEL = 800;
  const clamp = (v: number) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, v));

  const generatePreview = async (code: string) => {
    if (!code.trim()) {
      setPreview(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = await wasmKclEngine.parse(code);
      let artifactGraph = await wasmKclEngine.execute(program);
      const meshes = extractMeshes(artifactGraph);
      if (meshes.length === 0 && artifactGraph.artifacts.length === 0) {
        const geometrySpec = buildGeometrySpecFromKcl(code);
        if (geometrySpec.boxes.length > 0) {
          artifactGraph = buildArtifactGraphFromGeometry(geometrySpec);
        }
      }
      const finalMeshes = extractMeshes(artifactGraph);
      setPreview({
        artifacts: artifactGraph.artifacts,
        bbox: null,
        meshes: finalMeshes,
      });
    } catch (err) {
      setError(formatKclError(err));
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (kclCode) void generatePreview(kclCode);
    else setPreview(null);
  }, [kclCode]);

  const handleImageSubmit = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${BACKEND_BASE_URL}/convert`, { method: 'POST', body: formData });
      if (!response.ok) {
        setError(`Server error: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      if (typeof data.kcl_code === 'string') setKclCode(data.kcl_code);
      else setError('Invalid response from server: missing KCL code');
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandSubmit = async (command: string) => {
    if (!command.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/modify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kcl_code: kclCode, command }),
      });
      if (!response.ok) {
        setError(`Server error: ${response.status} ${response.statusText}`);
        return;
      }
      const data = await response.json();
      if (typeof data.kcl_code === 'string') setKclCode(data.kcl_code);
      else setError('Invalid response from server: missing KCL code');
    } catch (err) {
      setError(formatNetworkError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Top bar: loading + error strip */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
        {isLoading && (
          <span className="text-sm text-zinc-400" aria-live="polite">
            Loading…
          </span>
        )}
        <ErrorDisplay error={error} className="flex-1" />
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: code */}
        <div
          data-testid="panel-left"
          className={`flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200 ${
            leftOpen ? '' : 'w-0 min-w-0 overflow-hidden'
          }`}
          style={leftOpen ? { width: leftWidth, minWidth: leftWidth } : undefined}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-2 py-1">
            <span className="text-xs font-medium text-zinc-400">Files & Code</span>
            <button
              type="button"
              onClick={() => setLeftOpen((o) => !o)}
              aria-label="Toggle left panel"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
            >
              {leftOpen ? '◀' : '▶'}
            </button>
          </div>
          {leftOpen && (
            <div className="flex flex-1 flex-col overflow-auto p-2 min-h-0">
              {kclCode !== '' ? (
                <div className="flex-1 min-h-0">
                  <KclEditor value={kclCode} onChange={setKclCode} />
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Attach image in Chat to get KCL.</p>
              )}
            </div>
          )}
        </div>

        {leftOpen && (
            <PanelResizer
            data-testid="resizer-left"
            onDrag={(deltaX) => setLeftWidth((w) => clamp(w + deltaX))}
          />
        )}

        {/* Center panel: 3D preview */}
        <div
          data-testid="panel-center"
          className={`flex flex-1 flex-col bg-zinc-950 transition-[width] duration-200 ${
            centerOpen ? 'min-w-0' : 'w-0 min-w-0 overflow-hidden'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-2 py-1">
            <span className="text-xs font-medium text-zinc-400">Preview</span>
            <button
              type="button"
              onClick={() => setCenterOpen((o) => !o)}
              aria-label="Toggle center panel"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
            >
              {centerOpen ? '◀' : '▶'}
            </button>
          </div>
          {centerOpen && (
          <div className="relative flex-1 min-h-0" aria-label="KCL preview">
            {preview !== null ? (
              <>
                <div className="absolute inset-0">
                  <KclPreview3D preview={preview} />
                </div>
                <details className="absolute bottom-2 left-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs">
                  <summary className="cursor-pointer text-zinc-400">Raw JSON</summary>
                  <pre data-testid="kcl-preview-json" className="mt-1 max-h-32 overflow-auto text-zinc-500">
                    {JSON.stringify(preview)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                Load or edit KCL to see preview
              </div>
            )}
          </div>
          )}
        </div>

        {rightOpen && (
          <PanelResizer
            data-testid="resizer-right"
            onDrag={(deltaX) => setRightWidth((w) => clamp(w - deltaX))}
          />
        )}

        {/* Right panel: chat / command */}
        <div
          data-testid="panel-right"
          className="flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-[width] duration-200"
          style={{ width: rightWidth, minWidth: rightWidth }}
        >
          <div className="flex shrink-0 items-center border-b border-zinc-800 px-2 py-1">
            <span className="text-xs font-medium text-zinc-400">Chat</span>
          </div>
          <div className="flex flex-1 flex-col overflow-auto p-2 min-h-0">
            <CommandInput onSubmit={handleCommandSubmit} onAttachFile={handleImageSubmit} />
          </div>
        </div>
      </div>
    </main>
  );
}
