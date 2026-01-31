const TOOL_BUTTONS_LEFT: Array<{ icon: string; active?: boolean }> = [
  { icon: 'near_me', active: true },
  { icon: 'move', active: false },
  { icon: 'rotate_right', active: false },
  { icon: 'open_in_full', active: false },
];
const TOOL_BUTTONS_RIGHT = [
  { icon: 'grid_on' },
  { icon: 'nest_cam_magnet_mount' },
] as const;

const btnClass = 'p-2 rounded-lg';
const btnActiveClass = 'text-white bg-white/10';
const btnInactiveClass = 'text-[#9cabba] hover:text-white';

export function ViewportToolbar() {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background-dark/80 backdrop-blur-md border border-white/10 rounded-xl p-1 z-10 shadow-2xl">
      {TOOL_BUTTONS_LEFT.map(({ icon, active = false }) => (
        <button
          key={icon}
          className={active ? `${btnClass} ${btnActiveClass}` : `${btnClass} ${btnInactiveClass}`}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </button>
      ))}
      <div className="w-px h-6 bg-white/10 mx-1" />
      {TOOL_BUTTONS_RIGHT.map(({ icon }) => (
        <button key={icon} className={`${btnClass} ${btnInactiveClass}`} type="button">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </button>
      ))}
    </div>
  );
}
