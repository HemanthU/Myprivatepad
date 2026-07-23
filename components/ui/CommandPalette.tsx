"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, Lock, Moon, Sun, Monitor, Code, Edit3, Type, Palette, Shield, X, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlug: string;
}

export default function CommandPalette({ isOpen, onClose, currentSlug }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { setTheme, setGlassmorphism, glassmorphism, setLayout } = useAppStore();

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const commands = [
    {
      group: "Navigation",
      items: [
        { icon: <Shield size={16} />, label: "Security Center", action: () => router.push('/security') },
        { icon: <Settings size={16} />, label: "Global Settings", action: () => router.push('/settings') },
      ]
    },
    {
      group: "Editor Layout",
      items: [
        { icon: <Monitor size={16} />, label: "Split View (Editor | Preview)", action: () => setLayout('split-vertical') },
        { icon: <Edit3 size={16} />, label: "Editor Only", action: () => setLayout('editor-only') },
      ]
    },
    {
      group: "Quick Appearance",
      items: [
        { icon: <Moon size={16} />, label: "Theme: Dracula", action: () => setTheme('dracula') },
        { icon: <Sun size={16} />, label: "Theme: Light", action: () => setTheme('light') },
        { icon: <Monitor size={16} />, label: "Theme: Cyberpunk", action: () => setTheme('cyberpunk') },
        { icon: <Palette size={16} />, label: "Toggle Glassmorphism", action: () => setGlassmorphism(!glassmorphism) },
      ]
    }
  ];

  const filtered = search
    ? commands.map(group => ({
        ...group,
        items: group.items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
      })).filter(group => group.items.length > 0)
    : commands;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center px-4 py-3 border-b border-border">
            <input
              type="text"
              autoFocus
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
            />
            <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No results found.
              </div>
            ) : (
              filtered.map((group, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group.group}
                  </div>
                  {group.items.map((item, j) => (
                    <button
                      key={j}
                      onClick={() => { item.action(); onClose(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-foreground transition-colors text-sm font-medium text-left"
                    >
                      <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
