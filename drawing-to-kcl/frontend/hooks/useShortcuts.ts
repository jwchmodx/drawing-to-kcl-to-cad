'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  findMatchingShortcut, 
  DEFAULT_SHORTCUTS, 
  Shortcut, 
  ShortcutAction 
} from '@/lib/shortcutManager';

export interface UseShortcutsOptions {
  // File operations
  onSave?: () => void;
  onOpen?: () => void;
  
  // Edit operations
  onUndo?: () => void;
  onRedo?: () => void;
  
  // Selection operations
  onDelete?: () => void;
  onEscape?: () => void;
  onFocus?: () => void;
  
  // Visibility operations
  onHide?: () => void;
  onShowAll?: () => void;
  
  // View operations
  onViewChange?: (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'perspective') => void;
  
  // Help
  onToggleHelp?: () => void;
  
  // Custom shortcuts
  shortcuts?: Shortcut[];
  
  // Enable/disable
  enabled?: boolean;
}

export interface ShortcutHandlers {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useShortcuts(options: UseShortcutsOptions = {}): ShortcutHandlers {
  const {
    onSave,
    onOpen,
    onUndo,
    onRedo,
    onDelete,
    onEscape,
    onFocus,
    onHide,
    onShowAll,
    onViewChange,
    onToggleHelp,
    shortcuts = DEFAULT_SHORTCUTS,
    enabled = true,
  } = options;

  const [showHelp, setShowHelp] = useState(false);
  
  // Use refs for handlers to avoid re-registering listeners
  const handlersRef = useRef({
    onSave,
    onOpen,
    onUndo,
    onRedo,
    onDelete,
    onEscape,
    onFocus,
    onHide,
    onShowAll,
    onViewChange,
    onToggleHelp,
  });

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onSave,
      onOpen,
      onUndo,
      onRedo,
      onDelete,
      onEscape,
      onFocus,
      onHide,
      onShowAll,
      onViewChange,
      onToggleHelp,
    };
  }, [onSave, onOpen, onUndo, onRedo, onDelete, onEscape, onFocus, onHide, onShowAll, onViewChange, onToggleHelp]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Skip if focus is on an input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Ctrl+S even in inputs
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
        return;
      }
    }

    const matchedShortcut = findMatchingShortcut(event, shortcuts);
    
    if (!matchedShortcut) return;

    const handlers = handlersRef.current;
    const action = matchedShortcut.action as ShortcutAction;

    switch (action) {
      case 'save':
        event.preventDefault();
        handlers.onSave?.();
        break;
        
      case 'open':
        event.preventDefault();
        handlers.onOpen?.();
        break;
        
      case 'undo':
        event.preventDefault();
        handlers.onUndo?.();
        break;
        
      case 'redo':
        event.preventDefault();
        handlers.onRedo?.();
        break;
        
      case 'delete':
        // Don't prevent default if in an editable field
        handlers.onDelete?.();
        break;
        
      case 'escape':
        handlers.onEscape?.();
        setShowHelp(false);
        break;
        
      case 'focus':
        event.preventDefault();
        handlers.onFocus?.();
        break;
        
      case 'hide':
        event.preventDefault();
        handlers.onHide?.();
        break;
        
      case 'showAll':
        event.preventDefault();
        handlers.onShowAll?.();
        break;
        
      case 'viewFront':
        event.preventDefault();
        handlers.onViewChange?.('front');
        break;
        
      case 'viewBack':
        event.preventDefault();
        handlers.onViewChange?.('back');
        break;
        
      case 'viewLeft':
        event.preventDefault();
        handlers.onViewChange?.('left');
        break;
        
      case 'viewRight':
        event.preventDefault();
        handlers.onViewChange?.('right');
        break;
        
      case 'viewTop':
        event.preventDefault();
        handlers.onViewChange?.('top');
        break;
        
      case 'viewBottom':
        event.preventDefault();
        handlers.onViewChange?.('bottom');
        break;
        
      case 'viewPerspective':
        event.preventDefault();
        handlers.onViewChange?.('perspective');
        break;
        
      case 'toggleHelp':
        event.preventDefault();
        setShowHelp(prev => !prev);
        handlers.onToggleHelp?.();
        break;
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
  };
}

/**
 * Hook for managing undo/redo history
 */
export interface HistoryState<T> {
  current: T;
  canUndo: boolean;
  canRedo: boolean;
  set: (value: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (value: T) => void;
}

export function useHistory<T>(initialValue: T, maxHistory = 50): HistoryState<T> {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const set = useCallback((value: T) => {
    setHistory(prev => {
      // Remove any future history
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(value);
      
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [canRedo]);

  const reset = useCallback((value: T) => {
    setHistory([value]);
    setCurrentIndex(0);
  }, []);

  return {
    current,
    canUndo,
    canRedo,
    set,
    undo,
    redo,
    reset,
  };
}
