"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import { Lock } from "lucide-react";

export default function LockedPadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [password, setPassword] = useState("");

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
      alert("Incorrect password");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300 relative">
      <header className="w-full flex justify-end p-4 sm:p-6 absolute top-0">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] transition-all duration-300 flex flex-col items-center text-center">
          
          <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-4 rounded-full mb-6">
            <Lock size={40} />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Locked Pad
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            This pad is protected by a password.
          </p>

          <div className="w-full flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlockPad()}
              placeholder="Enter password"
              className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-transparent focus:border-gray-400 dark:focus:border-gray-500 outline-none text-lg transition-all text-center text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
            />

            <button
              onClick={unlockPad}
              className="w-full p-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold text-lg hover:opacity-90 active:scale-[0.98] shadow-lg hover:shadow-xl transition-all"
            >
              Unlock
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}