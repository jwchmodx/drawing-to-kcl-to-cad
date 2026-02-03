'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Message {
  type: 'user' | 'ai' | 'system';
  content: string;
  kclCode?: string;
  time: string;
  isLoading?: boolean;
}

interface ChatPanelProps {
  onSubmitCode: (code: string) => void;
  kclCode: string;
}

export function ChatPanel({ onSubmitCode, kclCode }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'ai' | 'code'>('ai');

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      type: 'user',
      content: message.trim(),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    const inputText = message.trim();
    setMessage('');

    if (mode === 'code') {
      onSubmitCode(inputText);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-kcl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API 오류');
      }

      const aiMessage: Message = {
        type: 'ai',
        content: data.kclCode,
        kclCode: data.kclCode,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
      onSubmitCode(data.kclCode);
    } catch (error) {
      const errorMessage: Message = {
        type: 'system',
        content: `오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
      <div className="panel-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={mode === 'ai' ? 'auto_awesome' : 'code'} className="text-lg text-cyan" />
          <span className="text-sm font-semibold text-text">
            {mode === 'ai' ? 'AI Assistant' : 'KCL Editor'}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            className={`p-1.5 rounded transition-colors ${mode === 'ai' ? 'bg-cyan/20 text-cyan' : 'btn-ghost'}`}
            onClick={() => setMode('ai')}
            title="AI 모드"
          >
            <Icon name="auto_awesome" className="text-base" />
          </button>
          <button
            className={`p-1.5 rounded transition-colors ${mode === 'code' ? 'bg-cyan/20 text-cyan' : 'btn-ghost'}`}
            onClick={() => setMode('code')}
            title="코드 모드"
          >
            <Icon name="code" className="text-base" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Icon name={mode === 'ai' ? 'auto_awesome' : 'terminal'} className="text-4xl text-text-dim mb-3" />
            <p className="text-sm text-text-muted">
              {mode === 'ai' ? '만들고 싶은 3D 모델을 설명하세요' : 'KCL 코드를 입력하세요'}
            </p>
            <p className="text-xs text-text-dim mt-2">
              {mode === 'ai'
                ? '예: "간단한 테이블 만들어줘"'
                : '예: let box1 = box(size: [2, 1, 1], center: [0, 0, 0])'}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className="animate-fade-in-up flex flex-col gap-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {msg.type === 'user' && (
                <div className="message-user rounded-2xl rounded-tr-md px-4 py-3">
                  <p className="text-[13px] text-text">{msg.content}</p>
                </div>
              )}
              {msg.type === 'ai' && (
                <div className="message-ai rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="smart_toy" className="text-sm text-cyan" />
                    <span className="text-[10px] text-text-muted uppercase">AI Generated</span>
                  </div>
                  <pre className="text-[12px] text-cyan font-mono whitespace-pre-wrap overflow-x-auto">
                    {msg.content}
                  </pre>
                </div>
              )}
              {msg.type === 'system' && (
                <div className="px-4 py-2 bg-red/10 border border-red/20 rounded-lg">
                  <p className="text-[12px] text-red">{msg.content}</p>
                </div>
              )}
              <span className="text-[10px] text-text-dim font-mono self-end">{msg.time}</span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-3 bg-surface rounded-2xl">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[12px] text-text-muted">KCL 코드 생성 중...</span>
          </div>
        )}

        {kclCode && messages.length > 0 && !isLoading && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-full">
              <Icon name="check_circle" className="text-sm text-green" />
              <span className="text-[11px] text-green font-medium">3D 프리뷰 생성됨</span>
            </div>
          </div>
        )}
      </div>

      {kclCode && (
        <div className="px-4 py-2 border-t border-white/5 bg-void/50">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Current Code</div>
          <pre className="text-[11px] text-cyan font-mono bg-black/30 p-2 rounded overflow-x-auto max-h-20 overflow-y-auto">
            {kclCode}
          </pre>
        </div>
      )}

      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="command-input w-full rounded-xl px-4 py-3 pr-12 text-[13px] text-text placeholder:text-text-dim resize-none h-28 disabled:opacity-50"
            placeholder={
              mode === 'ai'
                ? '"간단한 의자 만들어줘" 또는 "테이블과 의자"'
                : 'let myBox = box(size: [1, 2, 3], center: [0, 0, 0])'
            }
          />
          <div className="absolute bottom-3 right-3">
            <button
              className="btn-primary p-2 rounded-lg disabled:opacity-50"
              aria-label={mode === 'ai' ? 'Generate' : 'Run'}
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
            >
              <Icon name={mode === 'ai' ? 'auto_awesome' : 'play_arrow'} className="text-lg" />
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
