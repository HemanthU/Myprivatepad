"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";

export default function OneTimeUrlPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [padName, setPadName] = useState("");

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const linkRef = doc(db, "oneTimeLinks", id);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
          setError("This one-time link does not exist.");
          setLoading(false);
          return;
        }

        const linkData = linkSnap.data();

        if (linkData.used) {
          setError("This one-time link has already been used and is no longer valid.");
          setLoading(false);
          return;
        }

        // Mark as used immediately to prevent multiple access
        await setDoc(linkRef, { ...linkData, used: true, usedAt: new Date().toISOString() });

        // Fetch pad content
        setPadName(linkData.padName);
        const noteSnap = await getDoc(doc(db, "notes", linkData.padName));
        
        if (noteSnap.exists()) {
          setContent(noteSnap.data().content || "");
        } else {
          setContent("Pad is empty or does not exist.");
        }
        
        setLoading(false);
      } catch (err) {
        setError("An error occurred while fetching the link.");
        setLoading(false);
      }
    };

    fetchLink();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-xl animate-pulse">Verifying secure link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <ThemeToggle />
        <h1 className="text-4xl font-extrabold mb-4 mt-8 text-red-500">Access Denied</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">{error}</p>
        <button onClick={() => router.push("/")} className="mt-8 px-6 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col items-center font-sans">
      <header className="w-full max-w-[1100px] flex items-center justify-between p-4 sm:p-6 mb-2">
        <h1 onClick={() => router.push("/")} className="text-2xl font-extrabold cursor-pointer hover:opacity-80">PadX</h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            One-Time Read Only
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="w-full max-w-[1100px] px-4 sm:px-6 flex-1 flex flex-col">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          # {padName}
        </h2>
        <div className="flex-1 w-full bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl p-6 sm:p-10 mb-8 flex flex-col">
          <textarea
            value={content}
            readOnly
            className="w-full flex-1 bg-transparent outline-none text-lg sm:text-xl leading-relaxed resize-none"
          />
        </div>
      </main>
    </div>
  );
}
