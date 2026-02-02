/**
 * KCL engine: dummy (sync) and WASM (async). Used for parse, execute, recast.
 */

import { loadWasmInstance } from '@/lib/wasmLoader';
import { invokeKCLRun } from '@kcl-lang/wasm-lib';

export interface Program {
  source: string;
}

/** Sync dummy engine for tests: parse wraps source, execute returns {}, recast returns source. */
export const dummyKclEngine = {
  parse(source: string): Program {
    return { source };
  },
  execute(_program: Program): Record<string, unknown> {
    return {};
  },
  recast(program: Program): string {
    return program.source;
  },
};

/** Async WASM engine: loadWasmInstance + invokeKCLRun. */
export const wasmKclEngine = {
  async parse(source: string): Promise<Program> {
    const inst = await loadWasmInstance();
    const out = invokeKCLRun(inst as Parameters<typeof invokeKCLRun>[0], { filename: 'parse.k', source });
    if (typeof out === 'string' && out.toLowerCase().startsWith('error:')) {
      throw new Error('KCL parse error');
    }
    return { source };
  },
  async execute(program: Program): Promise<{ artifacts: string[]; nodes: Record<string, { id: string; type: string; geometry: { vertices: number[][]; indices: number[] } | null }> }> {
    const inst = await loadWasmInstance();
    const out = invokeKCLRun(inst as Parameters<typeof invokeKCLRun>[0], { filename: 'execute.k', source: program.source });
    if (typeof out === 'string' && out.toLowerCase().startsWith('error:')) {
      throw new Error('KCL execution error');
    }
    if (typeof out === 'string') {
      if (!out.trim()) return { artifacts: [], nodes: {} };
      try {
        return JSON.parse(out) as { artifacts: string[]; nodes: Record<string, { id: string; type: string; geometry: { vertices: number[][]; indices: number[] } | null }> };
      } catch {
        return { artifacts: [], nodes: {} };
      }
    }
    if (typeof out === 'object' && out !== null && 'artifacts' in out && 'nodes' in out) {
      return out as { artifacts: string[]; nodes: Record<string, { id: string; type: string; geometry: { vertices: number[][]; indices: number[] } | null }> };
    }
    return { artifacts: [], nodes: {} };
  },
  async recast(program: Program): Promise<string> {
    const inst = await loadWasmInstance();
    const out = invokeKCLRun(inst as Parameters<typeof invokeKCLRun>[0], { filename: 'recast.k', source: program.source });
    if (typeof out === 'string' && out.toLowerCase().startsWith('error:')) {
      throw new Error('KCL recast error');
    }
    return program.source;
  },
};
