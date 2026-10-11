import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  to?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const target = item.to || item.href;
        return (
          <React.Fragment key={index}>
            {target && !isLast ? (
              <Link to={target} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-primary font-bold' : 'text-outline'}>{item.label}</span>
            )}
            {!isLast && (
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                chevron_right
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
