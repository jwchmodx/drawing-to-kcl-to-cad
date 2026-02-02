'use client';

import React from 'react';
import { HistoryEntry } from '@/lib/historyManager';

// Icon component (Material Symbols)
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: (entryId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  
  // Less than 1 minute ago
  if (diffMs < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour ago
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours ago
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  }
  
  // Show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getIconForLabel(label: string): string {
  const labelLower = label.toLowerCase();
  
  if (labelLower.includes('box')) return 'check_box_outline_blank';
  if (labelLower.includes('cylinder')) return 'circle';
  if (labelLower.includes('sphere')) return 'lens';
  if (labelLower.includes('cone')) return 'change_history';
  if (labelLower.includes('torus')) return 'radio_button_unchecked';
  if (labelLower.includes('extrude')) return 'open_in_full';
  if (labelLower.includes('fillet')) return 'rounded_corner';
  if (labelLower.includes('chamfer')) return 'crop_square';
  if (labelLower.includes('union')) return 'add_circle_outline';
  if (labelLower.includes('subtract')) return 'remove_circle_outline';
  if (labelLower.includes('intersect')) return 'filter_none';
  if (labelLower.includes('rotate')) return 'rotate_right';
  if (labelLower.includes('translate') || labelLower.includes('move')) return 'open_with';
  if (labelLower.includes('scale')) return 'aspect_ratio';
  if (labelLower.includes('mirror')) return 'flip';
  if (labelLower.includes('shell')) return 'inventory_2';
  if (labelLower.includes('revolve')) return 'sync';
  if (labelLower.includes('sweep')) return 'gesture';
  if (labelLower.includes('loft')) return 'layers';
  if (labelLower.includes('pattern')) return 'grid_view';
  if (labelLower.includes('draft')) return 'architecture';
  if (labelLower.includes('delete')) return 'delete_outline';
  if (labelLower.includes('edit')) return 'edit';
  if (labelLower.includes('initial') || labelLower.includes('import')) return 'upload_file';
  if (labelLower.includes('create')) return 'add_box';
  
  return 'history';
}

export function HistoryPanel({
  entries,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpTo,
  isCollapsed = false,
  onToggleCollapse,
}: HistoryPanelProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-2 gap-1 bg-surface border-l border-white/5">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
          title="Expand History"
        >
          <Icon name="history" className="text-xl" />
        </button>
        <div className="h-px w-6 bg-white/10 my-1" />
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-all ${
            canUndo
              ? 'text-text-muted hover:text-text hover:bg-white/5'
              : 'text-text-muted/30 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Icon name="undo" className="text-xl" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-all ${
            canRedo
              ? 'text-text-muted hover:text-text hover:bg-white/5'
              : 'text-text-muted/30 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Icon name="redo" className="text-xl" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-56 flex flex-col bg-surface border-l border-white/5 shrink-0">
      {/* Header */}
      <div className="panel-header px-4 py-3 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Icon name="history" className="text-sm" />
          History
        </span>
        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1 rounded transition-all ${
              canUndo
                ? 'text-text-muted hover:text-cyan hover:bg-cyan/10'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" className="text-base" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1 rounded transition-all ${
              canRedo
                ? 'text-text-muted hover:text-cyan hover:bg-cyan/10'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" className="text-base" />
          </button>
          {onToggleCollapse && (
            <>
              <div className="w-px h-4 bg-white/10 mx-1 self-center" />
              <button
                onClick={onToggleCollapse}
                className="p-1 text-text-muted hover:text-text rounded transition-all"
                title="Collapse"
              >
                <Icon name="chevron_right" className="text-base" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="history" className="text-3xl text-text-muted/30 mb-2" />
            <p className="text-xs text-text-muted/50">No history yet</p>
            <p className="text-[10px] text-text-muted/30 mt-1">
              Changes will appear here
            </p>
          </div>
        ) : (
          <div className="py-2">
            {/* Show entries in reverse order (newest first) */}
            {[...entries].reverse().map((entry, reversedIndex) => {
              const actualIndex = entries.length - 1 - reversedIndex;
              const isCurrent = actualIndex === currentIndex;
              const isInFuture = actualIndex > currentIndex;
              
              return (
                <button
                  key={entry.id}
                  onClick={() => onJumpTo(entry.id)}
                  className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-all ${
                    isCurrent
                      ? 'bg-cyan/10 border-l-2 border-cyan'
                      : isInFuture
                      ? 'opacity-50 hover:opacity-75 hover:bg-white/5 border-l-2 border-transparent'
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  {/* Timeline dot/line */}
                  <div className="flex flex-col items-center pt-0.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isCurrent
                          ? 'bg-cyan'
                          : isInFuture
                          ? 'bg-white/20'
                          : 'bg-white/40'
                      }`}
                    />
                    {reversedIndex < entries.length - 1 && (
                      <div
                        className={`w-px flex-1 min-h-4 mt-1 ${
                          isInFuture ? 'bg-white/10' : 'bg-white/20'
                        }`}
                      />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        name={getIconForLabel(entry.label)}
                        className={`text-sm ${
                          isCurrent ? 'text-cyan' : 'text-text-muted'
                        }`}
                      />
                      <span
                        className={`text-xs font-medium truncate ${
                          isCurrent ? 'text-cyan' : isInFuture ? 'text-text-muted/70' : 'text-text'
                        }`}
                      >
                        {entry.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted/50 block mt-0.5">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  
                  {/* Current indicator */}
                  {isCurrent && (
                    <span className="text-[9px] text-cyan bg-cyan/20 px-1.5 py-0.5 rounded uppercase font-semibold">
                      Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {entries.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-text-muted/50">
            {entries.length} change{entries.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-text-muted/50">
            {currentIndex + 1} / {entries.length}
          </span>
        </div>
      )}
    </aside>
  );
}

export default HistoryPanel;
