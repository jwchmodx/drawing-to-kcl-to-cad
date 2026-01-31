interface ProjectExplorerProps {
  width: number;
}

const treeItemClass = 'px-4 py-1 flex items-center gap-2 text-[#9cabba] hover:bg-white/5 cursor-pointer';
const treeItemActiveClass = 'text-white bg-primary/20 border-r-2 border-primary';

export function ProjectExplorer({ width }: ProjectExplorerProps) {
  return (
    <aside
      className="bg-background-light dark:bg-[#151d26] flex flex-col hidden lg:flex shrink-0 flex-none"
      style={{ width }}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Project Explorer
        </span>
        <span className="material-symbols-outlined text-xs text-[#9cabba]">unfold_more</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <div className={treeItemClass}>
          <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
          <span className="text-sm font-medium">Chair_Prototype_v1</span>
        </div>
        <div className="ml-4">
          <div className={treeItemClass}>
            <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
            <span className="material-symbols-outlined text-[16px]">polyline</span>
            <span className="text-sm font-medium">Meshes</span>
          </div>
          <div className="ml-4">
            <div className={`${treeItemClass} ${treeItemActiveClass}`}>
              <span className="material-symbols-outlined text-[16px] text-primary">
                view_in_ar
              </span>
              <span className="text-sm font-medium">Main_Seat_Base</span>
            </div>
            <div className={treeItemClass}>
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span className="text-sm font-medium">Back_Support</span>
            </div>
          </div>
          <div className={treeItemClass}>
            <span className="material-symbols-outlined text-[16px]">arrow_right</span>
            <span className="material-symbols-outlined text-[16px]">texture</span>
            <span className="text-sm font-medium">Materials</span>
          </div>
          <div className={treeItemClass}>
            <span className="material-symbols-outlined text-[16px]">arrow_right</span>
            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
            <span className="text-sm font-medium">Lighting_Setup</span>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#9cabba] uppercase">VRAM Usage</span>
          <span className="text-[10px] text-primary font-bold">2.4 / 8 GB</span>
        </div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="bg-primary h-full" style={{ width: '30%' }} />
        </div>
      </div>
    </aside>
  );
}
