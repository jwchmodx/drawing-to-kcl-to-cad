const SIDEBAR_ITEMS: Array<{ icon: string; label: string; active?: boolean }> = [
  { icon: 'home', label: 'Home', active: true },
  { icon: 'folder_open', label: 'Project Explorer' },
  { icon: 'deployed_code', label: '3D Assets' },
  { icon: 'layers', label: 'Layers' },
];

const FOOTER_ITEMS = [
  { icon: 'shopping_cart', label: 'Marketplace' },
  { icon: 'settings', label: 'Settings' },
] as const;

const btnBase =
  'p-2 hover:bg-white/5 rounded-lg transition-all text-[#9cabba]';
const btnActive = 'text-primary';

export function Sidebar() {
  return (
    <aside className="w-[60px] shrink-0 flex flex-col items-center py-4 gap-6 border-r border-white/10 bg-background-light dark:bg-background-dark">
      {SIDEBAR_ITEMS.map(({ icon, label, active = false }) => (
        <button
          key={label}
          className={active ? `${btnBase} ${btnActive}` : btnBase}
          title={label}
          type="button"
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </button>
      ))}
      <div className="mt-auto flex flex-col gap-4 pb-4">
        {FOOTER_ITEMS.map(({ icon, label }) => (
          <button key={label} className={btnBase} title={label} type="button">
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
