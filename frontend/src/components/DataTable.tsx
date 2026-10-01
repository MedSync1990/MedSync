import React from 'react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} icon="table_rows" />;
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body-md text-body-md text-on-surface">
          <thead className="bg-surface-subtle text-on-surface font-label-md text-label-md font-bold uppercase tracking-wider border-b border-border-subtle">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-space-sm px-space-md ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-surface-subtle' : 'hover:bg-surface-subtle/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-space-md px-space-md ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
