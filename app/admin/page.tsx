"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminPage() {
  const router = useRouter();
  const [pads, setPads] = useState<string[]>([]);

  useEffect(() => {
    const loadPads = async () => {
      const snapshot = await getDocs(collection(db, "notes"));
      const names = snapshot.docs.map((doc) => doc.id);
      setPads(names);
    };

    loadPads();
  }, []);

  const managePad = async (padName: string) => {
    router.push(`/${padName}`);
  };

  const lockPad = async (padName: string) => {
    const password = prompt(`Set password for "${padName}":`);

    if (!password) return;

    await setDoc(doc(db, "padSettings", padName), {
      ...(await getDoc(doc(db, "padSettings", padName))).data(),
      locked: true,
      password,
    });

    alert("Pad locked successfully.");
  };

  const unlockPad = async (padName: string) => {
    const settingsSnap = await getDoc(doc(db, "padSettings", padName));

    if (!settingsSnap.exists()) {
      alert("No settings found.");
      return;
    }

    const settings = settingsSnap.data();

    await setDoc(doc(db, "padSettings", padName), {
      ...settings,
      locked: false,
      password: "",
    });

    alert("Pad unlocked successfully.");
  };

  const selfDeleteControls = async (padName: string) => {
    const action = prompt(
      "Type:\nset → Set self-delete timer\nremove → Remove self-delete"
    );

    if (action === "set") {
      const minutes = prompt("Delete after how many minutes?");

      if (!minutes) return;

      const deleteAt = new Date(Date.now() + Number(minutes) * 60000);

      await setDoc(doc(db, "padSettings", padName), {
        ...(await getDoc(doc(db, "padSettings", padName))).data(),
        selfDelete: true,
        deleteAt: deleteAt.toISOString(),
      });

      alert("Self-delete timer updated.");
    }

    if (action === "remove") {
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));

      if (!settingsSnap.exists()) {
        alert("No settings found.");
        return;
      }

      const settings = settingsSnap.data();

      await setDoc(doc(db, "padSettings", padName), {
        ...settings,
        selfDelete: false,
        deleteAt: "",
      });

      alert("Self-delete removed.");
    }
  };

  const deletePad = async (padName: string) => {
    const confirmDelete = confirm(
      `Delete "${padName}" permanently? This cannot be undone.`
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "notes", padName));
    await deleteDoc(doc(db, "padSettings", padName));

    setPads((prev) => prev.filter((pad) => pad !== padName));

    alert("Pad deleted permanently.");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Private Admin Dashboard</h1>

      <button
        onClick={() => router.push("/")}
        className="mb-6 p-4 rounded-xl bg-white text-black font-semibold"
      >
        Homepage
      </button>

      <div className="flex flex-col gap-4">
        {pads.map((pad) => (
          <div
            key={pad}
            className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3"
          >
            <h2 className="text-xl font-semibold break-all">{pad}</h2>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => managePad(pad)}
                className="px-4 py-2 rounded-lg bg-white text-black"
              >
                Open
              </button>

              <button
                onClick={() => lockPad(pad)}
                className="px-4 py-2 rounded-lg bg-blue-700"
              >
                Lock
              </button>

              <button
                onClick={() => unlockPad(pad)}
                className="px-4 py-2 rounded-lg bg-green-700"
              >
                Unlock
              </button>

              <button
                onClick={() => selfDeleteControls(pad)}
                className="px-4 py-2 rounded-lg bg-yellow-700"
              >
                Self-Delete
              </button>

              <button
                onClick={() => deletePad(pad)}
                className="px-4 py-2 rounded-lg bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}