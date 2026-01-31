const MENU_ITEMS = ['File', 'Edit', 'Modify', 'Render', 'Window'] as const;
const MODE_OPTIONS = ['Design', 'Simulate', 'Animate'] as const;

const navLinkClass =
  'text-[#9cabba] hover:text-white text-xs font-medium transition-colors';
const modeButtonClass = 'px-3 py-1 text-xs font-bold';
const iconButtonClass =
  'flex items-center justify-center rounded-lg h-9 w-9 bg-white/5 text-[#9cabba] hover:text-white border border-white/10';

export function Header() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 bg-background-light dark:bg-background-dark px-4 py-2 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                clipRule="evenodd"
                d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-white text-md font-bold leading-tight tracking-tight uppercase">
            Architect
          </h2>
        </div>
        <nav className="flex items-center gap-6 border-l border-white/10 pl-6">
          {MENU_ITEMS.map((item) => (
            <a key={item} className={navLinkClass} href="#">
              {item}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
          {MODE_OPTIONS.map((mode, i) => (
            <button
              key={mode}
              className={
                i === 0
                  ? `${modeButtonClass} text-white bg-primary rounded-md`
                  : `${modeButtonClass} text-[#9cabba] hover:text-white`
              }
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-white/10" />
        <button className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-xs font-bold gap-2">
          <span className="material-symbols-outlined text-[18px]">publish</span>
          <span>Export Project</span>
        </button>
        <div className="flex gap-2">
          <button className={iconButtonClass} type="button">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button className={iconButtonClass} type="button">
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}
