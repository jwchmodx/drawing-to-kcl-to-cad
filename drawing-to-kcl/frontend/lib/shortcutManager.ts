/**
 * Keyboard Shortcut Manager for Forge 3D CAD
 * 
 * Handles keyboard shortcuts for file operations, editing, and view controls.
 */

export interface Shortcut {
  id: string;
  key: string;
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  description: string;
  category: 'file' | 'edit' | 'view' | 'selection' | 'visibility';
  action: string;
}

export type ShortcutAction = 
  | 'save'
  | 'open'
  | 'undo'
  | 'redo'
  | 'delete'
  | 'escape'
  | 'focus'
  | 'hide'
  | 'showAll'
  | 'viewFront'
  | 'viewBack'
  | 'viewLeft'
  | 'viewRight'
  | 'viewTop'
  | 'viewBottom'
  | 'viewPerspective'
  | 'toggleHelp';

export interface ShortcutConfig {
  shortcuts: Shortcut[];
}

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // File operations
  {
    id: 'save',
    key: 's',
    modifiers: { ctrl: true },
    description: '저장 (KCL 다운로드)',
    category: 'file',
    action: 'save',
  },
  {
    id: 'open',
    key: 'o',
    modifiers: { ctrl: true },
    description: '열기 (KCL 파일 로드)',
    category: 'file',
    action: 'open',
  },

  // Edit operations
  {
    id: 'undo',
    key: 'z',
    modifiers: { ctrl: true },
    description: '실행 취소',
    category: 'edit',
    action: 'undo',
  },
  {
    id: 'redo',
    key: 'z',
    modifiers: { ctrl: true, shift: true },
    description: '다시 실행',
    category: 'edit',
    action: 'redo',
  },

  // Selection operations
  {
    id: 'delete',
    key: 'Delete',
    modifiers: {},
    description: '선택 삭제',
    category: 'selection',
    action: 'delete',
  },
  {
    id: 'delete-backspace',
    key: 'Backspace',
    modifiers: {},
    description: '선택 삭제',
    category: 'selection',
    action: 'delete',
  },
  {
    id: 'escape',
    key: 'Escape',
    modifiers: {},
    description: '선택 해제',
    category: 'selection',
    action: 'escape',
  },
  {
    id: 'focus',
    key: 'f',
    modifiers: {},
    description: '선택 객체에 포커스',
    category: 'selection',
    action: 'focus',
  },

  // Visibility operations
  {
    id: 'hide',
    key: 'h',
    modifiers: {},
    description: '선택 객체 숨기기',
    category: 'visibility',
    action: 'hide',
  },
  {
    id: 'showAll',
    key: 'h',
    modifiers: { shift: true },
    description: '모두 보이기',
    category: 'visibility',
    action: 'showAll',
  },

  // View operations
  {
    id: 'viewFront',
    key: '1',
    modifiers: {},
    description: '정면 뷰',
    category: 'view',
    action: 'viewFront',
  },
  {
    id: 'viewBack',
    key: '2',
    modifiers: {},
    description: '후면 뷰',
    category: 'view',
    action: 'viewBack',
  },
  {
    id: 'viewLeft',
    key: '3',
    modifiers: {},
    description: '좌측 뷰',
    category: 'view',
    action: 'viewLeft',
  },
  {
    id: 'viewRight',
    key: '4',
    modifiers: {},
    description: '우측 뷰',
    category: 'view',
    action: 'viewRight',
  },
  {
    id: 'viewTop',
    key: '5',
    modifiers: {},
    description: '상단 뷰',
    category: 'view',
    action: 'viewTop',
  },
  {
    id: 'viewBottom',
    key: '6',
    modifiers: {},
    description: '하단 뷰',
    category: 'view',
    action: 'viewBottom',
  },
  {
    id: 'viewPerspective',
    key: '0',
    modifiers: {},
    description: 'Perspective 뷰',
    category: 'view',
    action: 'viewPerspective',
  },

  // Help
  {
    id: 'toggleHelp',
    key: '?',
    modifiers: {},
    description: '단축키 도움말 토글',
    category: 'view',
    action: 'toggleHelp',
  },
];

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const { key, modifiers } = shortcut;
  
  // Check modifiers
  const ctrlMatch = !!modifiers.ctrl === (event.ctrlKey || event.metaKey);
  const shiftMatch = !!modifiers.shift === event.shiftKey;
  const altMatch = !!modifiers.alt === event.altKey;
  
  // Check key (case-insensitive for letters)
  const keyMatch = event.key.toLowerCase() === key.toLowerCase() || event.key === key;
  
  return ctrlMatch && shiftMatch && altMatch && keyMatch;
}

/**
 * Find matching shortcut for a keyboard event
 */
export function findMatchingShortcut(
  event: KeyboardEvent, 
  shortcuts: Shortcut[] = DEFAULT_SHORTCUTS
): Shortcut | null {
  // More specific shortcuts (with more modifiers) should be checked first
  const sortedShortcuts = [...shortcuts].sort((a, b) => {
    const aModCount = Object.values(a.modifiers).filter(Boolean).length;
    const bModCount = Object.values(b.modifiers).filter(Boolean).length;
    return bModCount - aModCount;
  });
  
  for (const shortcut of sortedShortcuts) {
    if (matchesShortcut(event, shortcut)) {
      return shortcut;
    }
  }
  
  return null;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  
  if (shortcut.modifiers.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.modifiers.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  // Format the key
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'Delete') keyDisplay = 'Del';
  if (keyDisplay === 'Backspace') keyDisplay = '⌫';
  if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase();
  
  parts.push(keyDisplay);
  
  return parts.join(isMac ? '' : '+');
}

/**
 * Get shortcuts grouped by category
 */
export function getShortcutsByCategory(shortcuts: Shortcut[] = DEFAULT_SHORTCUTS): Record<string, Shortcut[]> {
  const grouped: Record<string, Shortcut[]> = {};
  
  for (const shortcut of shortcuts) {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = [];
    }
    // Skip duplicate actions (like delete with Backspace)
    if (!grouped[shortcut.category].some(s => s.action === shortcut.action)) {
      grouped[shortcut.category].push(shortcut);
    }
  }
  
  return grouped;
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<string, string> = {
  file: '파일',
  edit: '편집',
  view: '뷰',
  selection: '선택',
  visibility: '표시',
};
