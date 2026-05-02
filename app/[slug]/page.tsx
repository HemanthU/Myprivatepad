"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold break-all">Pad: {slug}</h1>
        <span className="text-sm text-gray-400">{status}</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start typing..."
        className="w-full h-[80vh] sm:h-[85vh] bg-gray-900 rounded-xl p-4 outline-none text-base sm:text-lg"
      />
    </main>
  );
}