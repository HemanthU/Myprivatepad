"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
      router.push(`/${slug}`);
    } else {
      alert("Incorrect password");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6">Locked Pad</h1>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
        className="w-full max-w-md p-4 rounded-xl bg-gray-900 outline-none mb-4"
      />

      <button
        onClick={unlockPad}
        className="w-full max-w-md p-4 rounded-xl bg-white text-black font-semibold"
      >
        Unlock Pad
      </button>
    </main>
  );
}