import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
    warning: 'bg-orange-600 hover:bg-orange-700 shadow-orange-100',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
  };

  const iconClasses = {
    danger: 'text-red-600 bg-red-50',
    warning: 'text-orange-600 bg-orange-50',
    info: 'text-blue-600 bg-blue-50'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${iconClasses[variant]}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-bold text-neutral-900 mb-2">{title}</h3>
          <p className="text-neutral-500 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-6 pt-0 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${variantClasses[variant]}`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-4 rounded-xl transition-all disabled:opacity-70"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
