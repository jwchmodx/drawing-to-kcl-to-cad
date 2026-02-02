'use client';

import React from 'react';
import { 
  DEFAULT_SHORTCUTS, 
  getShortcutsByCategory, 
  formatShortcut,
  CATEGORY_NAMES,
  Shortcut 
} from '@/lib/shortcutManager';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: Shortcut[];
}

/**
 * Keyboard shortcuts help overlay
 */
export function ShortcutHelp({ isOpen, onClose, shortcuts = DEFAULT_SHORTCUTS }: ShortcutHelpProps) {
  if (!isOpen) return null;

  const groupedShortcuts = getShortcutsByCategory(shortcuts);
  const categoryOrder = ['file', 'edit', 'selection', 'visibility', 'view'];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="bg-surface border border-white/10 rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan/10 rounded-lg">
                <span className="material-symbols-outlined text-xl text-cyan">keyboard</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">키보드 단축키</h2>
                <p className="text-xs text-text-muted">Forge 3D CAD 단축키 목록</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Shortcut Categories */}
          <div className="space-y-6">
            {categoryOrder.map((category) => {
              const categoryShortcuts = groupedShortcuts[category];
              if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CategoryIcon category={category} />
                    {CATEGORY_NAMES[category] || category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutItem key={shortcut.id} shortcut={shortcut} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-dim">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">?</kbd>
              <span>키를 눌러 도움말 토글</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-dim">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Esc</kbd>
              <span>닫기</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Individual shortcut item
 */
function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
  const formattedKey = formatShortcut(shortcut);
  
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-void/50 rounded-lg">
      <span className="text-sm text-text">{shortcut.description}</span>
      <kbd className="px-2 py-1 text-xs font-mono bg-surface border border-white/10 rounded text-cyan">
        {formattedKey}
      </kbd>
    </div>
  );
}

/**
 * Category icon
 */
function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    file: 'folder_open',
    edit: 'edit',
    view: 'visibility',
    selection: 'select_all',
    visibility: 'visibility',
  };
  
  return (
    <span className="material-symbols-outlined text-sm text-cyan">
      {icons[category] || 'keyboard'}
    </span>
  );
}

/**
 * Compact shortcut indicator for toolbar
 */
export function ShortcutHint({ shortcut }: { shortcut: string }) {
  return (
    <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/5 rounded border border-white/10 text-text-dim font-mono">
      {shortcut}
    </kbd>
  );
}

/**
 * Floating shortcut help button
 */
export function ShortcutHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 p-3 bg-surface/90 backdrop-blur-sm border border-white/10 rounded-xl text-text-muted hover:text-cyan hover:border-cyan/30 transition-all shadow-lg z-40"
      title="키보드 단축키 (? 키)"
    >
      <span className="material-symbols-outlined text-xl">keyboard</span>
    </button>
  );
}
