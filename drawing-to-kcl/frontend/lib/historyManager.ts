/**
 * History Manager for Undo/Redo functionality
 * Manages KCL code state snapshots with undo/redo stacks
 */

export interface HistoryEntry {
  id: string;
  timestamp: number;
  kclCode: string;
  label: string; // Description of the change (e.g., "Create Box", "Apply Fillet")
}

export interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  currentEntry: HistoryEntry | null;
}

const MAX_HISTORY_SIZE = 50;

/**
 * Generate unique ID for history entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new history entry
 */
export function createHistoryEntry(kclCode: string, label: string): HistoryEntry {
  return {
    id: generateId(),
    timestamp: Date.now(),
    kclCode,
    label,
  };
}

/**
 * Initialize empty history state
 */
export function createInitialHistoryState(): HistoryState {
  return {
    undoStack: [],
    redoStack: [],
    currentEntry: null,
  };
}

/**
 * Push a new state to history
 * - Clears redo stack (branching point)
 * - Moves current to undo stack
 * - Sets new entry as current
 */
export function pushHistory(
  state: HistoryState,
  kclCode: string,
  label: string
): HistoryState {
  const newEntry = createHistoryEntry(kclCode, label);
  
  // Build new undo stack
  const newUndoStack = state.currentEntry 
    ? [...state.undoStack, state.currentEntry]
    : [...state.undoStack];
  
  // Trim to max size
  const trimmedUndoStack = newUndoStack.length > MAX_HISTORY_SIZE
    ? newUndoStack.slice(-MAX_HISTORY_SIZE)
    : newUndoStack;

  return {
    undoStack: trimmedUndoStack,
    redoStack: [], // Clear redo stack on new action
    currentEntry: newEntry,
  };
}

/**
 * Undo: Move current to redo stack, pop from undo stack to current
 * Returns new state and the KCL code to restore
 */
export function undo(state: HistoryState): { newState: HistoryState; kclCode: string | null } {
  if (state.undoStack.length === 0) {
    return { newState: state, kclCode: null };
  }

  const newUndoStack = [...state.undoStack];
  const previousEntry = newUndoStack.pop()!;
  
  // Move current to redo stack
  const newRedoStack = state.currentEntry
    ? [state.currentEntry, ...state.redoStack]
    : [...state.redoStack];

  return {
    newState: {
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      currentEntry: previousEntry,
    },
    kclCode: previousEntry.kclCode,
  };
}

/**
 * Redo: Move current to undo stack, pop from redo stack to current
 * Returns new state and the KCL code to restore
 */
export function redo(state: HistoryState): { newState: HistoryState; kclCode: string | null } {
  if (state.redoStack.length === 0) {
    return { newState: state, kclCode: null };
  }

  const newRedoStack = [...state.redoStack];
  const nextEntry = newRedoStack.shift()!;
  
  // Move current to undo stack
  const newUndoStack = state.currentEntry
    ? [...state.undoStack, state.currentEntry]
    : [...state.undoStack];

  return {
    newState: {
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      currentEntry: nextEntry,
    },
    kclCode: nextEntry.kclCode,
  };
}

/**
 * Jump to a specific history entry by ID
 * Reconstructs undo/redo stacks based on the target position
 */
export function jumpToEntry(
  state: HistoryState,
  entryId: string
): { newState: HistoryState; kclCode: string | null } {
  // Build full timeline: [undoStack..., currentEntry, ...redoStack]
  const timeline: HistoryEntry[] = [
    ...state.undoStack,
    ...(state.currentEntry ? [state.currentEntry] : []),
    ...state.redoStack,
  ];

  const targetIndex = timeline.findIndex(e => e.id === entryId);
  if (targetIndex === -1) {
    return { newState: state, kclCode: null };
  }

  const targetEntry = timeline[targetIndex];
  const newUndoStack = timeline.slice(0, targetIndex);
  const newRedoStack = timeline.slice(targetIndex + 1);

  return {
    newState: {
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      currentEntry: targetEntry,
    },
    kclCode: targetEntry.kclCode,
  };
}

/**
 * Get all history entries in chronological order (oldest first)
 */
export function getAllEntries(state: HistoryState): HistoryEntry[] {
  return [
    ...state.undoStack,
    ...(state.currentEntry ? [state.currentEntry] : []),
    ...state.redoStack,
  ];
}

/**
 * Get current entry index in the full timeline
 */
export function getCurrentIndex(state: HistoryState): number {
  return state.undoStack.length;
}

/**
 * Check if undo is available
 */
export function canUndo(state: HistoryState): boolean {
  return state.undoStack.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(state: HistoryState): boolean {
  return state.redoStack.length > 0;
}

/**
 * Clear all history
 */
export function clearHistory(): HistoryState {
  return createInitialHistoryState();
}
