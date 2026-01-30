import React from 'react';

export interface ErrorDisplayProps {
  error: string | null;
  className?: string;
}

/**
 * Component for displaying error messages to users.
 * 
 * @param error - The error message to display (null to hide)
 * @param className - Optional CSS class name
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, className }) => {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded border border-red-900/50 bg-red-950/80 px-3 py-2 text-sm text-red-200 ${className ?? ''}`}
    >
      <strong className="font-medium">Error:</strong> {error}
    </div>
  );
};
