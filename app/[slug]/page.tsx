"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [text, setText] = useState("");

  useEffect(() => {
    const loadNote = async () => {
      const ref = doc(db, "notes", slug);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setText(snap.data().content || "");
      }
    };

    loadNote();
  }, [slug]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      await setDoc(doc(db, "notes", slug), {
        content: text,
        updatedAt: new Date()
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, slug]);

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