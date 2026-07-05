import React, { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      iconBg: "bg-rose-100 text-rose-600",
      icon: <AlertTriangle size={24} />,
      btnClass: "bg-rose-600 hover:bg-rose-700 text-white",
    },
    warning: {
      iconBg: "bg-amber-100 text-amber-600",
      icon: <AlertTriangle size={24} />,
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      iconBg: "bg-blue-100 text-blue-600",
      icon: <AlertTriangle size={24} />,
      btnClass: "bg-[#0aa9ad] hover:bg-[#088c90] text-white",
    },
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onClose : undefined} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md scale-100 overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all m-4">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
            {config.icon}
          </div>
          
          <div className="mt-2 sm:mt-0">
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <div className="mt-2 text-sm text-slate-500">{description}</div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex w-full justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none sm:w-auto transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:outline-none sm:w-auto transition-colors disabled:opacity-70 ${config.btnClass}`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
