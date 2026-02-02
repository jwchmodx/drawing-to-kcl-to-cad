'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  HistoryState,
  HistoryEntry,
  createInitialHistoryState,
  pushHistory,
  undo as undoAction,
  redo as redoAction,
  jumpToEntry,
  getAllEntries,
  getCurrentIndex,
  canUndo,
  canRedo,
} from '@/lib/historyManager';

export interface UseHistoryOptions {
  /** Initial KCL code (optional) */
  initialCode?: string;
  /** Callback when code changes via undo/redo/jump */
  onCodeChange?: (code: string) => void;
  /** Debounce time for auto-save to history (ms). Set to 0 to disable auto-save. */
  autoSaveDebounceMs?: number;
}

export interface UseHistoryReturn {
  /** Push a new code state to history with a label */
  pushState: (kclCode: string, label: string) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Jump to a specific history entry */
  jumpTo: (entryId: string) => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Get all history entries */
  entries: HistoryEntry[];
  /** Get current entry index */
  currentIndex: number;
  /** Get current entry */
  currentEntry: HistoryEntry | null;
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const { onCodeChange, autoSaveDebounceMs = 0 } = options;
  
  const [historyState, setHistoryState] = useState<HistoryState>(createInitialHistoryState);
  const onCodeChangeRef = useRef(onCodeChange);
  
  // Keep ref updated
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  // Push new state to history
  const pushState = useCallback((kclCode: string, label: string) => {
    setHistoryState(prev => pushHistory(prev, kclCode, label));
  }, []);

  // Undo action
  const handleUndo = useCallback(() => {
    setHistoryState(prev => {
      const { newState, kclCode } = undoAction(prev);
      if (kclCode !== null && onCodeChangeRef.current) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => onCodeChangeRef.current?.(kclCode), 0);
      }
      return newState;
    });
  }, []);

  // Redo action
  const handleRedo = useCallback(() => {
    setHistoryState(prev => {
      const { newState, kclCode } = redoAction(prev);
      if (kclCode !== null && onCodeChangeRef.current) {
        setTimeout(() => onCodeChangeRef.current?.(kclCode), 0);
      }
      return newState;
    });
  }, []);

  // Jump to specific entry
  const handleJumpTo = useCallback((entryId: string) => {
    setHistoryState(prev => {
      const { newState, kclCode } = jumpToEntry(prev, entryId);
      if (kclCode !== null && onCodeChangeRef.current) {
        setTimeout(() => onCodeChangeRef.current?.(kclCode), 0);
      }
      return newState;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z = Undo
      if (ctrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl/Cmd + Shift + Z = Redo (common on Mac)
      // Ctrl/Cmd + Y = Redo (common on Windows)
      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    pushState,
    undo: handleUndo,
    redo: handleRedo,
    jumpTo: handleJumpTo,
    canUndo: canUndo(historyState),
    canRedo: canRedo(historyState),
    entries: getAllEntries(historyState),
    currentIndex: getCurrentIndex(historyState),
    currentEntry: historyState.currentEntry,
  };
}

/**
 * Helper to detect what label to use for a code change
 */
export function detectChangeLabel(prevCode: string, newCode: string): string {
  if (!prevCode && newCode) {
    return 'Initial code';
  }
  
  const prevLines = prevCode.split('\n').filter(l => l.trim());
  const newLines = newCode.split('\n').filter(l => l.trim());
  
  // Find added lines
  const addedLines = newLines.filter(line => !prevLines.includes(line));
  
  if (addedLines.length > 0) {
    const lastAdded = addedLines[addedLines.length - 1];
    
    // Detect operation type from the line
    if (lastAdded.includes('box(')) return 'Create Box';
    if (lastAdded.includes('cylinder(')) return 'Create Cylinder';
    if (lastAdded.includes('sphere(')) return 'Create Sphere';
    if (lastAdded.includes('cone(')) return 'Create Cone';
    if (lastAdded.includes('torus(')) return 'Create Torus';
    if (lastAdded.includes('extrude(')) return 'Extrude';
    if (lastAdded.includes('fillet(')) return 'Apply Fillet';
    if (lastAdded.includes('chamfer(')) return 'Apply Chamfer';
    if (lastAdded.includes('boolean_union(')) return 'Boolean Union';
    if (lastAdded.includes('boolean_subtract(')) return 'Boolean Subtract';
    if (lastAdded.includes('boolean_intersect(')) return 'Boolean Intersect';
    if (lastAdded.includes('rotate(')) return 'Rotate';
    if (lastAdded.includes('translate(')) return 'Translate';
    if (lastAdded.includes('scale(')) return 'Scale';
    if (lastAdded.includes('mirror(')) return 'Mirror';
    if (lastAdded.includes('shell(')) return 'Apply Shell';
    if (lastAdded.includes('revolve(')) return 'Revolve';
    if (lastAdded.includes('sweep(')) return 'Sweep';
    if (lastAdded.includes('loft(')) return 'Loft';
    if (lastAdded.includes('pattern_linear(')) return 'Linear Pattern';
    if (lastAdded.includes('pattern_circular(')) return 'Circular Pattern';
    if (lastAdded.includes('draft(')) return 'Apply Draft';
    
    // Extract variable name if it's a let statement
    const letMatch = lastAdded.match(/let\s+(\w+)/);
    if (letMatch) {
      return `Create ${letMatch[1]}`;
    }
    
    return 'Edit Code';
  }
  
  // Check if lines were removed
  const removedLines = prevLines.filter(line => !newLines.includes(line));
  if (removedLines.length > 0) {
    return 'Delete Code';
  }
  
  return 'Edit Code';
}
