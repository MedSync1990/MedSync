import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Modal Centering Wrapper */}
      <div className="flex min-h-full items-center justify-center p-space-md">
        <div className="relative w-full max-w-xl transform overflow-hidden rounded-xl bg-surface-card shadow-2xl transition-all border border-border-subtle text-on-surface">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-space-lg py-space-md bg-surface-card">
            <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="px-space-lg py-space-md bg-surface-card">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-border-subtle bg-surface-subtle px-space-lg py-space-md flex justify-end gap-space-sm items-center">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
