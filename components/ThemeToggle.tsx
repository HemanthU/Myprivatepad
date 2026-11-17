"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function ThemeToggle() {
  const { theme, setTheme, setEditorTheme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-xl text-foreground opacity-50" aria-label="Toggle Page Theme">
        <Sun size={18} />
      </button>
    );
  }

  const isDark = theme !== "light";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    setEditorTheme(next);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl glass-frosted hover:glass-clear border border-white/10 dark:border-white/10 border-black/10 transition-colors text-foreground flex items-center justify-center shadow-sm"
      aria-label="Toggle Page Theme"
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
