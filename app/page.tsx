"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import PadTypeSelector, { PadType } from "@/components/pad/PadTypeSelector";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [padType, setPadType] = useState<PadType>('text');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const router = useRouter();

  const openPad = async () => {
    if (!keyword.trim()) return;
    const slug = keyword.trim();
    // Store the pad type in padSettings if creating with a non-default type
    if (padType !== 'text') {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'padSettings', slug));
        if (!snap.exists()) {
          // New pad — set type
          await setDoc(doc(db, 'padSettings', slug), { type: padType }, { merge: true });
        }
      } catch { /* non-fatal */ }
    }
    router.push(`/${slug}`);
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
              onKeyDown={(e) => e.key === 'Enter' && openPad()}
              placeholder="Enter pad keyword"
              className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-transparent focus:border-gray-400 dark:focus:border-gray-500 outline-none text-lg transition-all text-center text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
            />

            <button
              type="button"
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <span className="font-medium">Pad Type</span>
              <span className="flex items-center gap-2">
                {padType === 'text' && '📄 Text'}
                {padType === 'checklist' && '✅ Checklist'}
                {padType === 'markdown' && '📝 Markdown'}
                {padType === 'code' && '💻 Code'}
                {padType === 'journal' && '📓 Journal'}
                <span className="text-gray-400">{showTypeSelector ? '▲' : '▼'}</span>
              </span>
            </button>

            {showTypeSelector && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-lg">
                <PadTypeSelector value={padType} onChange={(t) => { setPadType(t); setShowTypeSelector(false); }} />
              </div>
            )}

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
