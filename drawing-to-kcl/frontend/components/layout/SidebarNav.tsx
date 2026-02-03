'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const ITEMS = [
  { id: 'home', icon: 'home' },
  { id: 'files', icon: 'folder_open' },
  { id: 'objects', icon: 'deployed_code' },
  { id: 'layers', icon: 'layers' },
  { id: 'materials', icon: 'palette' },
] as const;

const BOTTOM_ITEMS = [
  { id: 'extensions', icon: 'extension' },
  { id: 'settings', icon: 'tune' },
] as const;

export function SidebarNav() {
  const [activeItem, setActiveItem] = useState('files');

  return (
    <aside className="w-12 flex flex-col items-center py-3 gap-1 bg-surface border-r border-white/5 shrink-0">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveItem(item.id)}
          className={`p-2.5 rounded-lg transition-all ${
            activeItem === item.id
              ? 'bg-cyan/10 text-cyan'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
        >
          <Icon name={item.icon} className="text-xl" />
        </button>
      ))}
      <div className="flex-1" />
      {BOTTOM_ITEMS.map((item) => (
        <button
          key={item.id}
          className="p-2.5 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
        >
          <Icon name={item.icon} className="text-xl" />
        </button>
      ))}
    </aside>
  );
}
