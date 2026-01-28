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
      className={className}
      role="alert"
      aria-live="polite"
      style={{
        padding: '1rem',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
        color: '#c33',
      }}
    >
      <strong>Error:</strong> {error}
    </div>
  );
};
