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
import { Lock, Unlock, Trash, Clock, ExternalLink, Settings, Home, Search, FileText, EyeOff, Flame, Link as LinkIcon, RefreshCw, Ghost } from "lucide-react";

type PadData = {
  name: string;
  locked: boolean;
  selfDelete: boolean;
  deleteAt?: string;
  isTrashed?: boolean;
  ghostMode?: boolean;
  shadowMode?: boolean;
  timeLocked?: boolean;
  totalOpens?: number;
  lastOpened?: string;
  burnAfterRead?: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [pads, setPads] = useState<PadData[]>([]);
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    const loadPads = async () => {
      const snapshot = await getDocs(collection(db, "notes"));

      const padList = await Promise.all(
        snapshot.docs.map(async (noteDoc) => {
          const padName = noteDoc.id;
          const settingsSnap = await getDoc(doc(db, "padSettings", padName));
          const settings = settingsSnap.exists() ? settingsSnap.data() : {};

          return {
            name: padName,
            locked: settings.locked || false,
            selfDelete: settings.selfDelete || false,
            deleteAt: settings.deleteAt || "",
            isTrashed: settings.isTrashed || false,
            ghostMode: settings.ghostMode || false,
            shadowMode: settings.shadowMode || false,
            timeLocked: settings.timeLocked || false,
            totalOpens: settings.totalOpens || 0,
            lastOpened: settings.lastOpened || "",
            burnAfterRead: settings.burnAfterRead || false,
          };
        })
      );
      setPads(padList);
    };

    loadPads();
  }, []);

  const visiblePads = pads.filter(p => 
    showTrash ? p.isTrashed : (!p.isTrashed && (!p.ghostMode || p.name.toLowerCase() === search.toLowerCase()) && (!p.shadowMode || p.name.toLowerCase() === search.toLowerCase()))
  );

  const filteredPads = visiblePads.filter((pad) =>
    pad.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPads = pads.filter(p => !p.isTrashed && !p.ghostMode && !p.shadowMode).length;
  const lockedPads = pads.filter(p => !p.isTrashed && p.locked).length;
  const selfDeletePads = pads.filter(p => !p.isTrashed && p.selfDelete).length;
  const ghostPadsCount = pads.filter(p => !p.isTrashed && p.ghostMode).length;
  const shadowPadsCount = pads.filter(p => !p.isTrashed && p.shadowMode).length;
  const timeLockedPadsCount = pads.filter(p => !p.isTrashed && p.timeLocked).length;
  const trashCount = pads.filter(p => p.isTrashed).length;

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
    await setDoc(doc(db, "padSettings", padName), {
      ...settingsSnap.data(),
      locked: false,
      password: "",
    });
    alert("Pad unlocked successfully.");
    location.reload();
  };

  const selfDeleteControls = async (padName: string) => {
    const action = prompt("Type:\nset → Set self-delete timer\nremove → Remove self-delete");
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
      await setDoc(doc(db, "padSettings", padName), {
        ...settingsSnap.data(),
        selfDelete: false,
        deleteAt: "",
      });
      alert("Self-delete removed.");
      location.reload();
    }
  };

  const deletePad = async (padName: string, permanent: boolean = false) => {
    if (permanent) {
      const confirmDelete = confirm(`Delete "${padName}" permanently?`);
      if (!confirmDelete) return;
      await deleteDoc(doc(db, "notes", padName));
      await deleteDoc(doc(db, "padSettings", padName));
      setPads((prev) => prev.filter((pad) => pad.name !== padName));
    } else {
      await setDoc(doc(db, "padSettings", padName), {
        ...(await getDoc(doc(db, "padSettings", padName))).data(),
        isTrashed: true,
        deletedAt: new Date().toISOString()
      });
      setPads(prev => prev.map(p => p.name === padName ? { ...p, isTrashed: true } : p));
    }
  };

  const restorePad = async (padName: string) => {
    const snap = await getDoc(doc(db, "padSettings", padName));
    await setDoc(doc(db, "padSettings", padName), {
      ...(snap.exists() ? snap.data() : {}),
      isTrashed: false,
      deletedAt: ""
    });
    setPads(prev => prev.map(p => p.name === padName ? { ...p, isTrashed: false } : p));
  };

  const advancedControls = async (padName: string) => {
    const action = prompt("Type action:\nshadow -> Toggle shadow mode\nghost -> Toggle ghost mode\ntime -> Set time lock\ndecoy -> Set decoy password\nburn -> Toggle burn after read");
    const snap = await getDoc(doc(db, "padSettings", padName));
    const data = snap.exists() ? snap.data() : {};

    if (action === "shadow") {
       if (data.shadowMode) {
          await setDoc(doc(db, "padSettings", padName), { ...data, shadowMode: false, shadowKey: "" });
       } else {
          const key = prompt("Enter secret shadow key:");
          if (!key) return;
          await setDoc(doc(db, "padSettings", padName), { ...data, shadowMode: true, shadowKey: key });
       }
    } else if (action === "ghost") {
       await setDoc(doc(db, "padSettings", padName), { ...data, ghostMode: !data.ghostMode });
    } else if (action === "time") {
       if (data.timeLocked) {
          await setDoc(doc(db, "padSettings", padName), { ...data, timeLocked: false, unlockAt: "" });
       } else {
          const hours = prompt("Lock for how many hours?");
          if (!hours) return;
          const unlockAt = new Date(Date.now() + Number(hours) * 3600000).toISOString();
          await setDoc(doc(db, "padSettings", padName), { ...data, timeLocked: true, unlockAt });
       }
    } else if (action === "decoy") {
       const decoyPassword = prompt("Enter decoy password:");
       if (!decoyPassword) return;
       const decoyContent = prompt("Enter fake content to show:");
       await setDoc(doc(db, "padSettings", padName), { ...data, decoyPassword, decoyContent });
    } else if (action === "burn") {
       await setDoc(doc(db, "padSettings", padName), { ...data, burnAfterRead: !data.burnAfterRead });
    }
    location.reload();
  };

  const createOneTimeUrl = async (padName: string) => {
    const id = Math.random().toString(36).substring(2, 10);
    await setDoc(doc(db, "oneTimeLinks", id), {
      padName,
      used: false,
      createdAt: new Date().toISOString()
    });
    alert(`One-time link generated:\n\n${window.location.origin}/o/${id}\n\n(Copy this now, it won't be shown again)`);
  };

  const StatCard = ({ icon: Icon, title, count, color }: any) => (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex items-center gap-3 mb-2 text-${color}-500 dark:text-${color}-400`}>
        <Icon size={20} />
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-4xl font-bold">{count}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans pb-12">
      <header className="w-full border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Home size={18} />
            <span>Home</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FileText} title="Total Normal Pads" count={totalPads} color="gray" />
          <StatCard icon={Lock} title="Locked Pads" count={lockedPads} color="blue" />
          <StatCard icon={Clock} title="Self-Delete Active" count={selfDeletePads} color="yellow" />
          <StatCard icon={Trash} title="Trash Count" count={trashCount} color="red" />
          <StatCard icon={Ghost} title="Ghost Pads" count={ghostPadsCount} color="purple" />
          <StatCard icon={EyeOff} title="Shadow Pads" count={shadowPadsCount} color="indigo" />
          <StatCard icon={Clock} title="Time Locked" count={timeLockedPadsCount} color="orange" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or reveal secret pads..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:border-gray-400 dark:focus:border-gray-500 outline-none shadow-sm transition-all text-lg"
            />
          </div>

          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all shadow-sm ${showTrash ? 'bg-red-600 text-white' : 'bg-card border border-border hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <Trash size={20} />
            {showTrash ? "Exit Trash" : "View Trash"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPads.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-12 text-lg">No pads found in this view.</p>
          )}

          {filteredPads.map((pad) => (
            <div
              key={pad.name}
              className={`bg-card border rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${pad.isTrashed ? 'border-red-500/50 opacity-80' : 'border-border'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-bold break-all flex-1 pr-4 line-clamp-1">
                  {pad.name}
                </h2>
                <div className="flex flex-col gap-2 shrink-0">
                  {pad.locked && (
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <Lock size={12} /> Locked
                    </span>
                  )}
                  {pad.ghostMode && (
                    <span className="text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <Ghost size={12} /> Ghost
                    </span>
                  )}
                  {pad.shadowMode && (
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <EyeOff size={12} /> Shadow
                    </span>
                  )}
                  {pad.burnAfterRead && (
                    <span className="text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                      <Flame size={12} /> Burn
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex flex-col gap-1">
                {pad.lastOpened && <span>Last opened: {new Date(pad.lastOpened).toLocaleString()}</span>}
                <span>Total opens: {pad.totalOpens}</span>
              </div>

              <div className="mt-auto pt-4 border-t border-border flex flex-wrap gap-2">
                {!pad.isTrashed ? (
                  <>
                    <button onClick={() => managePad(pad.name)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors" title="Open Pad"><ExternalLink size={20} /></button>
                    <button onClick={() => pad.locked ? unlockPad(pad.name) : lockPad(pad.name)} className="p-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 transition-colors" title="Lock/Unlock"><Lock size={20} /></button>
                    <button onClick={() => selfDeleteControls(pad.name)} className="p-2 rounded-xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 transition-colors" title="Self Delete"><Clock size={20} /></button>
                    <button onClick={() => deletePad(pad.name, false)} className="p-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 transition-colors ml-auto" title="Move to Trash"><Trash size={20} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => restorePad(pad.name)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 transition-colors" title="Restore Pad">
                      <RefreshCw size={18} /> Restore
                    </button>
                    <button onClick={() => deletePad(pad.name, true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto" title="Delete Forever">
                      <Trash size={18} /> Forever
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}