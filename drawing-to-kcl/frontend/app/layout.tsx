'use client';

import React from 'react';
import './globals.css';

const criticalStyles = `
  html, body { background-color: #09090b; color: #fafafa; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; }
  main { display: flex; flex-direction: column; height: 100vh; background-color: #09090b; color: #fafafa; }
  main > div:first-of-type { flex-shrink: 0; border-bottom: 1px solid #27272a; padding: 0.5rem 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
  main > div:last-of-type { display: flex; flex: 1; min-height: 0; }
  [data-testid="panel-left"], [data-testid="panel-right"] { background-color: #18181b; border-color: #27272a; flex-shrink: 0; display: flex; flex-direction: column; }
  [data-testid="panel-left"] { border-right: 1px solid #27272a; min-width: 16rem; }
  [data-testid="panel-right"] { border-left: 1px solid #27272a; min-width: 16rem; }
  [data-testid="panel-center"] { flex: 1; min-width: 0; display: flex; flex-direction: column; background-color: #09090b; }
  main input, main textarea, main button { background-color: #27272a !important; color: #fafafa !important; border: 1px solid #3f3f46 !important; border-radius: 0.25rem; padding: 0.375rem 0.5rem; }
  main input::placeholder, main textarea::placeholder { color: #71717a !important; }
  main input[type="file"] { color: #d4d4d8; }
  main input[type="file"]::file-selector-button { background-color: #52525b; color: #fafafa; border: 0; padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-right: 0.5rem; }
  main button:not(:disabled):hover { background-color: #3f3f46 !important; }
  main button:disabled { opacity: 0.5; cursor: not-allowed; }
  main label { color: #a1a1aa; font-size: 0.75rem; font-weight: 500; }
  [data-testid="panel-left"] > div:first-of-type, [data-testid="panel-center"] > div:first-of-type, [data-testid="panel-right"] > div:first-of-type { border-bottom: 1px solid #27272a; padding: 0.25rem 0.5rem; display: flex; align-items: center; justify-content: space-between; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
        {children}
      </body>
    </html>
  );
}

