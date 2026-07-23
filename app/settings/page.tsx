"use client";

import React from "react";
import AppearanceSettings from "@/components/Settings/AppearanceSettings";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/")}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Global Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold mb-2">Appearance</h2>
          <p className="text-gray-500 mb-8">Customize how PadX looks and feels across all your devices.</p>
          
          <AppearanceSettings />
        </div>
      </main>
    </div>
  );
}
