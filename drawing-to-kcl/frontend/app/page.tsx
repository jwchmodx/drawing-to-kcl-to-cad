'use client';

import React, { useState } from 'react';

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
            {/* <svg viewBox="0 0 24 24" className="size-5 text-cyan relative" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
            </svg> */}
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
        {/* Command Palette Trigger */}
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
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════
function SidebarNav() {
  const [activeItem, setActiveItem] = useState('explorer');

  const items = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'explorer', icon: 'folder_open', label: 'Explorer' },
    { id: 'objects', icon: 'deployed_code', label: '3D Objects' },
    { id: 'layers', icon: 'layers', label: 'Layers' },
    { id: 'materials', icon: 'palette', label: 'Materials' },
  ];

  const bottomItems = [
    { id: 'extensions', icon: 'extension', label: 'Extensions' },
    { id: 'settings', icon: 'tune', label: 'Settings' },
  ];

  return (
    <aside className="w-12 flex flex-col items-center py-3 gap-1 bg-surface border-r border-white/5 shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveItem(item.id)}
          className={`relative p-2.5 rounded-lg transition-all group ${
            activeItem === item.id
              ? 'text-cyan bg-cyan/10'
              : 'text-text-muted hover:text-text hover:bg-white/5'
          }`}
          title={item.label}
        >
          {activeItem === item.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan rounded-r" />
          )}
          <Icon name={item.icon} className="text-xl" />
        </button>
      ))}

      <div className="flex-1" />

      {bottomItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveItem(item.id)}
          className="p-2.5 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-all"
          title={item.label}
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
    project: true,
    meshes: true,
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-60 flex flex-col bg-surface border-r border-white/5 shrink-0">
      {/* Header */}
      <div className="panel-header px-3 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Explorer</span>
        <button className="btn-ghost p-1 rounded">
          <Icon name="more_horiz" className="text-base text-text-dim" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Project Root */}
        <div
          className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
          onClick={() => toggleExpand('project')}
        >
          <Icon
            name={expanded.project ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
            className="text-base text-text-dim"
          />
          <Icon name="inventory_2" className="text-base text-orange" />
          <span className="text-[13px] font-medium text-text">Chair_v2</span>
        </div>

        {expanded.project && (
          <div className="ml-3">
            {/* Meshes */}
            <div
              className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
              onClick={() => toggleExpand('meshes')}
            >
              <Icon
                name={expanded.meshes ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                className="text-base text-text-dim"
              />
              <Icon name="polyline" className="text-base text-cyan" />
              <span className="text-[13px] text-text-muted">Meshes</span>
            </div>

            {expanded.meshes && (
              <div className="ml-3">
                <div className="tree-item active flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
                  <div className="w-4" />
                  <Icon name="view_in_ar" className="text-base text-cyan" />
                  <span className="text-[13px] text-text">Seat_Base</span>
                </div>
                <div className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
                  <div className="w-4" />
                  <Icon name="view_in_ar" className="text-base text-text-dim" />
                  <span className="text-[13px] text-text-muted">Back_Support</span>
                </div>
                <div className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
                  <div className="w-4" />
                  <Icon name="view_in_ar" className="text-base text-text-dim" />
                  <span className="text-[13px] text-text-muted">Armrest_L</span>
                </div>
                <div className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
                  <div className="w-4" />
                  <Icon name="view_in_ar" className="text-base text-text-dim" />
                  <span className="text-[13px] text-text-muted">Armrest_R</span>
                </div>
              </div>
            )}

            {/* Materials */}
            <div className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
              <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
              <Icon name="texture" className="text-base text-green" />
              <span className="text-[13px] text-text-muted">Materials</span>
            </div>

            {/* Lights */}
            <div className="tree-item flex items-center gap-1.5 px-3 py-1.5 cursor-pointer">
              <Icon name="keyboard_arrow_right" className="text-base text-text-dim" />
              <Icon name="lightbulb" className="text-base text-orange" />
              <span className="text-[13px] text-text-muted">Lights</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">Memory</span>
          <span className="text-[10px] font-mono text-cyan">2.4 / 8 GB</span>
        </div>
        <div className="progress-bar h-1 rounded-full">
          <div className="progress-fill h-full rounded-full" style={{ width: '30%' }} />
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIEWPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
function Viewport() {
  const [activeTool, setActiveTool] = useState('select');

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

      {/* Viewport Grid */}
      <div className="flex-1 relative overflow-hidden viewport-grid flex items-center justify-center">
        {/* 3D Object Placeholder */}
        <div className="relative w-[450px] h-[450px] flex items-center justify-center">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-radial from-cyan/10 via-transparent to-transparent blur-3xl" />

          {/* Simple 3D Chair visualization */}
          <div className="relative flex flex-col items-center" style={{ transform: 'perspective(800px) rotateX(15deg) rotateY(-25deg)' }}>
            {/* Seat back */}
            <div className="w-36 h-40 bg-gradient-to-b from-elevated to-raised rounded-t-lg border border-cyan/30 relative shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
              <div className="absolute inset-2 border border-white/5 rounded" />
            </div>
            {/* Seat */}
            <div className="w-40 h-8 bg-gradient-to-b from-raised to-elevated rounded-lg border border-cyan/20 -mt-1 relative shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-transparent" />
            </div>
            {/* Legs */}
            <div className="flex w-36 justify-between px-2 -mt-0.5">
              <div className="w-3 h-28 bg-gradient-to-b from-raised to-void rounded-b border border-white/10" />
              <div className="w-3 h-28 bg-gradient-to-b from-raised to-void rounded-b border border-white/10" />
            </div>
          </div>

          {/* Axis Gizmo */}
          <div className="absolute bottom-16 right-16">
            <div className="relative w-16 h-16">
              <div className="absolute left-1/2 top-1/2 w-10 h-0.5 bg-gradient-to-r from-red to-transparent origin-left" style={{ transform: 'rotate(0deg)' }} />
              <div className="absolute left-1/2 top-1/2 w-10 h-0.5 bg-gradient-to-r from-green to-transparent origin-left" style={{ transform: 'rotate(-90deg)' }} />
              <div className="absolute left-1/2 top-1/2 w-8 h-0.5 bg-gradient-to-r from-cyan to-transparent origin-left" style={{ transform: 'rotate(-135deg)' }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-void border-2 border-cyan glow-cyan-intense" />
            </div>
          </div>
        </div>

        {/* Bottom Left Info */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
            <div className="size-2 rounded-full bg-green animate-pulse" />
            <span className="text-[11px] font-mono text-text-muted">60 FPS</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] font-mono text-text-muted">1.2M tris</span>
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
function ChatPanel() {
  const [message, setMessage] = useState('');

  const messages = [
    {
      type: 'user',
      content: 'Generate a modern ergonomic office chair with curved armrests',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXdwBHXuTiymdvpijQjUmtMDhctpap0rmUaXpclFnjE_4d_7u0SEVPwm4x11qRpV2GG9B6d9ol80QOgpB6jdFoxXdjp254nOu71SUAxo_8bhuCI1LxXC0PP6gGxrhMykxrqkvaGBTd84BMWO4LWrLzhezM-MQim9eFcH58RaT16x96N0GJbmiPXbwaMtDaZoMuLlpNrg7vOgS7xmkCvOQvjbgRTIUIQYIVv_Z5wOsIPMMVJfQvUt1LSNzv6rxInwtcq96OCx07xH5G',
      time: '2 min ago',
    },
    {
      type: 'ai',
      content: 'Analyzing your sketch and generating 3D geometry...',
      status: 'generating',
      progress: 78,
    },
  ];

  return (
    <aside className="w-80 flex flex-col bg-surface border-l border-white/5 shrink-0">
      {/* Header */}
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="auto_awesome" className="text-lg text-cyan" />
            <div className="absolute -top-0.5 -right-0.5 size-2 bg-green rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-text">AI Assistant</span>
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
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in-up ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {msg.type === 'user' ? (
              <>
                <div className="message-user rounded-2xl rounded-tr-md px-4 py-3 max-w-[90%]">
                  <p className="text-[13px] text-text leading-relaxed">{msg.content}</p>
                </div>
                {msg.image && (
                  <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-white/10 group cursor-pointer">
                    <img
                      src={msg.image}
                      alt="Uploaded sketch"
                      className="w-full h-full object-cover grayscale opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <Icon name="visibility" className="text-lg text-text" />
                    </div>
                  </div>
                )}
                <span className="text-[10px] text-text-dim font-mono">{msg.time}</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-5 rounded-md bg-cyan/10 flex items-center justify-center">
                    <Icon name="smart_toy" className="text-xs text-cyan" />
                  </div>
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">FORGE AI</span>
                </div>
                <div className="message-ai rounded-2xl rounded-tl-md px-4 py-3 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="size-2 bg-cyan rounded-full animate-pulse-glow" />
                    <span className="text-[13px] font-medium text-cyan">Generating mesh...</span>
                  </div>
                  <p className="text-[13px] text-text-muted leading-relaxed mb-3">{msg.content}</p>
                  <div className="progress-bar h-1.5 rounded-full">
                    <div className="progress-fill h-full rounded-full" style={{ width: `${msg.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-text-dim">Vertices: 12,847</span>
                    <span className="text-[10px] font-mono text-cyan">{msg.progress}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* System notification */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-full">
            <Icon name="check_circle" className="text-sm text-green" />
            <span className="text-[11px] text-green font-medium">Mesh added to scene</span>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="command-input w-full rounded-xl px-4 py-3 pr-24 text-[13px] text-text placeholder:text-text-dim resize-none h-24 font-sans"
            placeholder="Describe a 3D model or drop an image..."
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <button className="p-1.5 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors" title="Attach image">
              <Icon name="image" className="text-lg" />
            </button>
            <button className="p-1.5 text-text-muted hover:text-text hover:bg-white/5 rounded-lg transition-colors" title="Voice input">
              <Icon name="mic" className="text-lg" />
            </button>
            <button className="btn-primary p-2 rounded-lg" aria-label="Send">
              <Icon name="arrow_upward" className="text-lg" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-cyan animate-pulse-glow" />
            <span className="text-[10px] font-mono text-text-dim">forge-vision-3d</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-dim">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
            <span className="ml-1">to send</span>
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
  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <SidebarNav />
        <FileTree />
        <Viewport />
        <ChatPanel />
      </div>
    </>
  );
}
