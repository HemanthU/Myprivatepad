"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Lock, Shield, Settings, FileText, Home, Plus } from "lucide-react";

export default function CommandPalette({ isOpen, onClose, currentSlug }: { isOpen: boolean, onClose: () => void, currentSlug: string }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (action: string) => {
    onClose();
    if (action === "home") router.push("/");
    if (action === "new") {
      const newSlug = Math.random().toString(36).substring(2, 10);
      router.push(`/${newSlug}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      router.push(`/${query.trim()}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-card/90 backdrop-blur-3xl border border-white/20 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-[0_30px_100px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_30px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-top-8 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="relative border-b border-border flex items-center px-4">
          <Search className="text-gray-400" size={24} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to a pad..."
            className="w-full bg-transparent border-none outline-none px-4 py-5 text-xl text-foreground placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs font-semibold text-gray-500">ESC</kbd>
        </form>

        <div className="p-2 max-h-[400px] overflow-y-auto">
          {query.trim() ? (
            <div className="p-2">
              <button onClick={() => handleSubmit({ preventDefault: () => {} } as any)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left transition-colors">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400"><Search size={18} /></div>
                <div>
                  <div className="font-semibold text-foreground">Go to "{query}"</div>
                  <div className="text-xs text-gray-500">Press Enter to jump</div>
                </div>
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</div>
              
              <button onClick={() => handleAction("new")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors group">
                <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><Plus size={18} /></div>
                <div className="font-medium text-foreground">Create New Pad</div>
              </button>

              <button onClick={() => handleAction("home")} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors group">
                <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><Home size={18} /></div>
                <div className="font-medium text-foreground">Home Page</div>
              </button>
              

            </>
          )}
        </div>
      </div>
    </div>
  );
}
