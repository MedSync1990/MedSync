import React from 'react';

export interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  rows = 4,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600">{message}</span>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
};
