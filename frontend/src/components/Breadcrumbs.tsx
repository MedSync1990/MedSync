import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <a href={item.href} className="hover:text-teal-700 transition-colors">
                {item.label}
              </a>
            ) : (
              <span className={isLast ? 'font-medium text-slate-800' : ''}>{item.label}</span>
            )}
            {!isLast && <span className="text-slate-400">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
