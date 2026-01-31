interface AIAssistantProps {
  width: number;
}

export function AIAssistant({ width }: AIAssistantProps) {
  return (
    <aside
      className="bg-background-light dark:bg-[#151d26] flex flex-col shrink-0 flex-none"
      style={{ width }}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
          <span className="text-sm font-bold text-white">AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-white/5 rounded" type="button">
            <span className="material-symbols-outlined text-[18px] text-[#9cabba]">chat</span>
          </button>
          <button className="p-1 hover:bg-white/5 rounded" type="button">
            <span className="material-symbols-outlined text-[18px] text-[#9cabba]">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-2 items-end">
          <div className="bg-primary rounded-xl rounded-tr-none px-3 py-2 text-sm max-w-[90%]">
            Generate a 3D model based on this sketch. Focus on ergonomic curves.
          </div>
          <div className="w-32 h-32 rounded-lg border border-white/10 overflow-hidden relative group">
            <img
              alt="Pencil sketch of an ergonomic modern chair"
              className="w-full h-full object-cover grayscale opacity-60"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXdwBHXuTiymdvpijQjUmtMDhctpap0rmUaXpclFnjE_4d_7u0SEVPwm4x11qRpV2GG9B6d9ol80QOgpB6jdFoxXdjp254nOu71SUAxo_8bhuCI1LxXC0PP6gGxrhMykxrqkvaGBTd84BMWO4LWrLzhezM-MQim9eFcH58RaT16x96N0GJbmiPXbwaMtDaZoMuLlpNrg7vOgS7xmkCvOQvjbgRTIUIQYIVv_Z5wOsIPMMVJfQvUt1LSNzv6rxInwtcq96OCx07xH5G"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="material-symbols-outlined text-white text-[24px]">visibility</span>
            </div>
          </div>
          <span className="text-[10px] text-[#9cabba]">Just now</span>
        </div>

        <div className="flex flex-col gap-2 items-start">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
            </div>
            <span className="text-[11px] font-bold text-[#9cabba] uppercase tracking-wider">
              Assistant
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-none p-3 text-sm flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="size-4 animate-pulse bg-primary rounded-full" />
              <span className="font-medium text-primary">Generating 3D mesh from image...</span>
            </div>
            <p className="text-[#9cabba]">
              Analyzing topology and volumetric data. Estimating vertex density based on the curves
              identified in your sketch.
            </p>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="bg-primary h-full shadow-[0_0_10px_rgba(13,127,242,0.8)]"
                style={{ width: '65%' }}
              />
            </div>
          </div>
        </div>

        <div className="text-center">
          <span className="text-[10px] text-[#9cabba] bg-white/5 px-2 py-0.5 rounded-full">
            New Mesh detected: &apos;Chair_Prototype_v1&apos;
          </span>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="relative group">
          <textarea
            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-sm text-white placeholder:text-[#4d5e6d] resize-none h-24 transition-all"
            placeholder="Ask AI to refine, texture, or export..."
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button className="p-1.5 text-[#9cabba] hover:text-white" type="button">
              <span className="material-symbols-outlined text-[20px]">image</span>
            </button>
            <button className="p-1.5 text-[#9cabba] hover:text-white" type="button">
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </button>
            <button
              className="bg-primary hover:bg-primary/80 text-white p-1.5 rounded-lg transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_5px_#0d7ff2]" />
            <span className="text-[10px] text-[#9cabba]">Model: Vision-4-3D</span>
          </div>
          <span className="text-[10px] text-[#9cabba]">⌘ + K for Command Palette</span>
        </div>
      </div>
    </aside>
  );
}
