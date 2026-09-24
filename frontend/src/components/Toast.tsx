import React from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const bg =
    type === 'success'
      ? 'bg-emerald-600'
      : type === 'error'
      ? 'bg-rose-600'
      : 'bg-slate-800';

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-lg text-white text-sm shadow-xl ${bg}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-3 font-bold text-white/80 hover:text-white">
        ✕
      </button>
    </div>
  );
};
