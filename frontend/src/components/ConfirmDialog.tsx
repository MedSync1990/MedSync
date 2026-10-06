import React from 'react';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-space-md h-[42px] font-label-lg text-label-lg font-bold text-on-surface-variant bg-surface-card hover:bg-surface-subtle border border-border-subtle rounded-lg shadow-sm transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-space-md h-[42px] font-label-lg text-label-lg font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
              isDestructive
                ? 'bg-status-cancelled-bg text-status-cancelled-text hover:bg-rose-200 border border-status-cancelled-text/30'
                : 'bg-primary hover:bg-primary-container text-on-primary'
            }`}
          >
            {isDestructive && (
              <span className="material-symbols-outlined text-[18px]">warning</span>
            )}
            <span>{confirmLabel}</span>
          </button>
        </>
      }
    >
      <div className="flex items-start gap-space-sm">
        {isDestructive && (
          <div className="w-10 h-10 rounded-full bg-status-cancelled-bg text-status-cancelled-text flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">error_outline</span>
          </div>
        )}
        <p className="font-body-md text-body-md text-on-surface-variant pt-1">{message}</p>
      </div>
    </Modal>
  );
};
