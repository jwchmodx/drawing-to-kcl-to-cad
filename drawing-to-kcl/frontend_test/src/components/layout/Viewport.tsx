import { KclPreview3D } from '../KclPreview3D';
import { ViewportToolbar } from './ViewportToolbar';

interface ViewportProps {
  preview: unknown;
}

export function Viewport({ preview }: ViewportProps) {
  return (
    <main className="flex-1 min-w-0 relative flex flex-col bg-[#0b0f14]">
      <ViewportToolbar />
      <div className="flex-1 relative overflow-hidden viewport-grid flex flex-col min-h-0">
        <div className="flex-1 min-h-0 w-full">
          <KclPreview3D preview={preview} />
        </div>
      </div>
    </main>
  );
}
