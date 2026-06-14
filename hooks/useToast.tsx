"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle, Info, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "loading";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info", duration: number = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-card border border-border shadow-xl rounded-2xl px-5 py-4 min-w-[250px] animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto"
          >
            {t.type === "success" && <CheckCircle2 className="text-green-500" size={20} />}
            {t.type === "error" && <XCircle className="text-red-500" size={20} />}
            {t.type === "info" && <Info className="text-blue-500" size={20} />}
            {t.type === "loading" && <Loader2 className="text-gray-500 animate-spin" size={20} />}
            <span className="font-semibold text-sm text-foreground">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
