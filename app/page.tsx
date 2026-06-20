"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  const openPad = () => {
    if (!keyword.trim()) return;
    router.push(`/${keyword.trim()}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-500 relative overflow-hidden">
      {/* Deep premium background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 dark:bg-purple-600/20 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <header className="w-full flex justify-end p-6 absolute top-0 z-10">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 relative z-10 animate-fade-in-up">
        <div className="w-full max-w-lg bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-14 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col items-center text-center relative overflow-hidden group">
          
          {/* Glass highlight effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/80 dark:to-indigo-800/40 text-indigo-600 dark:text-indigo-300 p-4 rounded-full relative border border-indigo-200/50 dark:border-indigo-700/50 shadow-inner">
              <Sparkles size={32} strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter mb-3 bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent drop-shadow-sm">
            PadX
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold mb-5 text-indigo-600 dark:text-indigo-400 tracking-tight">
            Private Pad by HEMU
          </h2>
          <p className="text-base sm:text-lg mb-10 text-slate-500 dark:text-slate-400 max-w-md font-medium leading-relaxed">
            Create, access, and manage your private cloud pads with state-of-the-art security and design.
          </p>

          <div className="w-full flex flex-col gap-5 relative z-10">
            <div className="relative group/input">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && openPad()}
                placeholder="Enter pad keyword"
                className="w-full p-5 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 focus:border-indigo-500/50 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none text-lg transition-all text-center text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 shadow-inner backdrop-blur-md font-medium"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/5 pointer-events-none group-focus-within/input:ring-0" />
            </div>

            <button
              onClick={openPad}
              className="w-full group/btn p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Access Pad
              <ArrowRight size={20} className="opacity-80 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}