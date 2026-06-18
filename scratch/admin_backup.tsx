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
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Shield, Unlock, Trash, Clock, ExternalLink, Settings, Home, Search, FileText, EyeOff, Flame, Link as LinkIcon, RefreshCw, Ghost, Database, Archive, File as FileIcon, Image as ImageIcon } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";
import { ToastProvider, useToast } from "@/hooks/useToast";
import dynamic from "next/dynamic";

const VersionHistory = dynamic(() => import("@/components/VersionHistory"), { ssr: false });
import PromptModal from "@/components/ui/PromptModal";

const StatCard = ({ icon: Icon, title, count, color }: { icon: any, title: string, count: string | number, color: string }) => (
  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className={`flex items-center gap-3 mb-2 text-${color}-500 dark:text-${color}-400`}>
      <Icon size={20} />
      <h3 className="font-medium">{title}</h3>
    </div>
    <p className="text-4xl font-bold">{count}</p>
  </div>
);

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <ImageIcon size={20} />;
  if (type === "application/pdf") return <FileText size={20} />;
  if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return <Archive size={20} />;
  return <FileIcon size={20} />;
};

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
  const [stats, setStats] = useState({
    total: 0,
    locked: 0,
    selfDelete: 0,
    ghost: 0,
    shadow: 0,
    timeLocked: 0,
    trash: 0,
  });
  const [fileStats, setFileStats] = useState({
    totalFiles: 0,
    storageUsed: 0,
    pdfs: 0,
    images: 0,
    documents: 0,
    archives: 0,
  });
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [auth, setAuth] = useState(false);
  const [historyPad, setHistoryPad] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"dashboard" | "pads">("dashboard");
  
  const { prompt, confirm, alert: promptAlert, isOpen, config, handleClose } = usePrompt();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("adminAuth") === "true") {
        setAuth(true);
      } else {
        router.push("/");
        return;
      }
    }

    const loadPads = async () => {
      const snapshot = await getDocs(collection(db, "notes"));
      const filesSnap = await getDocs(collection(db, "files"));
      let tf = 0, su = 0, pf = 0, im = 0, dc = 0, ar = 0;
      const fileList: any[] = [];
      filesSnap.forEach(doc => {
        const d = doc.data();
        tf++;
        su += d.fileSize || 0;
        if (d.fileType.startsWith("image/")) im++;
        else if (d.fileType === "application/pdf") pf++;
        else if (d.fileType.includes("word") || d.fileType.includes("text") || d.fileType.includes("presentation") || d.fileType.includes("excel")) dc++;
        else if (d.fileType.includes("zip") || d.fileType.includes("tar") || d.fileType.includes("rar")) ar++;
        fileList.push(d);
      });
      setFileStats({ totalFiles: tf, storageUsed: su, pdfs: pf, images: im, documents: dc, archives: ar });
      setAllFiles(fileList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));

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
    sessionStorage.setItem("adminAuth", "true");
    router.push(`/${padName}`);
  };

  const deleteGlobalFile = async (file: any) => {
    const confirmed = await confirm({ title: "Delete File", message: `Delete ${file.fileName} permanently?` });
    if (!confirmed) return;
    
    if (file.chunkCount) {
      for (let i = 0; i < file.chunkCount; i++) {
        await deleteDoc(doc(db, "files", file.fileId, "chunks", i.toString()));
      }
    }
    await deleteDoc(doc(db, "files", file.fileId));
    setAllFiles(prev => prev.filter(f => f.fileId !== file.fileId));
    toast("File deleted permanently", "success");
  };

  const lockPad = async (padName: string) => {
    const password = await prompt({ title: "Lock Pad", placeholder: `Set password for "${padName}"` });
    if (!password) return;
    await setDoc(doc(db, "padSettings", padName), {
      ...(await getDoc(doc(db, "padSettings", padName))).data(),
      locked: true,
      password,
    });
    setPads(prev => prev.map(p => p.name === padName ? { ...p, locked: true } : p));
    await promptAlert({ title: "Success", message: "Pad locked successfully." });
  };

  const unlockPad = async (padName: string) => {
    const settingsSnap = await getDoc(doc(db, "padSettings", padName));
    if (!settingsSnap.exists()) return;
    await setDoc(doc(db, "padSettings", padName), {
      ...settingsSnap.data(),
      locked: false,
      password: "",
    });
    setPads(prev => prev.map(p => p.name === padName ? { ...p, locked: false } : p));
    await promptAlert({ title: "Success", message: "Pad unlocked successfully." });
  };

  const selfDeleteControls = async (padName: string) => {
    const action = await prompt({ title: "Self Delete Options", placeholder: "Type 'set' or 'remove'..." });
    if (action === "set") {
      const minutes = await prompt({ title: "Self Delete", placeholder: "Delete after how many minutes?" });
      if (!minutes || isNaN(Number(minutes))) return;
      const deleteAt = new Date(Date.now() + Number(minutes) * 60000);
      await setDoc(doc(db, "padSettings", padName), {
        ...(await getDoc(doc(db, "padSettings", padName))).data(),
        selfDelete: true,
        deleteAt: deleteAt.toISOString(),
      });
      setPads(prev => prev.map(p => p.name === padName ? { ...p, selfDelete: true, deleteAt: deleteAt.toISOString() } : p));
      await promptAlert({ title: "Timer Set", message: "Self-delete timer updated." });
    }
    if (action === "remove") {
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));
      if (!settingsSnap.exists()) return;
      await setDoc(doc(db, "padSettings", padName), {
        ...settingsSnap.data(),
        selfDelete: false,
        deleteAt: "",
      });
      setPads(prev => prev.map(p => p.name === padName ? { ...p, selfDelete: false, deleteAt: undefined } : p));
      await promptAlert({ title: "Timer Removed", message: "Self-delete removed." });
    }
  };

  const deletePad = async (padName: string, permanent: boolean = false) => {
    if (permanent) {
      const confirmDelete = await confirm({ title: "Delete Forever", message: `Delete "${padName}" permanently? This cannot be undone.` });
      if (!confirmDelete) return;

      const q = query(collection(db, "files"), where("padId", "==", padName));
      const filesSnap = await getDocs(q);
      for (const fileDoc of filesSnap.docs) {
        const fileData = fileDoc.data();
        if (fileData.chunkCount) {
          for (let i = 0; i < fileData.chunkCount; i++) {
            await deleteDoc(doc(db, "files", fileDoc.id, "chunks", i.toString()));
          }
        }
        await deleteDoc(fileDoc.ref);
      }

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
        const action = await prompt({ title: "Advanced Controls", placeholder: "Type: shadow, ghost, time, decoy, burn, webhook" });
        const snap = await getDoc(doc(db, "padSettings", padName));
        const data = snap.exists() ? snap.data() : {};

        if (action === "webhook") {
           const url = await prompt({ title: "Webhook URL", placeholder: "https://..." });
           if (!url) return;
           await setDoc(doc(db, "padSettings", padName), { ...data, webhookUrl: url });
           await promptAlert({ title: "Webhook Set", message: "Webhook will fire on pad updates." });
        } else if (action === "shadow") {
       if (data.shadowMode) {
          await setDoc(doc(db, "padSettings", padName), { ...data, shadowMode: false, shadowKey: "" });
       } else {
          const key = await prompt({ title: "Shadow Mode", placeholder: "Enter secret shadow key:" });
          if (!key) return;
          await setDoc(doc(db, "padSettings", padName), { ...data, shadowMode: true, shadowKey: key });
       }
    } else if (action === "ghost") {
       await setDoc(doc(db, "padSettings", padName), { ...data, ghostMode: !data.ghostMode });
    } else if (action === "time") {
       if (data.timeLocked) {
          await setDoc(doc(db, "padSettings", padName), { ...data, timeLocked: false, unlockAt: "" });
       } else {
          const hours = await prompt({ title: "Time Lock", placeholder: "Lock for how many hours?" });
          if (!hours || isNaN(Number(hours))) return;
          const unlockAt = new Date(Date.now() + Number(hours) * 3600000).toISOString();
          await setDoc(doc(db, "padSettings", padName), { ...data, timeLocked: true, unlockAt });
       }
    } else if (action === "decoy") {
       const decoyPassword = await prompt({ title: "Decoy Password", placeholder: "Enter decoy password:" });
       if (!decoyPassword) return;
       const decoyContent = await prompt({ title: "Decoy Content", placeholder: "Enter fake content to show:" });
       await setDoc(doc(db, "padSettings", padName), { ...data, decoyPassword, decoyContent });
    } else if (action === "burn") {
       await setDoc(doc(db, "padSettings", padName), { ...data, burnAfterRead: !data.burnAfterRead });
    }
    
    await promptAlert({ title: "Success", message: "Advanced settings updated. Please refresh the page to see all changes." });
  };

  const createOneTimeUrl = async (padName: string) => {
    const id = Math.random().toString(36).substring(2, 10);
    await setDoc(doc(db, "oneTimeLinks", id), {
      padName,
      used: false,
      createdAt: new Date().toISOString()
    });
    await promptAlert({ title: "One-Time Link", message: `Generated:\n\n${window.location.origin}/o/${id}\n\n(Copy this now, it won't be shown again)` });
  };

  if (!auth) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 font-sans relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-[#030712] to-[#030712]" />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900 via-[#030712] to-[#030712]" />

      <PromptModal isOpen={isOpen} config={config} onClose={handleClose} />
      
      <header className="w-full bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          PadX Core Operations
        </h1>
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setAdminTab("dashboard")} 
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${adminTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setAdminTab("pads")} 
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${adminTab === 'pads' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            Pad Manager
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/5"
          >
            <Home size={18} />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-20 relative z-10">
        {adminTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400"><Database size={24} /> Storage Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
              <StatCard icon={FileIcon} title="Total Files" count={fileStats.totalFiles} color="blue" />
              <StatCard icon={Database} title="Storage Used" count={`${(fileStats.storageUsed / 1024 / 1024).toFixed(2)} MB`} color="indigo" />
              <StatCard icon={FileText} title="PDFs" count={fileStats.pdfs} color="purple" />
              <StatCard icon={ImageIcon} title="Images" count={fileStats.images} color="pink" />
              <StatCard icon={FileText} title="Documents" count={fileStats.documents} color="green" />
              <StatCard icon={Archive} title="Archives" count={fileStats.archives} color="orange" />
            </div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-400"><Database size={24} /> Global File Index</h2>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-gray-300 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Pad</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Size</th>
                      <th className="p-4 font-semibold">Uploaded</th>
                      <th className="p-4 font-semibold">Views</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allFiles.slice(0, 50).map(file => (
                      <tr key={file.fileId} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg text-gray-400">{getFileIcon(file.fileType)}</div>
                          <span className="font-medium truncate max-w-[200px]" title={file.fileName}>{file.fileName}</span>
                        </td>
                        <td className="p-4 text-indigo-300 cursor-pointer hover:underline" onClick={() => managePad(file.padId)}>{file.padId}</td>
                        <td className="p-4 text-gray-400 text-sm">{file.fileType.split('/')[1] || file.fileType}</td>
                        <td className="p-4 text-gray-400 text-sm">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="p-4 text-gray-400 text-sm">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                        <td className="p-4 text-gray-400 text-sm">{file.totalViews || 0}</td>
                        <td className="p-4">
                          <button onClick={() => managePad(file.padId)} className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors mr-2" title="Jump to Pad to View">
                            <ExternalLink size={18} />
                          </button>
                          <button onClick={() => deleteGlobalFile(file)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Delete File">
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allFiles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">No files uploaded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {adminTab === "pads" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search network matrix..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(79,70,229,0.3)] outline-none transition-all text-lg text-white placeholder-gray-500"
                />
              </div>

              <button
                onClick={() => setShowTrash(!showTrash)}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all shadow-sm ${showTrash ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300'}`}
              >
                <Trash size={20} />
                {showTrash ? "Exit Trash Sector" : "View Trash Sector"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPads.length === 0 && (
                <p className="text-gray-500 col-span-full text-center py-12 text-lg">No nodes found in current sector.</p>
              )}

              {filteredPads.map((pad) => (
                <div
                  key={pad.name}
                  className={`bg-white/5 backdrop-blur-xl border rounded-3xl p-6 shadow-xl hover:shadow-[0_0_30px_rgba(79,70,229,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col group ${pad.isTrashed ? 'border-red-500/30' : 'border-white/10 hover:border-indigo-500/50'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold break-all flex-1 pr-4 line-clamp-1 text-white group-hover:text-indigo-300 transition-colors">
                      {pad.name}
                    </h2>
                    <div className="flex flex-col gap-2 shrink-0">
                      {pad.locked && (
                        <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                          <Lock size={12} /> Locked
                        </span>
                      )}
                      {pad.ghostMode && (
                        <span className="text-xs font-semibold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                          <Ghost size={12} /> Ghost
                        </span>
                      )}
                      {pad.shadowMode && (
                        <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                          <EyeOff size={12} /> Shadow
                        </span>
                      )}
                      {pad.burnAfterRead && (
                        <span className="text-xs font-semibold bg-orange-500/20 text-orange-400 px-2 py-1 rounded-md flex items-center gap-1 w-max">
                          <Flame size={12} /> Burn
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-4 flex flex-col gap-1">
                    {pad.lastOpened && <span>Last opened: {new Date(pad.lastOpened).toLocaleString()}</span>}
                    <span>Total opens: {pad.totalOpens}</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-white/10 flex flex-wrap gap-2">
                    {!pad.isTrashed ? (
                      <>
                        <button onClick={() => managePad(pad.name)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-300 hover:text-white border border-white/5" title="Open Pad"><ExternalLink size={20} /></button>
                        <button onClick={() => setHistoryPad(pad.name)} className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 transition-colors border border-indigo-500/20" title="Time Machine"><Clock size={20} /></button>
                        <button onClick={() => pad.locked ? unlockPad(pad.name) : lockPad(pad.name)} className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors border border-blue-500/20" title="Lock/Unlock"><Lock size={20} /></button>
                        <button onClick={() => selfDeleteControls(pad.name)} className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 transition-colors border border-yellow-500/20" title="Self Delete"><Trash size={20} /></button>
                        <button onClick={() => deletePad(pad.name, false)} className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors ml-auto border border-red-500/20" title="Move to Trash"><Trash size={20} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => restorePad(pad.name)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-colors border border-green-500/20" title="Restore Pad">
                          <RefreshCw size={18} /> Restore
                        </button>
                        <button onClick={() => deletePad(pad.name, true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto border border-red-500" title="Delete Forever">
                          <Trash size={18} /> Forever
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {historyPad && (
        <VersionHistory 
          slug={historyPad} 
          currentText="" 
          onClose={() => setHistoryPad(null)} 
          onRestore={async (text) => {
            await setDoc(doc(db, "notes", historyPad), { content: text, updatedAt: new Date() });
            toast("Pad restored to previous snapshot", "success");
          }} 
        />
      )}
    </div>
  );
}