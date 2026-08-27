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
import { Lock, Shield, Unlock, Trash, Clock, ExternalLink, Settings, Home, Search, FileText, EyeOff, Flame, Link as LinkIcon, RefreshCw, Ghost, Database, Archive, File as FileIcon, Image as ImageIcon, Download, Activity, AlertTriangle, Check, Folder } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";
import { ToastProvider, useToast } from "@/hooks/useToast";
import dynamic from "next/dynamic";

const VersionHistory = dynamic(() => import("@/components/VersionHistory"), { ssr: false });
import PromptModal from "@/components/ui/PromptModal";
import ErrorBoundary from "@/components/ErrorBoundary";

const StatCard = ({ icon: Icon, title, count, color, onClick, active }: { icon: any, title: string, count: string | number, color: string, onClick?: () => void, active?: boolean }) => (
  <div 
    onClick={onClick}
    className={`bg-white/5 dark:bg-slate-900/40 backdrop-blur-3xl border ${active ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500' : 'border-white/10 dark:border-white/5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]'} rounded-3xl p-6 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-${color}-500/20 transition-all duration-500`} />
    <div className={`flex items-center gap-3 mb-3 text-${color}-400 dark:text-${color}-400`}>
      <Icon size={22} strokeWidth={1.5} />
      <h3 className="font-semibold tracking-wide text-sm uppercase text-slate-400">{title}</h3>
    </div>
    <p className="text-4xl font-extrabold text-white tracking-tight">{count}</p>
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
  readOnly?: boolean;
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
  const [fileFilter, setFileFilter] = useState<"all" | "pdfs" | "images" | "documents" | "archives">("all");
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [auth, setAuth] = useState(false);
  const [historyPad, setHistoryPad] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"landing" | "dashboard" | "pads">("landing");
  const [selectedPads, setSelectedPads] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "locked" | "ghost" | "shadow" | "burn">("all");
  const [sortMode, setSortMode] = useState<"recent" | "opens" | "name">("recent");
  
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
        fileList.push({ ...d, fileId: doc.id });
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
            readOnly: settings.readOnly || false,
          };
        })
      );
      setPads(padList);
    };

    loadPads();
  }, []);

  const visiblePads = pads.filter(p => showTrash ? p.isTrashed : !p.isTrashed);

  const searchedPads = visiblePads.filter(pad =>
    pad.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFiles = allFiles.filter(file => {
    if (fileFilter === "all") return true;
    if (fileFilter === "pdfs") return file.fileType === "application/pdf";
    if (fileFilter === "images") return file.fileType.startsWith("image/");
    if (fileFilter === "documents") return file.fileType.includes("word") || file.fileType.includes("text") || file.fileType.includes("presentation") || file.fileType.includes("excel");
    if (fileFilter === "archives") return file.fileType.includes("zip") || file.fileType.includes("tar") || file.fileType.includes("rar");
    return true;
  });

  const filteredPads = searchedPads.filter(pad => {
    if (filterMode === "locked") return pad.locked;
    if (filterMode === "ghost") return pad.ghostMode;
    if (filterMode === "shadow") return pad.shadowMode;
    if (filterMode === "burn") return pad.burnAfterRead;
    return true; // "all"
  }).sort((a, b) => {
    if (sortMode === "opens") return (b.totalOpens || 0) - (a.totalOpens || 0);
    if (sortMode === "name") return a.name.localeCompare(b.name);
    // default to recent
    return new Date(b.lastOpened || 0).getTime() - new Date(a.lastOpened || 0).getTime();
  });

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

  const deletePad = async (padName: string, permanent: boolean = false, skipConfirm: boolean = false) => {
    if (permanent) {
      if (!skipConfirm) {
        const confirmDelete = await confirm({ title: "Delete Forever", message: `Delete "${padName}" permanently? This cannot be undone.` });
        if (!confirmDelete) return;
      }

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
      setPads(prev => prev.filter(p => p.name !== padName));
    } else {
      if (!skipConfirm) {
        const confirmTrash = await confirm({ title: "Move to Trash", message: `Move "${padName}" to trash?` });
        if (!confirmTrash) return;
      }
      
      const settingsSnap = await getDoc(doc(db, "padSettings", padName));
      await setDoc(doc(db, "padSettings", padName), {
        ...(settingsSnap.exists() ? settingsSnap.data() : {}),
        isTrashed: true,
        deletedAt: new Date().toISOString()
      });
      setPads(prev => prev.map(p => p.name === padName ? { ...p, isTrashed: true } : p));
    }

    if (!skipConfirm) {
      await promptAlert({ title: "Deleted", message: permanent ? "Pad permanently deleted." : "Pad moved to trash." });
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

  const handleBulkAction = async (action: "delete" | "lock" | "burn" | "archive" | "export") => {
    if (selectedPads.length === 0) return;
    
    if (action === "delete") {
      const isPermanent = showTrash;
      const confirmed = await confirm({ title: `Bulk Delete (${selectedPads.length})`, message: `Are you sure you want to delete ${selectedPads.length} pads${isPermanent ? ' permanently' : ''}?` });
      if (!confirmed) return;
      for (const padName of selectedPads) {
        await deletePad(padName, isPermanent, true);
      }
      toast(`Successfully deleted ${selectedPads.length} pads`, "success");
    } else if (action === "lock") {
      const password = await prompt({ title: "Bulk Lock", placeholder: "Set password for selected pads" });
      if (!password) return;
      for (const padName of selectedPads) {
        await setDoc(doc(db, "padSettings", padName), {
          ...(await getDoc(doc(db, "padSettings", padName))).data(),
          locked: true,
          password,
        });
      }
      setPads(prev => prev.map(p => selectedPads.includes(p.name) ? { ...p, locked: true } : p));
      toast(`Successfully locked ${selectedPads.length} pads`, "success");
    } else if (action === "burn") {
      const confirmed = await confirm({ title: `Bulk Burn (${selectedPads.length})`, message: "Enable Burn After Read for selected pads?" });
      if (!confirmed) return;
      for (const padName of selectedPads) {
        await setDoc(doc(db, "padSettings", padName), {
          ...(await getDoc(doc(db, "padSettings", padName))).data(),
          burnAfterRead: true,
        });
      }
      setPads(prev => prev.map(p => selectedPads.includes(p.name) ? { ...p, burnAfterRead: true } : p));
      toast(`Enabled Burn After Read for ${selectedPads.length} pads`, "success");
    } else if (action === "archive") {
      // Archive is conceptually same as trashing/soft delete in this app, but if it has an isArchived field we'd set it.
      // Assuming we just move to trash for archive.
      const confirmed = await confirm({ title: `Bulk Archive (${selectedPads.length})`, message: "Move selected pads to trash?" });
      if (!confirmed) return;
      for (const padName of selectedPads) {
        await deletePad(padName, false);
      }
      toast(`Archived ${selectedPads.length} pads`, "success");
    } else if (action === "export") {
      try {
        const exportData = await Promise.all(
          selectedPads.map(async (padName) => {
            const padDoc = await getDoc(doc(db, "notes", padName));
            const settingsDoc = await getDoc(doc(db, "padSettings", padName));
            return {
              id: padName,
              content: padDoc.exists() ? padDoc.data().text : "",
              metadata: settingsDoc.exists() ? settingsDoc.data() : {}
            };
          })
        );
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `padx-admin-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`Exported ${selectedPads.length} pads`, "success");
      } catch (err) {
        toast("Failed to export pads", "error");
      }
    }
    
    setSelectedPads([]);
  };

  const toggleSelectAll = () => {
    if (selectedPads.length === filteredPads.length) {
      setSelectedPads([]);
    } else {
      setSelectedPads(filteredPads.map(p => p.name));
    }
  };

  const totalFilesCount = fileStats.totalFiles;
  const totalPadsCount = pads.length;
  const lockedPadsCount = pads.filter(p => p.locked).length;
  const readOnlyPadsCount = pads.filter(p => p.readOnly).length;
  const expiringPadsCount = pads.filter(p => p.selfDelete && p.deleteAt && new Date(p.deleteAt).getTime() > Date.now()).length;
  const expiredPadsCount = pads.filter(p => p.selfDelete && p.deleteAt && new Date(p.deleteAt).getTime() <= Date.now()).length;

  const recentActivity = [
    ...pads.filter(p => p.lastOpened).map(p => ({ id: p.name + '-pad', type: 'Pad', label: `Pad opened: ${p.name}`, time: new Date(p.lastOpened!).getTime(), icon: FileText, color: 'text-purple-400' })),
    ...allFiles.map(f => ({ id: f.fileId + '-file', type: 'File', label: `File uploaded: ${f.fileName}`, time: new Date(f.uploadedAt).getTime(), icon: FileIcon, color: 'text-blue-400' }))
  ].sort((a, b) => b.time - a.time).slice(0, 8);

  const dbStatus = (pads.length > 0 || allFiles.length > 0) ? "Operational" : "Checking...";

  if (!auth) {
    return null; // Return empty until auth check passes or redirects
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden transition-colors duration-500">
      {/* Deep premium background gradients */}
      <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" style={{ animationDelay: "2s" }} />

      <PromptModal isOpen={isOpen} config={config} onClose={handleClose} />
      
      <header className="w-full bg-slate-900/50 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-50 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
          <Shield className="text-indigo-400" size={30} /> Command Center
        </h1>
        
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button 
            onClick={() => setAdminTab("landing")} 
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${adminTab === 'landing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-100' : 'text-slate-400 hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setAdminTab("dashboard")} 
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${adminTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-100' : 'text-slate-400 hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setAdminTab("pads")} 
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${adminTab === 'pads' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 scale-100' : 'text-slate-400 hover:text-white hover:bg-white/5 scale-95 hover:scale-100'}`}
          >
            Pad Manager
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10"
          >
            <Home size={18} />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-20 relative z-10">
        
        {adminTab === "landing" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            {/* 1. Header */}
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Hello SAM</h1>

            {/* 2. Counters (1 Row horizontally scrollable on mobile) */}
            <div className="flex flex-nowrap overflow-x-auto sm:overflow-visible sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-4 pb-4 sm:pb-0 hide-scrollbar">
              <div onClick={() => { setAdminTab("dashboard"); setFileFilter("all"); }} className="min-w-[140px] flex-shrink-0 cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-center">Total Files</span>
                <span className="text-2xl font-extrabold text-white">{totalFilesCount}</span>
              </div>
              <div onClick={() => { setAdminTab("pads"); setFilterMode("all"); setShowTrash(false); }} className="min-w-[140px] flex-shrink-0 cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-center">Total Pads</span>
                <span className="text-2xl font-extrabold text-white">{totalPadsCount}</span>
              </div>
              <div onClick={() => { setAdminTab("pads"); setFilterMode("locked"); setShowTrash(false); }} className="min-w-[140px] flex-shrink-0 cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1 text-center">Locked</span>
                <span className="text-2xl font-extrabold text-blue-400">{lockedPadsCount}</span>
              </div>
              <div className="min-w-[140px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1 text-center">Read Only</span>
                <span className="text-2xl font-extrabold text-emerald-400">{readOnlyPadsCount}</span>
              </div>
              <div className="min-w-[140px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center opacity-60">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-center">Online</span>
                <span className="text-2xl font-extrabold text-slate-500">—</span>
              </div>
              <div className="min-w-[140px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1 text-center">Expiring</span>
                <span className="text-2xl font-extrabold text-orange-400">{expiringPadsCount}</span>
              </div>
              <div className="min-w-[140px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-rose-400 font-bold uppercase tracking-widest mb-1 text-center">Expired</span>
                <span className="text-2xl font-extrabold text-rose-400">{expiredPadsCount}</span>
              </div>
              <div className="min-w-[140px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center opacity-60">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-center">Versions</span>
                <span className="text-2xl font-extrabold text-slate-500">—</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 3. Recent Activity */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-400"><Activity size={20} /> Recent Activity</h2>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-64 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">No recent activity</p>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity, i) => (
                        <div key={activity.id + i} className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-full bg-white/5 ${activity.color}`}>
                            <activity.icon size={14} />
                          </div>
                          <div>
                            <p className="text-sm text-slate-200"><span className="font-semibold text-slate-400">[{activity.type}]</span> {activity.label}</p>
                            <p className="text-xs text-slate-500">{new Date(activity.time).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {/* 4. Attention Required */}
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-400"><AlertTriangle size={20} /> Attention Required</h2>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    {expiringPadsCount === 0 && expiredPadsCount === 0 ? (
                      <p className="text-emerald-400 font-medium flex items-center gap-2"><Check size={18} /> Everything looks good</p>
                    ) : (
                      <div className="space-y-2">
                        {expiringPadsCount > 0 && <p className="text-orange-400 flex items-center gap-2">⚠ {expiringPadsCount} pad{expiringPadsCount !== 1 ? 's' : ''} expire soon</p>}
                        {expiredPadsCount > 0 && <p className="text-rose-400 flex items-center gap-2">⚠ {expiredPadsCount} pad{expiredPadsCount !== 1 ? 's' : ''} have expired</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5 & 6. System Status and Admin Session */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">System Status</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-300 flex items-center gap-2">
                        <span className={dbStatus === "Operational" ? "text-emerald-400" : "text-amber-400"}>●</span> 
                        Database — {dbStatus}
                      </p>
                      <p className="text-slate-300 flex items-center gap-2">
                        <span className={dbStatus === "Operational" ? "text-emerald-400" : "text-amber-400"}>●</span> 
                        Storage — {dbStatus}
                      </p>
                      <p className="text-slate-300 flex items-center gap-2"><span className="text-emerald-400">●</span> Authentication — Operational</p>
                      <p className="text-slate-300 flex items-center gap-2"><span className="text-emerald-400">●</span> Synchronization — Operational</p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Admin Session</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-emerald-400 font-medium">Session: Active</p>
                      <p className="text-slate-400">Session started: {new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7 & 8. Navigation Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <button 
                onClick={() => setAdminTab("dashboard")}
                className="group relative overflow-hidden rounded-3xl bg-indigo-900/20 border border-indigo-500/20 p-8 text-left hover:bg-indigo-900/40 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all" />
                <h3 className="text-3xl font-extrabold text-indigo-400 mb-2 flex items-center gap-3"><Folder size={32} /> Files</h3>
                <p className="text-indigo-200/70">Open Command Center</p>
              </button>
              
              <button 
                onClick={() => setAdminTab("pads")}
                className="group relative overflow-hidden rounded-3xl bg-purple-900/20 border border-purple-500/20 p-8 text-left hover:bg-purple-900/40 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all" />
                <h3 className="text-3xl font-extrabold text-purple-400 mb-2 flex items-center gap-3"><FileText size={32} /> Pads</h3>
                <p className="text-purple-200/70">Open Pad Manager</p>
              </button>
            </div>
          </div>
        )}

        {adminTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400"><Database size={24} /> Storage Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
              <StatCard icon={FileIcon} title="Total Files" count={fileStats.totalFiles} color="blue" onClick={() => setFileFilter("all")} active={fileFilter === "all"} />
              <StatCard icon={Database} title="Storage Used" count={`${(fileStats.storageUsed / 1024 / 1024).toFixed(2)} MB`} color="indigo" />
              <StatCard icon={FileText} title="PDFs" count={fileStats.pdfs} color="purple" onClick={() => setFileFilter("pdfs")} active={fileFilter === "pdfs"} />
              <StatCard icon={ImageIcon} title="Images" count={fileStats.images} color="pink" onClick={() => setFileFilter("images")} active={fileFilter === "images"} />
              <StatCard icon={FileText} title="Documents" count={fileStats.documents} color="green" onClick={() => setFileFilter("documents")} active={fileFilter === "documents"} />
              <StatCard icon={Archive} title="Archives" count={fileStats.archives} color="orange" onClick={() => setFileFilter("archives")} active={fileFilter === "archives"} />
            </div>

            <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-3 text-purple-400 tracking-tight mt-16"><Database size={26} /> Global File Index {fileFilter !== "all" && <span className="text-sm font-medium text-purple-300/50 bg-purple-500/10 px-3 py-1 rounded-full ml-2">Filtered: {fileFilter}</span>}</h2>
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="p-5 font-bold">Name</th>
                      <th className="p-5 font-bold">Pad</th>
                      <th className="p-5 font-bold">Type</th>
                      <th className="p-5 font-bold">Size</th>
                      <th className="p-5 font-bold">Uploaded</th>
                      <th className="p-5 font-bold">Views</th>
                      <th className="p-5 font-bold text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredFiles.slice(0, 50).map(file => (
                      <tr key={file.fileId} className="hover:bg-white/5 transition-colors group">
                        <td className="p-5 flex items-center gap-4">
                          <div className="p-2.5 bg-white/5 rounded-xl text-indigo-300 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">{getFileIcon(file.fileType)}</div>
                          <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={file.fileName}>{file.fileName}</span>
                        </td>
                        <td className="p-5 text-indigo-400 font-mono text-sm cursor-pointer hover:text-indigo-300 transition-colors" onClick={() => managePad(file.padId)}>{file.padId}</td>
                        <td className="p-5 text-slate-400 text-sm">{file.fileType.split('/')[1] || file.fileType}</td>
                        <td className="p-5 text-slate-400 font-mono text-sm">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="p-5 text-slate-400 text-sm">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                        <td className="p-5 text-slate-400 font-mono text-sm">{file.totalViews || 0}</td>
                        <td className="p-5 text-right pr-6">
                          <button onClick={() => managePad(file.padId)} className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-colors mr-2" title="Jump to Pad to View">
                            <ExternalLink size={18} />
                          </button>
                          <button onClick={() => deleteGlobalFile(file)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors" title="Delete File">
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredFiles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No files found {fileFilter !== "all" ? `for category: ${fileFilter}` : ""}
                        </td>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div 
                onClick={() => { setFilterMode("all"); setShowTrash(false); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${!showTrash && filterMode === "all" ? "bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                <span className="text-2xl font-bold text-white">{totalPads}</span>
                <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Total Pads</span>
              </div>
              <div 
                onClick={() => { setFilterMode("locked"); setShowTrash(false); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${!showTrash && filterMode === "locked" ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/50" : "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"}`}>
                <span className="text-2xl font-bold text-blue-400">{lockedPads}</span>
                <span className="text-xs text-blue-400/70 uppercase tracking-widest mt-1">Locked</span>
              </div>
              <div 
                onClick={() => { setFilterMode("burn"); setShowTrash(false); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${!showTrash && filterMode === "burn" ? "bg-orange-500/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] ring-1 ring-orange-500/50" : "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"}`}>
                <span className="text-2xl font-bold text-orange-400">{pads.filter(p => p.burnAfterRead).length}</span>
                <span className="text-xs text-orange-400/70 uppercase tracking-widest mt-1">Burn</span>
              </div>
              <div 
                onClick={() => { setFilterMode("ghost"); setShowTrash(false); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${!showTrash && filterMode === "ghost" ? "bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/50" : "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20"}`}>
                <span className="text-2xl font-bold text-purple-400">{ghostPadsCount}</span>
                <span className="text-xs text-purple-400/70 uppercase tracking-widest mt-1">Ghost</span>
              </div>
              <div 
                onClick={() => { setFilterMode("shadow"); setShowTrash(false); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${!showTrash && filterMode === "shadow" ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/50" : "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20"}`}>
                <span className="text-2xl font-bold text-indigo-400">{shadowPadsCount}</span>
                <span className="text-xs text-indigo-400/70 uppercase tracking-widest mt-1">Shadow</span>
              </div>
              <div 
                onClick={() => { setShowTrash(true); setFilterMode("all"); }}
                className={`border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 ${showTrash ? "bg-rose-500/20 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/50" : "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"}`}>
                <span className="text-2xl font-bold text-rose-400">{trashCount}</span>
                <span className="text-xs text-rose-400/70 uppercase tracking-widest mt-1">Trash</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search network matrix..."
                  className="w-full pl-14 pr-5 py-4 rounded-2xl bg-black/20 border border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-lg text-white placeholder-slate-500 shadow-inner backdrop-blur-md"
                />
              </div>

              <button
                onClick={() => {
                  setShowTrash(!showTrash);
                  setSelectedPads([]);
                }}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all shadow-sm ${showTrash ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300'}`}
              >
                <Trash size={20} />
                {showTrash ? "Exit Trash Sector" : "View Trash Sector"}
              </button>
            </div>

            {selectedPads.length > 0 && (
              <div className="bg-indigo-900/50 border border-indigo-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 flex-wrap gap-4">
                <span className="text-indigo-200 font-medium">{selectedPads.length} pads selected</span>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setSelectedPads([])} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Cancel</button>
                  <button onClick={() => handleBulkAction("lock")} className="px-3 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
                    <Lock size={16} /> Lock
                  </button>
                  <button onClick={() => handleBulkAction("burn")} className="px-3 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-orange-500/20">
                    <Flame size={16} /> Burn
                  </button>
                  <button onClick={() => handleBulkAction("archive")} className="px-3 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20">
                    <Archive size={16} /> Archive
                  </button>
                  <button onClick={() => handleBulkAction("export")} className="px-3 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                    <Download size={16} /> Export
                  </button>
                  <button onClick={() => handleBulkAction("delete")} className="px-3 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20">
                    <Trash size={16} /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedPads.length === filteredPads.length && filteredPads.length > 0 ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-black/20 group-hover:border-indigo-500'}`}>
                  {selectedPads.length === filteredPads.length && filteredPads.length > 0 && <span className="text-white text-xs">✓</span>}
                </div>
                <input type="checkbox" className="hidden" checked={selectedPads.length === filteredPads.length && filteredPads.length > 0} onChange={toggleSelectAll} />
                <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">Select All ({filteredPads.length})</span>
              </label>

              <div className="flex items-center gap-3">
                <select 
                  value={filterMode} 
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="locked">Locked</option>
                  <option value="ghost">Ghost</option>
                  <option value="shadow">Shadow</option>
                  <option value="burn">Burn After Read</option>
                </select>

                <select 
                  value={sortMode} 
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-indigo-500"
                >
                  <option value="recent">Last Opened</option>
                  <option value="opens">Most Opens</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPads.length === 0 && (
                <p className="text-gray-500 col-span-full text-center py-12 text-lg">No nodes found in current sector.</p>
              )}

              {filteredPads.map((pad) => (
                  <div
                  key={pad.name}
                  className={`bg-slate-900/40 backdrop-blur-2xl border rounded-[2rem] p-8 shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 flex flex-col group relative overflow-hidden ${pad.isTrashed ? 'border-rose-500/30 bg-rose-950/10' : 'border-white/10 hover:border-indigo-500/50'}`}
                >
                  {/* Glass highlight effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="absolute top-4 left-4 z-10">
                    <label className="cursor-pointer group flex items-center justify-center w-6 h-6">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedPads.includes(pad.name) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500 bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                        {selectedPads.includes(pad.name) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={selectedPads.includes(pad.name)}
                        onChange={() => {
                          if (selectedPads.includes(pad.name)) {
                            setSelectedPads(prev => prev.filter(p => p !== pad.name));
                          } else {
                            setSelectedPads(prev => [...prev, pad.name]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex items-start justify-between mb-4 pl-8">
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
    </ErrorBoundary>
  );
}