import React from 'react';

export interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  message,
  icon = 'database_off',
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-space-xl bg-surface-card border border-border-subtle rounded-xl text-center shadow-sm">
      <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center text-outline mb-space-sm">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h4 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">{title}</h4>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1 mb-space-md">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
