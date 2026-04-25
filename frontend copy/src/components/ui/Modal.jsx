import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const Modal = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className={cn(
          "relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl shadow-indigo-200/50 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]",
          className
        )}
      >
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
