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

type PadData = {
  name: string;
  locked: boolean;
  selfDelete: boolean;
  deleteAt?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [pads, setPads] = useState<PadData[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadPads = async () => {
      const snapshot = await getDocs(collection(db, "notes"));

      const padList = await Promise.all(
        snapshot.docs.map(async (noteDoc) => {
          const padName = noteDoc.id;

          const settingsSnap = await getDoc(doc(db, "padSettings", padName));

          const settings = settingsSnap.exists()
            ? settingsSnap.data()
            : {};

          return {
            name: padName,
            locked: settings.locked || false,
            selfDelete: settings.selfDelete || false,
            deleteAt: settings.deleteAt || "",
          };
        })
      );

      setPads(padList);
    };

    loadPads();
  }, []);

  const filteredPads = pads.filter((pad) =>
    pad.name.toLowerCase().includes(search.toLowerCase())
  );

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
    location.reload();
  };

  const unlockPad = async (padName: string) => {
    const settingsSnap = await getDoc(doc(db, "padSettings", padName));

    if (!settingsSnap.exists()) return;

    const settings = settingsSnap.data();

    await setDoc(doc(db, "padSettings", padName), {
      ...settings,
      locked: false,
      password: "",
    });

    alert("Pad unlocked successfully.");
    location.reload();
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
      location.reload();
    }

    if (action === "remove") {
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));

      if (!settingsSnap.exists()) return;

      const settings = settingsSnap.data();

      await setDoc(doc(db, "padSettings", padName), {
        ...settings,
        selfDelete: false,
        deleteAt: "",
      });

      alert("Self-delete removed.");
      location.reload();
    }
  };

  const deletePad = async (padName: string) => {
    const confirmDelete = confirm(
      `Delete "${padName}" permanently?`
    );

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "notes", padName));
    await deleteDoc(doc(db, "padSettings", padName));

    setPads((prev) => prev.filter((pad) => pad.name !== padName));
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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search pads..."
        className="w-full max-w-md p-4 rounded-xl bg-gray-900 outline-none mb-6"
      />

      <div className="flex flex-col gap-4">
        {filteredPads.length === 0 && (
          <p className="text-gray-400">No pads found.</p>
        )}

        {filteredPads.map((pad) => (
          <div
            key={pad.name}
            className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold break-all">
                {pad.name}
              </h2>

              {pad.locked && (
                <span className="text-sm bg-blue-800 px-2 py-1 rounded">
                  Locked
                </span>
              )}

              {pad.selfDelete && (
                <span className="text-sm bg-yellow-700 px-2 py-1 rounded">
                  Self-Delete
                </span>
              )}
            </div>

            {pad.selfDelete && pad.deleteAt && (
              <p className="text-sm text-yellow-400">
                Deletes at: {new Date(pad.deleteAt).toLocaleString()}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => managePad(pad.name)}
                className="px-4 py-2 rounded-lg bg-white text-black"
              >
                Open
              </button>

              <button
                onClick={() => lockPad(pad.name)}
                className="px-4 py-2 rounded-lg bg-blue-700"
              >
                Lock
              </button>

              <button
                onClick={() => unlockPad(pad.name)}
                className="px-4 py-2 rounded-lg bg-green-700"
              >
                Unlock
              </button>

              <button
                onClick={() => selfDeleteControls(pad.name)}
                className="px-4 py-2 rounded-lg bg-yellow-700"
              >
                Self-Delete
              </button>

              <button
                onClick={() => deletePad(pad.name)}
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