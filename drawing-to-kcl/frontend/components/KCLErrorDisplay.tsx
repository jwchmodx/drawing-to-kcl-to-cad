'use client';

import React, { useState } from 'react';
import type { KCLError, KCLErrorType } from '@/lib/kclErrorHandler';

interface KCLErrorDisplayProps {
  errors: KCLError[];
  warnings?: KCLError[];
  onDismiss?: () => void;
  onErrorClick?: (error: KCLError) => void;
}

const ERROR_TYPE_STYLES: Record<KCLErrorType, { bg: string; border: string; icon: string }> = {
  'SYNTAX_ERROR': { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'error' },
  'REFERENCE_ERROR': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'link_off' },
  'TYPE_ERROR': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: 'warning' },
  'VALUE_ERROR': { bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: 'error_outline' },
  'PARSE_ERROR': { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'code_off' },
  'RUNTIME_ERROR': { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'dangerous' },
  'UNKNOWN_ERROR': { bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: 'help_outline' },
};

const ERROR_TYPE_LABELS: Record<KCLErrorType, string> = {
  'SYNTAX_ERROR': '문법 오류',
  'REFERENCE_ERROR': '참조 오류',
  'TYPE_ERROR': '타입 오류',
  'VALUE_ERROR': '값 오류',
  'PARSE_ERROR': '파싱 오류',
  'RUNTIME_ERROR': '런타임 오류',
  'UNKNOWN_ERROR': '알 수 없는 오류',
};

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function KCLErrorDisplay({
  errors,
  warnings = [],
  onDismiss,
  onErrorClick,
}: KCLErrorDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const totalIssues = errors.length + warnings.length;

  return (
    <div className="bg-surface border-t border-white/10 text-sm">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-white/5"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {errors.length > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <Icon name="error" className="text-base" />
                <span className="font-medium">{errors.length}</span>
              </span>
            )}
            {warnings.length > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Icon name="warning" className="text-base" />
                <span className="font-medium">{warnings.length}</span>
              </span>
            )}
          </div>
          <span className="text-text-muted text-xs">
            {totalIssues}개의 {errors.length > 0 ? '오류' : '경고'}가 있습니다
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 text-text-muted hover:text-text rounded transition-colors"
            >
              <Icon name="close" className="text-base" />
            </button>
          )}
          <Icon 
            name={isCollapsed ? 'expand_more' : 'expand_less'} 
            className="text-base text-text-muted" 
          />
        </div>
      </div>

      {/* Error List */}
      {!isCollapsed && (
        <div className="max-h-48 overflow-y-auto border-t border-white/5">
          {errors.map((error, index) => (
            <ErrorItem 
              key={`error-${index}`} 
              error={error} 
              isWarning={false}
              onClick={() => onErrorClick?.(error)}
            />
          ))}
          {warnings.map((warning, index) => (
            <ErrorItem 
              key={`warning-${index}`} 
              error={warning} 
              isWarning={true}
              onClick={() => onErrorClick?.(warning)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ErrorItemProps {
  error: KCLError;
  isWarning: boolean;
  onClick?: () => void;
}

function ErrorItem({ error, isWarning, onClick }: ErrorItemProps) {
  const style = ERROR_TYPE_STYLES[error.type];
  
  return (
    <div 
      className={`px-4 py-2 border-l-2 ${style.border} ${style.bg} hover:bg-white/5 cursor-pointer transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon 
          name={style.icon} 
          className={`text-base mt-0.5 ${isWarning ? 'text-yellow-400' : 'text-red-400'}`} 
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-medium ${isWarning ? 'text-yellow-400' : 'text-red-400'}`}>
              {ERROR_TYPE_LABELS[error.type]}
            </span>
            {error.line !== undefined && (
              <span className="text-xs text-text-muted">
                Line {error.line}
              </span>
            )}
          </div>
          
          <p className="text-text text-xs">{error.message}</p>
          
          {error.code && (
            <code className="block mt-1 text-[11px] text-text-muted font-mono bg-black/20 px-2 py-1 rounded overflow-x-auto">
              {error.code.trim()}
            </code>
          )}
          
          {error.suggestion && (
            <p className="mt-1 text-[11px] text-cyan flex items-center gap-1">
              <Icon name="lightbulb" className="text-xs" />
              {error.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 간단한 에러 토스트 (작은 알림용)
 */
interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
}

export function ErrorToast({ message, type = 'error', onDismiss }: ErrorToastProps) {
  const colors = {
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    info: 'bg-cyan/20 border-cyan/30 text-cyan',
  };

  const icons = {
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[type]} text-sm`}>
      <Icon name={icons[type]} className="text-base" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-0.5 hover:bg-white/10 rounded">
          <Icon name="close" className="text-sm" />
        </button>
      )}
    </div>
  );
}

/**
 * 파싱 상태 표시
 */
interface ParseStatusProps {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
}

export function ParseStatus({ isValid, errorCount, warningCount }: ParseStatusProps) {
  if (isValid && warningCount === 0) {
    return (
      <div className="flex items-center gap-1.5 text-green-400 text-xs">
        <Icon name="check_circle" className="text-sm" />
        <span>Valid KCL</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {errorCount > 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <Icon name="error" className="text-sm" />
          {errorCount}
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-1 text-yellow-400">
          <Icon name="warning" className="text-sm" />
          {warningCount}
        </span>
      )}
    </div>
  );
}

export default KCLErrorDisplay;
