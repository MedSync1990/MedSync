import React from 'react';

export interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data',
  message,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-xl text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-lg font-bold">
        !
      </div>
      <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
