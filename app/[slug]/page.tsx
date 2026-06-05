"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Saved");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    const loadPad = async () => {
      const settingsRef = doc(db, "padSettings", slug);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();

        if (settings.selfDelete && settings.deleteAt) {
          if (new Date() >= new Date(settings.deleteAt)) {
            await deleteDoc(doc(db, "notes", slug));
            await deleteDoc(doc(db, "padSettings", slug));
            router.push("/");
            return;
          }
        }

        if (settings.locked) {
          const unlocked = sessionStorage.getItem(`unlocked-${slug}`);

          if (!unlocked) {
            router.push(`/locked/${slug}`);
            return;
          }
        }
      }

      const ref = doc(db, "notes", slug);

      const unsubscribe = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const savedText = snap.data().content || "";

          if (firstLoad.current) {
            setText(savedText);
            firstLoad.current = false;
            setInitialLoadComplete(true);
          }
        } else {
          firstLoad.current = false;
          setInitialLoadComplete(true);
        }

        setLoaded(true);
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;

    loadPad().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [slug, router]);

  useEffect(() => {
    if (!loaded || firstLoad.current || !initialLoadComplete) return;

    setStatus("Saving...");

    const timeout = setTimeout(async () => {
      try {
        await setDoc(doc(db, "notes", slug), {
          content: text,
          updatedAt: new Date(),
        });

        setStatus("Saved");
      } catch {
        setStatus("Sync Error");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, slug, loaded, initialLoadComplete]);

  useEffect(() => {
    const handleShortcuts = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();

        setStatus("Saving...");

        setDoc(doc(db, "notes", slug), {
          content: text,
          updatedAt: new Date(),
        })
          .then(() => setStatus("Saved"))
          .catch(() => setStatus("Sync Error"));
      }

      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const nextPad = prompt("Enter pad keyword:");
        if (nextPad) router.push(`/${nextPad}`);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        navigator.clipboard.writeText(text);
      }

      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        router.push("/admin");
      }

      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();

        const password = prompt("Set a password for this pad:");

        if (!password) return;

        setDoc(doc(db, "padSettings", slug), {
          ...(await getDoc(doc(db, "padSettings", slug))).data(),
          locked: true,
          password,
        })
          .then(() => alert("Pad locked successfully."))
          .catch(() => alert("Failed to lock pad."));
      }

      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();

        const minutes = prompt("Delete this pad after how many minutes?");

        if (!minutes) return;

        const deleteAt = new Date(Date.now() + Number(minutes) * 60000);

        setDoc(doc(db, "padSettings", slug), {
          ...(await getDoc(doc(db, "padSettings", slug))).data(),
          selfDelete: true,
          deleteAt: deleteAt.toISOString(),
        })
          .then(() => alert("Self-delete timer set successfully."))
          .catch(() => alert("Failed to set self-delete timer."));
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [text, router, slug]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col items-center font-sans">
      <header className="w-full max-w-[1100px] flex items-center justify-between p-4 sm:p-6 mb-2">
        <h1 
          onClick={() => router.push("/")}
          className="text-2xl font-extrabold cursor-pointer hover:opacity-80 transition-opacity"
        >
          PadX
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${status === 'Saved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : status === 'Saving...' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {status === "Saved" ? "✓ Saved" : status === "Saving..." ? "⟳ Saving..." : "⚠ Sync Error"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full max-w-[1100px] px-4 sm:px-6 flex-1 flex flex-col">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          # {slug}
        </h2>

        <div className="flex-1 w-full bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl p-6 sm:p-10 mb-8 flex flex-col transition-all duration-300">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing..."
            className="w-full flex-1 bg-transparent outline-none text-lg sm:text-xl leading-relaxed resize-none"
          />
          <div className="mt-6 pt-4 border-t border-border flex justify-end text-sm font-medium text-gray-500 dark:text-gray-400">
            {wordCount} words • {charCount} chars
          </div>
        </div>
      </main>
    </div>
  );
}