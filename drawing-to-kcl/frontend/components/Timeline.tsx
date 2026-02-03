'use client';

import React from 'react';
import type { Feature } from '@/lib/featureHistory';

interface TimelineProps {
  features: Feature[];
  currentIndex: number;
  activeFeatureId?: string | null;
  onJumpTo?: (index: number) => void;
  onFeatureClick?: (featureId: string) => void;
  onFeatureDoubleClick?: (featureId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, enabled: boolean) => void;
  onToggleSuppress?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRollbackTo?: (index: number) => void;
  onRename?: (id: string, newName: string) => void;
}

export function Timeline({
  features,
  currentIndex,
  activeFeatureId,
  onJumpTo,
  onFeatureClick,
  onFeatureDoubleClick,
  onReorder,
  onDelete,
  onToggle,
  onToggleSuppress,
  onDuplicate,
  onRollbackTo,
  onRename,
}: TimelineProps) {
  if (features.length === 0) {
    return (
      <div className="h-[60px] bg-surface border-t border-white/5 flex items-center justify-center">
        <p className="text-xs text-text-muted flex items-center gap-2">
          <span className="material-symbols-outlined text-base">timeline</span>
          No features yet. Start by creating a sketch or importing a model.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[60px] bg-surface border-t border-white/5 flex items-center px-4 gap-2 overflow-x-auto">
      {features.map((feature, index) => (
        <button
          key={feature.id}
          onClick={() => (onFeatureClick ? onFeatureClick(feature.id) : onJumpTo?.(index))}
          onDoubleClick={() => onFeatureDoubleClick?.(feature.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
            (activeFeatureId ?? features[currentIndex]?.id) === feature.id || index === currentIndex
              ? 'bg-cyan/20 text-cyan border border-cyan/30'
              : index < currentIndex
              ? 'bg-white/5 text-text-muted hover:bg-white/10'
              : 'bg-white/5 text-text-muted/50 opacity-50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {feature.type === 'sketch' ? 'draw' : 
             feature.type === 'extrude' ? 'open_in_full' :
             feature.type === 'revolve' ? 'sync' :
             feature.type === 'fillet' ? 'rounded_corner' :
             feature.type === 'chamfer' ? 'crop_square' :
             feature.type === 'boolean' ? 'add_circle_outline' :
             'view_in_ar'}
          </span>
          <span>{feature.name}</span>
        </button>
      ))}
    </div>
  );
}

export default Timeline;
