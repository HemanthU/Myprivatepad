"use client";

import { useState, useEffect, useRef } from "react";

type PromptModalProps = {
  isOpen: boolean;
  config: {
    title: string;
    message?: string;
    type?: "text" | "confirm";
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    requiredConfirmText?: string;
  };
  onClose: (value: string | null | boolean) => void;
};

export default function PromptModal({ isOpen, config, onClose }: PromptModalProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(config.defaultValue || "");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, config.defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onClose(config.type === "confirm" ? true : value);
  };

  const handleCancel = () => {
    onClose(config.type === "confirm" ? false : null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 w-full max-w-md rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out relative overflow-hidden">
        
        {/* Decorative ambient light */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

        <h3 className="text-2xl font-extrabold mb-3 text-white tracking-tight relative z-10">{config.title}</h3>
        {config.message && <p className="text-slate-300 mb-8 font-medium text-sm leading-relaxed relative z-10">{config.message}</p>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2 relative z-10">
          {(config.type === "text" || config.requiredConfirmText) && (
            <div className="relative group">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={config.requiredConfirmText ? `Type "${config.requiredConfirmText}" to confirm` : (config.placeholder || "Type here...")}
                className="w-full px-5 py-4 bg-black/20 border border-white/10 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-medium text-white placeholder-slate-500 shadow-inner backdrop-blur-md"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            {config.cancelText !== "hidden" && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 rounded-2xl font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
              >
                {config.cancelText || "Cancel"}
              </button>
            )}
            <button
              type="submit"
              disabled={!!config.requiredConfirmText && value !== config.requiredConfirmText}
              className="px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {config.confirmText || (config.type === "confirm" && config.cancelText !== "hidden" ? "Confirm" : "OK")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
