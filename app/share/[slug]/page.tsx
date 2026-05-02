"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SharePadPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [text, setText] = useState("");

  useEffect(() => {
    const loadPad = async () => {
      const ref = doc(db, "notes", slug);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setText(snap.data().content || "");
      }
    };

    loadPad();
  }, [slug]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Read-Only Pad: {slug}</h1>

      <textarea
        value={text}
        readOnly
        className="w-full h-[80vh] bg-gray-900 rounded-xl p-4 outline-none"
      />
    </main>
  );
}