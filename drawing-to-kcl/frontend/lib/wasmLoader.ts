/**
 * Singleton loader for KCL WASM module. Fetches /kcl.wasm then uses @kcl-lang/wasm-lib load().
 */

import { load } from '@kcl-lang/wasm-lib';

let instance: unknown = null;

export function resetWasmInstance(): void {
  instance = null;
}

export async function loadWasmInstance(): Promise<unknown> {
  if (instance !== null) return instance;
  const response = await fetch('/kcl.wasm');
  if (!response.ok) throw new Error('Failed to fetch WASM');
  const arrayBuffer = await response.arrayBuffer();
  instance = await (load as (buffer: ArrayBuffer) => Promise<unknown>)(arrayBuffer);
  return instance;
}
