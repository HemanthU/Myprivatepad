"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColor, glassmorphism, glassBlur, glassOpacity, wallpaper, wallpaperBlur, wallpaperOpacity, wallpaperBrightness, writingFont, codeFont, fontSize, lineHeight, letterSpacing } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Apply theme
    root.setAttribute("data-theme", theme);
    
    // In Tailwind v4, we use the .dark class for basic dark mode
    if (['dark', 'amoled', 'dracula', 'cyberpunk'].includes(theme)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply accent color
    root.style.setProperty("--color-accent", accentColor);
    
    // Apply Glassmorphism
    if (glassmorphism) {
      root.style.setProperty("--glass-blur", `${glassBlur}px`);
      root.style.setProperty("--glass-opacity", `${glassOpacity}`);
      root.classList.add("glass-mode");
    } else {
      root.style.removeProperty("--glass-blur");
      root.style.removeProperty("--glass-opacity");
      root.classList.remove("glass-mode");
    }

    // Apply Typography
    root.style.setProperty("--font-writing", `"${writingFont}", sans-serif`);
    root.style.setProperty("--font-code", `"${codeFont}", monospace`);
    root.style.setProperty("--app-font-size", `${fontSize}px`);
    root.style.setProperty("--app-line-height", `${lineHeight}`);
    root.style.setProperty("--app-letter-spacing", `${letterSpacing}px`);

  }, [mounted, theme, accentColor, glassmorphism, glassBlur, glassOpacity, writingFont, codeFont, fontSize, lineHeight, letterSpacing]);

  if (!mounted) return <>{children}</>;

  return (
    <>
      {/* Optional Wallpaper Layer */}
      {wallpaper && (
        <div 
          className="fixed inset-0 z-[-2] w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-500"
          style={{ 
            backgroundImage: `url(${wallpaper})`,
            filter: `blur(${wallpaperBlur}px) brightness(${wallpaperBrightness}%)`,
            opacity: wallpaperOpacity / 100
          }}
        />
      )}
      {children}
    </>
  );
}
