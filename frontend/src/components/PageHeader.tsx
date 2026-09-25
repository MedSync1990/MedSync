import React from 'react';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md p-space-lg bg-surface-card rounded-xl shadow-sm border border-border-subtle mb-space-md">
      <div>
        {breadcrumbs && <div className="mb-2"><Breadcrumbs items={breadcrumbs} /></div>}
        <h1 className="font-display-lg text-display-lg text-brand-navy-deep font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-space-sm self-start lg:self-center">{actions}</div>}
    </div>
  );
};
