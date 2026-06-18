"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import { Lock, ArrowRight } from "lucide-react";

export default function LockedPadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [password, setPassword] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const unlockPad = async () => {
    const settingsRef = doc(db, "padSettings", slug);
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      alert("No lock settings found.");
      return;
    }

    const settings = settingsSnap.data();

    if (password === settings.password) {
      sessionStorage.setItem(`unlocked-${slug}`, "true");
      router.push(`/${slug}`);
    } else if (settings.decoyPassword && password === settings.decoyPassword) {
      sessionStorage.setItem(`decoy-unlocked-${slug}`, "true");
      router.push(`/${slug}`);
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-500 relative overflow-hidden">
      {/* Premium Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <header className="w-full flex justify-end p-6 absolute top-0 z-10">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 relative z-10 animate-fade-in-up">
        <div className={`w-full max-w-md bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 sm:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col items-center text-center ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/80 dark:to-blue-800/40 text-blue-600 dark:text-blue-300 p-5 rounded-full relative border border-blue-200/50 dark:border-blue-700/50 shadow-inner">
              <Lock size={44} strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Secure Pad
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm font-medium">
            This workspace is end-to-end encrypted.
          </p>

          <div className="w-full flex flex-col gap-5 relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlockPad()}
              placeholder="Enter passcode"
              className="w-full p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-gray-200/80 dark:border-white/5 focus:border-blue-400/50 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 outline-none text-lg transition-all text-center text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 shadow-inner backdrop-blur-md"
            />

            <button
              onClick={unlockPad}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 text-white dark:text-black font-semibold text-lg hover:opacity-95 active:scale-[0.98] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Unlock Workspace
              <ArrowRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}