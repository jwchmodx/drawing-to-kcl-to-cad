/**
 * SectionControls.tsx - UI for cross-section controls
 */

import React from 'react';
import { PlaneType, SectionEngineState } from '../lib/sectionEngine';

export interface SectionControlsProps {
  state: SectionEngineState;
  onToggleEnabled: (enabled: boolean) => void;
  onTogglePlane: (type: PlaneType, enabled: boolean) => void;
  onPositionChange: (type: PlaneType, position: number) => void;
  onFlipPlane: (type: PlaneType, flip: boolean) => void;
  getPlaneRange: (type: PlaneType) => { min: number; max: number };
}

const PLANE_COLORS: Record<PlaneType, string> = {
  XY: '#00aaff', // Blue
  XZ: '#00ff00', // Green
  YZ: '#ff0000', // Red
};

const PLANE_LABELS: Record<PlaneType, { axis: string; description: string }> = {
  XY: { axis: 'Z', description: 'XY 평면 (Z축)' },
  XZ: { axis: 'Y', description: 'XZ 평면 (Y축)' },
  YZ: { axis: 'X', description: 'YZ 평면 (X축)' },
};

export const SectionControls: React.FC<SectionControlsProps> = ({
  state,
  onToggleEnabled,
  onTogglePlane,
  onPositionChange,
  onFlipPlane,
  getPlaneRange,
}) => {
  return (
    <div className="bg-zinc-900/95 backdrop-blur-sm rounded-lg border border-zinc-700 p-3 min-w-[220px] shadow-xl">
      {/* Header with main toggle */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5h16M4 12h16M4 19h16"
            />
          </svg>
          <span className="text-sm font-medium text-zinc-200">단면 보기</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={state.enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
          />
          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {/* Plane controls */}
      <div className={`space-y-3 transition-opacity ${state.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {(['XY', 'XZ', 'YZ'] as PlaneType[]).map((type) => {
          const planeState = state.planes[type];
          const range = getPlaneRange(type);
          const { axis, description } = PLANE_LABELS[type];

          return (
            <div
              key={type}
              className={`p-2 rounded-md transition-colors ${
                planeState.enabled ? 'bg-zinc-800' : 'bg-zinc-800/50'
              }`}
            >
              {/* Plane header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLANE_COLORS[type] }}
                  />
                  <span className="text-xs font-medium text-zinc-300">
                    {description}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={planeState.enabled}
                    onChange={(e) => onTogglePlane(type, e.target.checked)}
                  />
                  <div className="w-7 h-4 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Position slider */}
              <div className={`transition-opacity ${planeState.enabled ? 'opacity-100' : 'opacity-40'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-zinc-500 w-8">{axis}:</span>
                  <input
                    type="range"
                    className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    min={range.min}
                    max={range.max}
                    step={(range.max - range.min) / 100}
                    value={planeState.position}
                    onChange={(e) => onPositionChange(type, parseFloat(e.target.value))}
                    disabled={!planeState.enabled}
                  />
                  <span className="text-[10px] text-zinc-400 w-10 text-right font-mono">
                    {planeState.position.toFixed(1)}
                  </span>
                </div>

                {/* Flip button */}
                <button
                  className={`mt-1 text-[10px] px-2 py-0.5 rounded transition-colors ${
                    planeState.flip
                      ? 'bg-cyan-600 text-white'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                  onClick={() => onFlipPlane(type, !planeState.flip)}
                  disabled={!planeState.enabled}
                >
                  {planeState.flip ? '↑ 반전됨' : '↓ 반전'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info text */}
      <div className="mt-3 pt-2 border-t border-zinc-700">
        <p className="text-[10px] text-zinc-500 text-center">
          평면을 활성화하고 슬라이더로 위치 조절
        </p>
      </div>
    </div>
  );
};

export default SectionControls;
