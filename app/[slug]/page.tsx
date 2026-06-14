"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import PadFiles from "@/components/PadFiles";

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Saved");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    const loadPad = async () => {
      const settingsRef = doc(db, "padSettings", slug);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();

        if (settings.isTrashed) {
          router.push("/");
          return;
        }

        if (settings.timeLocked && settings.unlockAt) {
          if (new Date() < new Date(settings.unlockAt)) {
            setUnlockDate(settings.unlockAt);
            setLoaded(true);
            return;
          }
        }

        if (settings.shadowMode) {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get("shadow") !== settings.shadowKey) {
            router.push("/");
            return;
          }
        }

        const currentOpens = settings.totalOpens || 0;
        await setDoc(settingsRef, {
          ...settings,
          lastOpened: new Date().toISOString(),
          totalOpens: currentOpens + 1
        });

        if (settings.burnAfterRead && currentOpens >= 1) {
          const noteSnap = await getDoc(doc(db, "notes", slug));
          if (noteSnap.exists()) setText(noteSnap.data().content || "");
          
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const q = query(collection(db, "files"), where("padId", "==", slug));
          const filesSnap = await getDocs(q);
          for (const fileDoc of filesSnap.docs) {
            await deleteDoc(fileDoc.ref);
          }

          await deleteDoc(doc(db, "notes", slug));
          await deleteDoc(doc(db, "padSettings", slug));
          setIsBurned(true);
          setLoaded(true);
          firstLoad.current = false;
          setInitialLoadComplete(true);
          return;
        }

        if (settings.selfDelete && settings.deleteAt) {
          if (new Date() >= new Date(settings.deleteAt)) {
            const { collection, query, where, getDocs } = await import("firebase/firestore");
            const q = query(collection(db, "files"), where("padId", "==", slug));
            const filesSnap = await getDocs(q);
            for (const fileDoc of filesSnap.docs) {
              await deleteDoc(fileDoc.ref);
            }

            await deleteDoc(doc(db, "notes", slug));
            await deleteDoc(doc(db, "padSettings", slug));
            router.push("/");
            return;
          }
        }

        if (settings.locked) {
          const unlocked = sessionStorage.getItem(`unlocked-${slug}`);
          const decoyUnlocked = sessionStorage.getItem(`decoy-unlocked-${slug}`);

          if (!unlocked && !decoyUnlocked) {
            router.push(`/locked/${slug}`);
            return;
          }

          if (decoyUnlocked) {
            setIsDecoyMode(true);
            setText(settings.decoyContent || "");
            setLoaded(true);
            firstLoad.current = false;
            setInitialLoadComplete(true);
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
    if (!loaded || firstLoad.current || !initialLoadComplete || isBurned) return;

    setStatus("Saving...");

    const timeout = setTimeout(async () => {
      try {
        if (isDecoyMode) {
          const settingsSnap = await getDoc(doc(db, "padSettings", slug));
          if (settingsSnap.exists()) {
            await setDoc(doc(db, "padSettings", slug), {
              ...settingsSnap.data(),
              decoyContent: text
            });
          }
        } else {
          await setDoc(doc(db, "notes", slug), {
            content: text,
            updatedAt: new Date(),
          });
        }
        setStatus("Saved");
      } catch {
        setStatus("Sync Error");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, slug, loaded, initialLoadComplete, isDecoyMode, isBurned]);

  useEffect(() => {
    const handleShortcuts = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isBurned) return;

        setStatus("Saving...");

        try {
          if (isDecoyMode) {
            const settingsSnap = await getDoc(doc(db, "padSettings", slug));
            if (settingsSnap.exists()) {
              await setDoc(doc(db, "padSettings", slug), {
                ...settingsSnap.data(),
                decoyContent: text
              });
            }
          } else {
            await setDoc(doc(db, "notes", slug), {
              content: text,
              updatedAt: new Date(),
            });
          }
          setStatus("Saved");
        } catch {
          setStatus("Sync Error");
        }
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

        const snap = await getDoc(doc(db, "padSettings", slug));
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          locked: true,
          password,
        });
        alert("Pad locked successfully.");
      }

      if (e.ctrlKey && e.key.toLowerCase() === "x" && !e.shiftKey) {
        e.preventDefault();
        const minutes = prompt("Delete this pad after how many minutes?");
        if (!minutes) return;

        const deleteAt = new Date(Date.now() + Number(minutes) * 60000);
        const snap = await getDoc(doc(db, "padSettings", slug));

        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          selfDelete: true,
          deleteAt: deleteAt.toISOString(),
        });
        alert("Self-delete timer set successfully.");
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        if (data.timeLocked) {
          await setDoc(doc(db, "padSettings", slug), { ...data, timeLocked: false, unlockAt: "" });
          alert("Time lock removed.");
        } else {
          const hours = prompt("Lock for how many hours?");
          if (!hours) return;
          const unlockAt = new Date(Date.now() + Number(hours) * 3600000).toISOString();
          await setDoc(doc(db, "padSettings", slug), { ...data, timeLocked: true, unlockAt });
          alert("Time lock set.");
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const decoyPassword = prompt("Enter decoy password:");
        if (!decoyPassword) return;
        const decoyContent = prompt("Enter fake content to show:");
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          decoyPassword,
          decoyContent
        });
        alert("Decoy password and content set.");
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        await setDoc(doc(db, "padSettings", slug), { ...data, ghostMode: !data.ghostMode });
        alert(data.ghostMode ? "Ghost mode disabled." : "Ghost mode enabled.");
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        if (data.shadowMode) {
          await setDoc(doc(db, "padSettings", slug), { ...data, shadowMode: false, shadowKey: "" });
          alert("Shadow mode disabled.");
        } else {
          const key = prompt("Enter secret shadow key:");
          if (!key) return;
          await setDoc(doc(db, "padSettings", slug), { ...data, shadowMode: true, shadowKey: key });
          alert("Shadow mode enabled. Access via ?shadow=" + key);
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        await setDoc(doc(db, "padSettings", slug), { ...data, burnAfterRead: !data.burnAfterRead });
        alert(data.burnAfterRead ? "Burn After Read disabled." : "Burn After Read enabled.");
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        const id = Math.random().toString(36).substring(2, 10);
        await setDoc(doc(db, "oneTimeLinks", id), {
          padName: slug,
          used: false,
          createdAt: new Date().toISOString()
        });
        const url = `${window.location.origin}/o/${id}`;
        navigator.clipboard.writeText(url);
        alert(`One-time link copied to clipboard:\n${url}`);
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const confirmTrash = confirm("Move this pad to trash?");
        if (!confirmTrash) return;
        const snap = await getDoc(doc(db, "padSettings", slug));
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          isTrashed: true,
          deletedAt: new Date().toISOString()
        });
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [text, router, slug, isDecoyMode, isBurned]);

  if (unlockDate) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center font-sans p-6 text-center transition-colors duration-300">
        <ThemeToggle />
        <h1 className="text-4xl font-extrabold mb-4 mt-8">Time Locked ⏳</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">
          This pad will unlock on {new Date(unlockDate).toLocaleString()}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold hover:opacity-90"
        >
          Return Home
        </button>
      </div>
    );
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const [activeTab, setActiveTab] = useState<"notes" | "files">("notes");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col items-center font-sans relative">
      {isBurned && (
        <div className="w-full bg-red-600 text-white py-2 text-center text-sm font-semibold z-50 shadow-md">
          🔥 Burn After Read active: This pad has been deleted from the server. It will vanish forever when you leave this page.
        </div>
      )}
      <header className="w-full max-w-[1400px] flex items-center justify-between p-4 sm:p-8 mb-2">
        <h1 
          onClick={() => router.push("/")}
          className="text-2xl font-extrabold cursor-pointer hover:opacity-80 transition-opacity"
        >
          PadX
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${status === 'Saved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : status === 'Saving...' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {isBurned ? "🔥 Burned" : status === "Saved" ? "✓ Saved" : status === "Saving..." ? "⟳ Saving..." : "⚠ Sync Error"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full max-w-[1400px] px-4 sm:px-8 flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200">
            # {slug} {isDecoyMode && <span className="text-sm font-normal text-gray-500">(Decoy)</span>}
          </h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'notes' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'files' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Files
            </button>
          </div>
        </div>

        {activeTab === "notes" ? (
          <div className="flex-1 w-full min-h-[70vh] bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl p-6 sm:p-12 mb-8 flex flex-col transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.5)]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing..."
              readOnly={isBurned}
              className="w-full flex-1 bg-transparent outline-none text-lg sm:text-xl leading-relaxed resize-none"
            />
            <div className="mt-6 pt-4 border-t border-border flex justify-end text-sm font-medium text-gray-500 dark:text-gray-400">
              {wordCount} words • {charCount} chars
            </div>
          </div>
        ) : (
          <PadFiles slug={slug} isLocked={!!sessionStorage.getItem(`unlocked-${slug}`)} />
        )}
      </main>
    </div>
  );
}