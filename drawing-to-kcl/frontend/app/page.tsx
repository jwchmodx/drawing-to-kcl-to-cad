'use client';

import React, { useState, useEffect } from 'react';

import { ImageUpload } from '@/components/ImageUpload';
import { KclEditor } from '@/components/KclEditor';
import { CommandInput } from '@/components/CommandInput';
import { KclPreview3D } from '@/components/KclPreview3D';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { wasmKclEngine } from '@/lib/kclEngine';
import { extractMeshes, buildArtifactGraphFromGeometry } from '@/lib/types/artifactGraph';
import { buildGeometrySpecFromKcl } from '@/lib/geometryRuntime';
import { formatKclError, formatWasmError, formatNetworkError } from '@/lib/errorHandler';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

export default function Page() {
  const [kclCode, setKclCode] = useState('');
  const [preview, setPreview] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate preview from KCL code using WASM engine
  const generatePreview = async (code: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/24a6f8bd-2395-4b39-929f-401c94dc986c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:22',message:'generatePreview called',data:{codeLength:code.length,codeTrimmed:code.trim().length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (!code.trim()) {
      setPreview(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/24a6f8bd-2395-4b39-929f-401c94dc986c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:33',message:'Before wasmKclEngine.parse',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const program = await wasmKclEngine.parse(code);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/24a6f8bd-2395-4b39-929f-401c94dc986c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:34',message:'After wasmKclEngine.parse',data:{hasProgram:program !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      let artifactGraph = await wasmKclEngine.execute(program);
      
      // Fallback: If WASM engine returns empty graph, use TypeScript geometry runtime
      const meshes = extractMeshes(artifactGraph);
      if (meshes.length === 0 && artifactGraph.artifacts.length === 0) {
        // Try to generate geometry from KCL code using TypeScript runtime
        const geometrySpec = buildGeometrySpecFromKcl(code);
        if (geometrySpec.boxes.length > 0) {
          artifactGraph = buildArtifactGraphFromGeometry(geometrySpec);
        }
      }
      
      // Convert artifactGraph to preview format expected by KclPreview3D.
      // We extract meshes from the graph and expose a simple preview object.
      const finalMeshes = extractMeshes(artifactGraph);
      setPreview({
        artifacts: artifactGraph.artifacts,
        bbox: null,
        meshes: finalMeshes,
      });
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/24a6f8bd-2395-4b39-929f-401c94dc986c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:43',message:'generatePreview error caught',data:{errorType:err instanceof Error ? err.constructor.name : typeof err,errorMessage:err instanceof Error ? err.message : String(err),errorStack:err instanceof Error ? err.stack?.substring(0,500) : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      const formattedError = formatKclError(err);
      setError(formattedError);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview when KCL code changes
  useEffect(() => {
    if (kclCode) {
      void generatePreview(kclCode);
    } else {
      setPreview(null);
    }
  }, [kclCode]);

  const handleImageSubmit = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_BASE_URL}/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        setError(`Server error: ${response.status} ${response.statusText}`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (typeof data.kcl_code === 'string') {
        setKclCode(data.kcl_code);
        // Preview will be generated automatically by useEffect
      } else {
        setError('Invalid response from server: missing KCL code');
      }
      // Backend preview field is ignored - we generate it in frontend
    } catch (err) {
      const formattedError = formatNetworkError(err);
      setError(formattedError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandSubmit = async (command: string) => {
    setIsLoading(true);
    setError(null);

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
        setError(`Server error: ${response.status} ${response.statusText}`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (typeof data.kcl_code === 'string') {
        setKclCode(data.kcl_code);
        // Preview will be generated automatically by useEffect
      } else {
        setError('Invalid response from server: missing KCL code');
      }
      // Backend preview field is ignored - we generate it in frontend
    } catch (err) {
      const formattedError = formatNetworkError(err);
      setError(formattedError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <h1>Drawing to KCL</h1>
      <ImageUpload onSubmit={handleImageSubmit} />
      {isLoading && <div>Loading...</div>}
      <ErrorDisplay error={error} />
      {kclCode !== '' && <KclEditor value={kclCode} onChange={setKclCode} />}
      <CommandInput onSubmit={handleCommandSubmit} />
      {preview !== null && (
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

