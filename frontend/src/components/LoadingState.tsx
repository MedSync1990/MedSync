import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data…',
  rows = 4,
}) => {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-space-lg space-y-space-md shadow-sm">
      <div className="flex items-center space-x-3">
        <span className="material-symbols-outlined text-[24px] text-primary animate-spin">
          progress_activity
        </span>
        <span className="font-label-lg text-label-lg text-on-surface font-bold">{message}</span>
      </div>
      <div className="space-y-space-xs pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 bg-surface-subtle rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
};
