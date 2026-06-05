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
import { Lock, Unlock, Trash, Clock, ExternalLink, Settings, Home, Search, FileText } from "lucide-react";

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

  const totalPads = pads.length;
  const lockedPads = pads.filter(p => p.locked).length;
  const selfDeletePads = pads.filter(p => p.selfDelete).length;
  const trashCount = 0; // Placeholder as requested

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans pb-12">
      <header className="w-full border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Home size={18} />
          <span>Home</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
              <FileText size={20} />
              <h3 className="font-medium">Total Pads</h3>
            </div>
            <p className="text-4xl font-bold">{totalPads}</p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2 text-blue-500">
              <Lock size={20} />
              <h3 className="font-medium">Locked Pads</h3>
            </div>
            <p className="text-4xl font-bold">{lockedPads}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2 text-yellow-500">
              <Clock size={20} />
              <h3 className="font-medium">Self-Delete Active</h3>
            </div>
            <p className="text-4xl font-bold">{selfDeletePads}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2 text-red-500">
              <Trash size={20} />
              <h3 className="font-medium">Trash Count</h3>
            </div>
            <p className="text-4xl font-bold">{trashCount}</p>
          </div>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pads..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:border-gray-400 dark:focus:border-gray-500 outline-none shadow-sm transition-all text-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPads.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-12 text-lg">No pads found.</p>
          )}

          {filteredPads.map((pad) => (
            <div
              key={pad.name}
              className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold break-all flex-1 pr-4 line-clamp-1">
                  {pad.name}
                </h2>
                <div className="flex flex-col gap-2 shrink-0">
                  {pad.locked && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <Lock size={12} /> Locked
                    </span>
                  )}
                  {pad.selfDelete && (
                    <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <Clock size={12} /> Self-Delete
                    </span>
                  )}
                </div>
              </div>

              {pad.selfDelete && pad.deleteAt && (
                <div className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-4 flex items-center gap-1.5">
                  <Clock size={14} />
                  Deletes at: {new Date(pad.deleteAt).toLocaleString()}
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-border flex flex-wrap gap-2">
                <button
                  onClick={() => managePad(pad.name)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
                  title="Open Pad"
                >
                  <ExternalLink size={20} />
                </button>

                <button
                  onClick={() => pad.locked ? unlockPad(pad.name) : lockPad(pad.name)}
                  className={`p-2 rounded-xl transition-colors ${pad.locked ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60'}`}
                  title={pad.locked ? "Unlock Pad" : "Lock Pad"}
                >
                  {pad.locked ? <Unlock size={20} /> : <Lock size={20} />}
                </button>

                <button
                  onClick={() => selfDeleteControls(pad.name)}
                  className="p-2 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 dark:hover:bg-yellow-900/60 transition-colors"
                  title="Self-Delete Controls"
                >
                  <Settings size={20} />
                </button>

                <button
                  onClick={() => deletePad(pad.name)}
                  className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 transition-colors ml-auto"
                  title="Delete Pad Permanently"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}