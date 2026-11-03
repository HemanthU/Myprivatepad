"use client";

import { useEffect, useState } from "react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsVisible(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[100] glass-frosted/80 backdrop-blur-xl border border-border rounded-3xl p-4 shadow-2xl flex items-center gap-4 transition-all duration-300">
      <span className="text-foreground font-medium text-sm sm:text-base whitespace-nowrap">Install PadX for offline access!</span>
      <button
        onClick={handleInstallClick}
        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Install
      </button>
    </div>
  );
}
