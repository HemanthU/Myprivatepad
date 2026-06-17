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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card/90 backdrop-blur-3xl border border-white/20 dark:border-white/10 w-full max-w-md rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{config.title}</h3>
        {config.message && <p className="text-gray-500 dark:text-gray-400 mb-6">{config.message}</p>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-4">
          {config.type === "text" && (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder || "Type here..."}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-lg"
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {config.cancelText !== "hidden" && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {config.cancelText || "Cancel"}
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-semibold bg-black text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              {config.confirmText || (config.type === "confirm" && config.cancelText !== "hidden" ? "Confirm" : "OK")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
