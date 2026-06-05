"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";

export default function OneTimeFilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLink = async () => {
      const linkRef = doc(db, "oneTimeFileLinks", id);
      const linkSnap = await getDoc(linkRef);

      if (!linkSnap.exists()) {
        setError("This link does not exist.");
        return;
      }

      const data = linkSnap.data();

      if (data.used) {
        const createdTime = new Date(data.createdAt).getTime();
        const now = Date.now();
        // Allow a 10-second grace period for React Strict Mode double-firing
        if (now - createdTime > 10000) {
          setError("This one-time link has already been used and is now expired.");
          return;
        }
      }

      const fileRef = doc(db, "files", data.fileId);
      const fileSnap = await getDoc(fileRef);

      if (!fileSnap.exists()) {
        setError("The file associated with this link has been deleted.");
        await setDoc(linkRef, { ...data, used: true });
        return;
      }

      setFileUrl(fileSnap.data().downloadUrl);
      await setDoc(linkRef, { ...data, used: true });

      // If the file itself is marked as Burn After Read, wipe it from everywhere
      if (fileSnap.data().isBurnAfterRead) {
        await deleteDoc(fileRef);
      }
    };

    fetchLink();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center font-sans p-6 text-center">
        <ThemeToggle />
        <h1 className="text-4xl font-extrabold mb-4 mt-8 text-red-500">Expired Link</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold hover:opacity-90"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <p className="animate-pulse">Accessing secure file...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="w-full flex items-center justify-between p-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">Secure One-Time File</h1>
        <ThemeToggle />
      </header>
      <main className="flex-1 w-full bg-gray-100 dark:bg-black">
        <iframe src={fileUrl} className="w-full h-full border-none" />
      </main>
    </div>
  );
}
