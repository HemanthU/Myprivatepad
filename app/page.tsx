"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const router = useRouter();

  const openPad = () => {
    if (!keyword.trim()) return;
    router.push(`/${keyword.trim()}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300 relative">
      <header className="w-full flex justify-end p-4 sm:p-6 absolute top-0">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-all duration-300 flex flex-col items-center text-center">
          
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            PadX
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
            Private Pad by HEMU
          </h2>
          <p className="text-base sm:text-lg mb-8 text-gray-500 dark:text-gray-400 max-w-md">
            Create, access, and manage your private cloud pads.
          </p>

          <div className="w-full flex flex-col gap-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openPad()}
              placeholder="Enter pad keyword"
              className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-transparent focus:border-gray-400 dark:focus:border-gray-500 outline-none text-lg transition-all text-center text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
            />

            <button
              onClick={openPad}
              className="w-full p-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold text-lg hover:opacity-90 active:scale-[0.98] shadow-lg hover:shadow-xl transition-all"
            >
              Open Pad
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}