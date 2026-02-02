'use client';

import React, { useState, useCallback } from 'react';
import { KclPreview3D } from '@/components/KclPreview3D';
import { buildGeometrySpecFromKcl } from '@/lib/geometryRuntime';
import { buildArtifactGraphFromGeometry, extractMeshes } from '@/lib/types/artifactGraph';

// KCL 코드를 프리뷰 데이터로 변환
function kclCodeToPreview(kclCode: string) {
  const spec = buildGeometrySpecFromKcl(kclCode);
  const graph = buildArtifactGraphFromGeometry(spec);
  const meshes = extractMeshes(graph);
  return { meshes: meshes.map(m => ({ id: m.id, vertices: m.vertices as [number, number, number][], indices: m.indices })) };
}

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT - Consistent Material Symbols
// ═══════════════════════════════════════════════════════════════
function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════
function Header() {
  const [activeMode, setActiveMode] = useState('design');

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-surface border-b border-white/5 shrink-0 z-50">
      {/* Left: Logo + Menu */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="relative size-7 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan/20 rounded-md blur-sm" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text">FORGE</span>
          <span className="text-[10px] font-medium text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">BETA</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <nav className="flex items-center gap-1">
          {['File', 'Edit', 'Model', 'Render', 'Help'].map((item) => (
            <button
              key={item}
              className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text hover:bg-white/5 rounded transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* Center: Mode Switcher */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div className="flex bg-void rounded-lg p-0.5 border border-white/5">
          {[
            { id: 'design', label: 'Design', icon: 'edit' },
            { id: 'simulate', label: 'Simulate', icon: 'play_arrow' },
            { id: 'render', label: 'Render', icon: 'photo_camera' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeMode === mode.id
                  ? 'bg-cyan text-void'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon name={mode.icon} className="text-sm" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted bg-void border border-white/5 rounded-lg hover:border-white/10 hover:text-text transition-all">
          <Icon name="search" className="text-sm" />
          <span>Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-white/5 rounded border border-white/10">⌘K</kbd>
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button className="btn-primary flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs">
          <Icon name="file_download" className="text-sm" />
          Export
        </button>

        <div className="flex gap-1">
          <button className="btn-ghost p-2 rounded-lg" aria-label="Settings">
            <Icon name="settings" className="text-lg" />
          </button>
          <button className="btn-ghost p-2 rounded-lg" aria-label="Account">
            <Icon name="account_circle" className="text-lg" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAV COMPONENT
// ═══════════════════════════════════════════════════════════════
function SidebarNav() {
  const [activeItem, setActiveItem] = useState('files');

  const items = [
    { id: 'home', icon: 'home' },
    { id: 'files', icon: 'folder_open' },
    { id: 'objects', icon: 'deployed_code' },
    { id: 'layers', icon: 'layers' },
    { id: 'materials', icon: 'palette' },
  ];

  const bottomItems = [
    { id: 'extensions', icon: 'extension' },
    { id: 'settings', icon: 'tune' },
  ];

  return (
    <aside className="w-12 flex flex-col items-center py-3 gap-1 bg-surface border-r border-white/5 shrink-0">
      {items.map((item) => (
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

      {bottomItems.map((item) => (
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

// ═══════════════════════════════════════════════════════════════
// FILE TREE COMPONENT
// ═══════════════════════════════════════════════════════════════
function FileTree() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'chair': true,
    'meshes': true,
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-60 flex flex-col bg-surface border-r border-white/5 shrink-0">
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Explorer</span>
        <button className="btn-ghost p-1 rounded">
          <Icon name="more_horiz" className="text-base" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {/* Project Item */}
          <button
            onClick={() => toggleExpand('chair')}
            className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
          >
            <Icon name={expanded['chair'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} className="text-base text-text-dim" />
            <Icon name="inventory_2" className="text-base text-cyan" />
            <span className="text-[13px] text-text">Chair_v2</span>
          </button>

          {expanded['chair'] && (
            <div className="ml-4 border-l border-white/5 pl-2">
              {/* Meshes Folder */}
              <button
                onClick={() => toggleExpand('meshes')}
                className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md"
              >
                <Icon name={expanded['meshes'] ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} className="text-base text-text-dim" />
                <Icon name="polyline" className="text-base text-orange" />
                <span className="text-[13px] text-text-muted">Meshes</span>
              </button>

              {expanded['meshes'] && (
                <div className="ml-4 border-l border-white/5 pl-2">
                  {['Seat_Base', 'Back_Support', 'Armrest_L', 'Armrest_R'].map((mesh, i) => (
                    <button
                      key={mesh}
                      className={`tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md ${i === 0 ? 'active' : ''}`}
                    >
                      <Icon name="view_in_ar" className="text-base text-green" />
                      <span className="text-[13px] text-text-muted">{mesh}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Other items */}
              <button className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md">
                <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
                <Icon name="texture" className="text-base text-cyan-dim" />
                <span className="text-[13px] text-text-muted">Materials</span>
              </button>
              <button className="tree-item flex items-center gap-2 w-full px-2 py-1.5 rounded-md">
                <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
                <Icon name="lightbulb" className="text-base text-orange" />
                <span className="text-[13px] text-text-muted">Lights</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] text-text-dim">
          <span className="uppercase tracking-wider">Memory</span>
          <span className="font-mono text-cyan">2.4 / 8 GB</span>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIEWPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
interface ViewportProps {
  preview: { meshes: { id?: string | null; vertices: [number, number, number][]; indices: number[] }[] } | null;
}

function Viewport({ preview }: ViewportProps) {
  const [activeTool, setActiveTool] = useState('select');
  const hasPreview = preview && preview.meshes && preview.meshes.length > 0;

  const tools = [
    { id: 'select', icon: 'near_me', label: 'Select' },
    { id: 'move', icon: 'open_with', label: 'Move' },
    { id: 'rotate', icon: 'rotate_right', label: 'Rotate' },
    { id: 'scale', icon: 'open_in_full', label: 'Scale' },
  ];

  const viewTools = [
    { id: 'grid', icon: 'grid_on', label: 'Toggle Grid' },
    { id: 'snap', icon: 'filter_center_focus', label: 'Snap' },
    { id: 'orthographic', icon: 'crop_free', label: 'Orthographic' },
  ];

  return (
    <main className="flex-1 relative flex flex-col bg-void min-w-0 min-h-0">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 z-10 glow-cyan">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`p-2 rounded-lg transition-all ${
              activeTool === tool.id
                ? 'bg-cyan text-void'
                : 'text-text-muted hover:text-text hover:bg-white/5'
            }`}
            title={tool.label}
          >
            <Icon name={tool.icon} className="text-lg" />
          </button>
        ))}

        <div className="w-px h-6 bg-white/10 mx-1" />

        {viewTools.map((tool) => (
          <button
            key={tool.id}
            className="p-2 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
            title={tool.label}
          >
            <Icon name={tool.icon} className="text-lg" />
          </button>
        ))}
      </div>

      {/* Viewport Grid / 3D Preview */}
      <div className="flex-1 relative overflow-hidden viewport-grid flex items-center justify-center">
        {hasPreview ? (
          /* 3D Preview with KclPreview3D */
          <div className="w-full h-full">
            <KclPreview3D preview={preview} />
          </div>
        ) : (
          /* Empty state */
          <div className="relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-gradient-radial from-cyan/10 via-transparent to-transparent blur-3xl" />
            <div className="text-center text-text-muted relative z-10">
              <Icon name="view_in_ar" className="text-6xl mb-4 text-cyan/30" />
              <p className="text-sm">KCL 코드를 입력하면 3D 프리뷰가 표시됩니다</p>
              <p className="text-xs mt-2 text-text-dim font-mono">예: let myBox = box(size: [1, 2, 3], center: [0, 0, 0])</p>
            </div>
          </div>
        )}

        {/* Bottom Left Info */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
            <div className="size-2 rounded-full bg-green animate-pulse" />
            <span className="text-[11px] font-mono text-text-muted">60 FPS</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] font-mono text-text-muted">
              {hasPreview ? `${preview.meshes.length} mesh` : '0 mesh'}
            </span>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="add" className="text-lg" />
          </button>
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="remove" className="text-lg" />
          </button>
          <button className="p-2 bg-surface/90 backdrop-blur-sm border border-white/5 rounded-lg text-text-muted hover:text-text transition-colors">
            <Icon name="crop_free" className="text-lg" />
          </button>
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t border-white/5 bg-surface/80 backdrop-blur-sm px-4 shrink-0">
        <div className="flex gap-1">
          {['Viewport', 'Wireframe', 'Node Editor', 'UV Map'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                i === 0
                  ? 'text-cyan'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan" />
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAT PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════
interface Message {
  type: 'user' | 'system';
  content: string;
  kclCode?: string;
  time: string;
}

interface ChatPanelProps {
  onSubmitCode: (code: string) => void;
  kclCode: string;
}

function ChatPanel({ onSubmitCode, kclCode }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSubmit = () => {
    if (message.trim()) {
      const newMessage: Message = {
        type: 'user',
        content: message.trim(),
        kclCode: message.trim(),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, newMessage]);
      onSubmitCode(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <aside className="w-80 flex flex-col bg-surface border-l border-white/5 shrink-0">
      {/* Header */}
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="code" className="text-lg text-cyan" />
          </div>
          <span className="text-sm font-semibold text-text">KCL Editor</span>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5 rounded">
            <Icon name="history" className="text-base" />
          </button>
          <button className="btn-ghost p-1.5 rounded">
            <Icon name="more_vert" className="text-base" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Icon name="terminal" className="text-4xl text-text-dim mb-3" />
            <p className="text-sm text-text-muted">KCL 코드를 입력하세요</p>
            <p className="text-xs text-text-dim mt-2">
              예시: let box1 = box(size: [2, 1, 1], center: [0, 0, 0])
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className="animate-fade-in-up flex flex-col gap-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="message-user rounded-2xl rounded-tr-md px-4 py-3">
                <pre className="text-[12px] text-cyan font-mono whitespace-pre-wrap overflow-x-auto">{msg.content}</pre>
              </div>
              <span className="text-[10px] text-text-dim font-mono self-end">{msg.time}</span>
            </div>
          ))
        )}

        {kclCode && messages.length > 0 && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-full">
              <Icon name="check_circle" className="text-sm text-green" />
              <span className="text-[11px] text-green font-medium">3D 프리뷰 생성됨</span>
            </div>
          </div>
        )}
      </div>

      {/* Current KCL Code Display */}
      {kclCode && (
        <div className="px-4 py-2 border-t border-white/5 bg-void/50">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Current Code</div>
          <pre className="text-[11px] text-cyan font-mono bg-black/30 p-2 rounded overflow-x-auto max-h-20 overflow-y-auto">{kclCode}</pre>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-cyan placeholder:text-text-dim resize-none h-28 font-mono"
            placeholder="let myBox = box(size: [1, 2, 3], center: [0, 0, 0])"
          />
          <div className="absolute bottom-3 right-3">
            <button 
              className="btn-primary p-2 rounded-lg" 
              aria-label="Run"
              onClick={handleSubmit}
            >
              <Icon name="play_arrow" className="text-lg" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-cyan animate-pulse-glow" />
            <span className="text-[10px] font-mono text-text-dim">kcl-runtime</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-dim">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
            <span className="ml-1">to run</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function Page() {
  const [kclCode, setKclCode] = useState('');
  const [preview, setPreview] = useState<{ meshes: { id?: string | null; vertices: [number, number, number][]; indices: number[] }[] } | null>(null);

  const handleSubmitCode = useCallback((code: string) => {
    setKclCode(code);
    try {
      const newPreview = kclCodeToPreview(code);
      setPreview(newPreview);
    } catch (error) {
      console.error('KCL parsing error:', error);
      setPreview(null);
    }
  }, []);

  // URL 파라미터로 초기 코드 로드 (테스트용)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        handleSubmitCode(decodeURIComponent(code));
      }
    }
  }, [handleSubmitCode]);

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <SidebarNav />
        <FileTree />
        <Viewport preview={preview} />
        <ChatPanel onSubmitCode={handleSubmitCode} kclCode={kclCode} />
      </div>
    </>
  );
}
