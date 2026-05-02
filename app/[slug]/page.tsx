"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Saved");
  const firstLoad = useRef(true);

  useEffect(() => {
    const ref = doc(db, "notes", slug);

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const savedText = snap.data().content || "";

        if (firstLoad.current) {
          setText(savedText);
          firstLoad.current = false;
        }
      }

      setLoaded(true);
    });

    return () => unsubscribe();
  }, [slug]);

  useEffect(() => {
    if (!loaded || firstLoad.current) return;

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
  }, [text, slug, loaded]);

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
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
        alert("Pad lock feature coming in next step.");
      }

      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        alert("Self-delete feature coming in next step.");
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