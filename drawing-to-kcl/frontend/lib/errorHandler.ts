/**
 * User-facing error formatting for KCL, WASM, and network errors.
 */

export function formatKclError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('KCL')) return msg;
  return `KCL: ${msg}`;
}

export function formatWasmError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('wasm')) return msg;
  if (lower.includes('network')) return `WASM: ${msg}`;
  return `WASM: ${msg}`;
}

export function formatNetworkError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (err instanceof Error && err.name === 'TypeError') {
    return 'Network error: unable to connect. Check CORS and backend URL.';
  }
  if (lower.includes('failed to fetch')) {
    return 'Network error: unable to connect. Check CORS and backend URL.';
  }
  if (lower.includes('network') || lower.includes('unable to connect')) return msg;
  return `Network: ${msg}`;
}
