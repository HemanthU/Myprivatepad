"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
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

    const timeout = setTimeout(async () => {
      await setDoc(doc(db, "notes", slug), {
        content: text,
        updatedAt: new Date(),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, slug, loaded]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Pad: {slug}</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start typing..."
        className="w-full h-[80vh] bg-gray-900 rounded-xl p-4 outline-none"
      />
    </main>
  );
}