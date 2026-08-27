"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { FileText, Search, Shield, Clock, Unlock, Lock, EyeOff, Save, Key, User, ArrowLeft, Trash, Eye, Ghost, Database, Settings, PenTool, ChevronLeft, Play, X, Terminal, Share2 } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import PadFiles from "@/components/PadFiles";
import { usePrompt } from "@/hooks/usePrompt";
import { useToast } from "@/hooks/useToast";
import PromptModal from "@/components/ui/PromptModal";
import CommandPalette from "@/components/ui/CommandPalette";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import ErrorBoundary from "@/components/ErrorBoundary";
import Sidebar from "@/components/Sidebar";
import { useWorkspaceStore } from "@/lib/workspaceStore";
import TabBar from "@/components/TabBar";
import ShareModal from "@/components/ui/ShareModal";
import SecurityModal from "@/components/ui/SecurityModal";
import ExportModal from "@/components/ui/ExportModal";
import { QRCodeSVG } from "qrcode.react";

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [localText, setLocalText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"Synced" | "Saving..." | "Connecting..." | "Offline" | "Sync Error">("Connecting...");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [settingsData, setSettingsData] = useState<any>({});
  const { addRecentPad, toggleExplorer, isExplorerOpen } = useWorkspaceStore();

  useEffect(() => {
    addRecentPad(slug);
  }, [slug, addRecentPad]);
  const [loaded, setLoaded] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [deleteAtDate, setDeleteAtDate] = useState<string | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "files">("notes");

  const textRef = useRef(localText);
  useEffect(() => {
    textRef.current = localText;
  }, [localText]);

  useEffect(() => {
    const handleUnload = () => {
      if (isBurned || isDecoyMode || !textRef.current) return;
      const id = Date.now().toString();
      const content = textRef.current;
      import("firebase/firestore").then(({ setDoc, doc }) => {
        setDoc(doc(db, "padVersions", slug as string, "snapshots", id), {
          text: content,
          createdAt: new Date().toISOString(),
          autoSaved: true
        }).catch(console.error);
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [slug, isBurned, isDecoyMode]);

  useEffect(() => {
    const handleOnline = () => setConnectionStatus("Connecting...");
    const handleOffline = () => setConnectionStatus("Offline");
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    if (navigator.onLine) {
      // Simulate connecting briefly then synced
      setConnectionStatus("Connecting...");
      const timer = setTimeout(() => setConnectionStatus("Synced"), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      setConnectionStatus("Offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { prompt, confirm, alert: promptAlert, isOpen, config, handleClose } = usePrompt();
  const { toast } = useToast();

  useEffect(() => {
    const loadPad = async () => {
      const settingsRef = doc(db, "padSettings", slug);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
        setSettingsData(settings);

        if (settings.isTrashed) {
          router.push("/");
          return;
        }

        if (settings.timeLocked && settings.unlockAt) {
          if (new Date() < new Date(settings.unlockAt)) {
            setUnlockDate(settings.unlockAt);
            setLoaded(true);
            return;
          }
        }

        if (settings.shadowMode && sessionStorage.getItem("adminAuth") !== "true") {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get("shadow") !== settings.shadowKey) {
            router.push("/");
            return;
          }
        }

        const currentOpens = settings.totalOpens || 0;
        await setDoc(settingsRef, {
          ...settings,
          lastOpened: new Date().toISOString(),
          totalOpens: currentOpens + 1
        });

        if (settings.burnAfterRead && currentOpens >= 1) {
          const noteSnap = await getDoc(doc(db, "notes", slug));
          if (noteSnap.exists()) setLocalText(noteSnap.data().content || "");
          
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const q = query(collection(db, "files"), where("padId", "==", slug));
          const filesSnap = await getDocs(q);
          for (const fileDoc of filesSnap.docs) {
            const fileData = fileDoc.data();
            if (fileData.fileUrl) {
              try {
                const { ref, deleteObject } = await import("firebase/storage");
                const fileRef = ref(storage, fileData.fileUrl);
                await deleteObject(fileRef);
              } catch(e) {
                console.error("Failed to delete from storage:", e);
              }
            }
            await deleteDoc(fileDoc.ref);
          }

          await deleteDoc(doc(db, "notes", slug));
          await deleteDoc(doc(db, "padSettings", slug));
          setIsBurned(true);
          setLoaded(true);
          setInitialLoadComplete(true);
          return;
        }

        if (settings.selfDelete && settings.deleteAt) {
          if (new Date() >= new Date(settings.deleteAt)) {
            const { collection, query, where, getDocs } = await import("firebase/firestore");
            const q = query(collection(db, "files"), where("padId", "==", slug));
            const filesSnap = await getDocs(q);
            for (const fileDoc of filesSnap.docs) {
              const fileData = fileDoc.data();
              if (fileData.fileUrl) {
                try {
                  const { ref, deleteObject } = await import("firebase/storage");
                  const fileRef = ref(storage, fileData.fileUrl);
                  await deleteObject(fileRef);
                } catch(e) {
                  console.error("Failed to delete from storage:", e);
                }
              }
              await deleteDoc(fileDoc.ref);
            }

            await deleteDoc(doc(db, "notes", slug));
            await deleteDoc(doc(db, "padSettings", slug));
            router.push("/");
            return;
          } else {
            setDeleteAtDate(settings.deleteAt);
          }
        }

        if (settings.locked) {
          const unlocked = sessionStorage.getItem(`unlocked-${slug}`);
          const decoyUnlocked = sessionStorage.getItem(`decoy-unlocked-${slug}`);

          if (!unlocked && !decoyUnlocked && sessionStorage.getItem("adminAuth") !== "true") {
            router.push(`/locked/${slug}`);
            return;
          }

          if (decoyUnlocked) {
            setIsDecoyMode(true);
            setLoaded(true);
            setInitialLoadComplete(true);
            return;
          }
        }

        if (settings.readOnly) {
          setIsReadOnly(true);
        }
      }

      setLoaded(true);
      setInitialLoadComplete(true);
    };

    loadPad();
  }, [slug, router]);

  const applyTemplate = async (templateText: string) => {
    try {
      if (isDecoyMode) {
        await setDoc(doc(db, "padSettings", slug), {
          ...settingsData,
          decoyContent: templateText
        });
      } else {
        await setDoc(doc(db, "notes", slug), { content: templateText, updatedAt: new Date() }, { merge: true });
      }
      setLocalText(templateText);
      setShowTemplates(false);
      toast("Template applied", "success");
    } catch (e) {
      toast("Failed to apply template", "error");
    }
  };

  const [timeLeft, setTimeLeft] = useState<string>("");
  useEffect(() => {
    if (!deleteAtDate) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(deleteAtDate).getTime();
      const distance = end - now;
      if (distance < 0) {
        clearInterval(interval);
        router.push("/");
        return;
      }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteAtDate, router]);

  const handleSwitchPad = async () => {
    const newPad = await prompt({
      title: "Jump to Pad",
      message: "Enter the code/name of the pad you want to jump to:",
      defaultValue: ""
    });
    if (newPad && newPad.trim() !== "") {
      router.push(`/${newPad.trim()}`);
    }
  };



  useEffect(() => {
    const handleShortcuts = async (e: KeyboardEvent) => {
      // Tab Switching
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setActiveTab("notes");
      }
      if (e.altKey && e.key === "2") {
        e.preventDefault();
        setActiveTab("files");
      }

      // Switch Pad
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleSwitchPad();
      }

      // Copy Link
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        navigator.clipboard.writeText(window.location.href);
        toast("Pad link copied to clipboard!", "success");
      }

      // Distraction-Free Mode
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setDistractionFree(prev => !prev);
      }

      // Toggle Theme
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const root = document.documentElement;
        if (root.classList.contains("dark")) {
          root.classList.remove("dark");
          localStorage.setItem("theme", "light");
        } else {
          root.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
      }
      
      // Save
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isBurned) return;

        setConnectionStatus("Saving...");

        try {
          if (isDecoyMode) {
            const settingsSnap = await getDoc(doc(db, "padSettings", slug));
            if (settingsSnap.exists()) {
              await setDoc(doc(db, "padSettings", slug), {
                ...settingsSnap.data(),
                decoyContent: localText
              });
            }
          } else {
            await setDoc(doc(db, "notes", slug), {
              content: localText,
              updatedAt: new Date(),
            });
            const settingsSnap = await getDoc(doc(db, "padSettings", slug));
            if (settingsSnap.exists() && settingsSnap.data().webhookUrl) {
               fetch(settingsSnap.data().webhookUrl, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ pad: slug, event: 'saved', content: localText, timestamp: new Date().toISOString() })
               }).catch(console.error);
            }
          }
          setConnectionStatus("Synced");
          toast("Note saved successfully", "success");
        } catch {
          setConnectionStatus("Sync Error");
          toast("Failed to save note", "error");
        }
      }

      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setShowPalette(true);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        navigator.clipboard.writeText(localText);
        toast("Copied to clipboard", "success");
      }


      if (e.ctrlKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const password = await prompt({ title: "Lock Pad", placeholder: "Set a secure password..." });
        if (!password) return;

        const snap = await getDoc(doc(db, "padSettings", slug));
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          locked: true,
          password,
        });
        await promptAlert({ title: "Success", message: "Pad locked successfully." });
      }

      if (e.ctrlKey && e.key.toLowerCase() === "x" && !e.shiftKey) {
        e.preventDefault();
        const minutes = await prompt({ title: "Self Destruct", placeholder: "Minutes until deletion..." });
        if (!minutes || isNaN(Number(minutes))) return;

        const deleteAt = new Date(Date.now() + Number(minutes) * 60000);
        const snap = await getDoc(doc(db, "padSettings", slug));

        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          selfDelete: true,
          deleteAt: deleteAt.toISOString(),
        });
        await promptAlert({ title: "Timer Set", message: `Pad will self-delete in ${minutes} minutes.` });
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        if (data.timeLocked) {
          await setDoc(doc(db, "padSettings", slug), { ...data, timeLocked: false, unlockAt: "" });
          await promptAlert({ title: "Unlocked", message: "Time lock removed." });
        } else {
          const hours = await prompt({ title: "Time Lock", placeholder: "Lock for how many hours?" });
          if (!hours || isNaN(Number(hours))) return;
          const unlockAt = new Date(Date.now() + Number(hours) * 3600000).toISOString();
          await setDoc(doc(db, "padSettings", slug), { ...data, timeLocked: true, unlockAt });
          await promptAlert({ title: "Locked", message: `Time lock set for ${hours} hours.` });
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const decoyPassword = await prompt({ title: "Decoy Setup (1/2)", placeholder: "Enter decoy password:" });
        if (!decoyPassword) return;
        const decoyContent = await prompt({ title: "Decoy Setup (2/2)", placeholder: "Enter fake content to show:" });
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          decoyPassword,
          decoyContent
        });
        await promptAlert({ title: "Decoy Active", message: "Decoy password and content set." });
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        await setDoc(doc(db, "padSettings", slug), { ...data, ghostMode: !data.ghostMode });
        await promptAlert({ title: "Ghost Mode", message: data.ghostMode ? "Ghost mode disabled." : "Ghost mode enabled." });
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        if (data.shadowMode) {
          await setDoc(doc(db, "padSettings", slug), { ...data, shadowMode: false, shadowKey: "" });
          await promptAlert({ title: "Shadow Mode", message: "Shadow mode disabled." });
        } else {
          const key = await prompt({ title: "Shadow Mode", placeholder: "Enter secret shadow key:" });
          if (!key) return;
          await setDoc(doc(db, "padSettings", slug), { ...data, shadowMode: true, shadowKey: key });
          await promptAlert({ title: "Shadow Mode", message: "Shadow mode enabled. Access via ?shadow=" + key });
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const snap = await getDoc(doc(db, "padSettings", slug));
        const data = snap.exists() ? snap.data() : {};
        await setDoc(doc(db, "padSettings", slug), { ...data, burnAfterRead: !data.burnAfterRead });
        await promptAlert({ title: "Burn After Read", message: data.burnAfterRead ? "Burn After Read disabled." : "Burn After Read enabled." });
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        const id = Math.random().toString(36).substring(2, 10);
        await setDoc(doc(db, "oneTimeLinks", id), {
          padName: slug,
          used: false,
          createdAt: new Date().toISOString()
        });
        const url = `${window.location.origin}/o/${id}`;
        navigator.clipboard.writeText(url);
        toast("One-time link copied to clipboard!", "success");
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const confirmTrash = await confirm({ title: "Move to Trash", message: "Move this pad to trash?" });
        if (!confirmTrash) return;
        const snap = await getDoc(doc(db, "padSettings", slug));
        await setDoc(doc(db, "padSettings", slug), {
          ...(snap.exists() ? snap.data() : {}),
          isTrashed: true,
          deletedAt: new Date().toISOString()
        });
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localText, router, slug, isDecoyMode, isBurned]);

  if (unlockDate) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center font-sans p-6 text-center transition-colors duration-300">
        <ThemeToggle />
        <h1 className="text-4xl font-extrabold mb-4 mt-8">Time Locked ⏳</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">
          This pad will unlock on {new Date(unlockDate).toLocaleString()}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-8 px-6 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold hover:opacity-90"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen overflow-hidden w-full">
      <Sidebar currentSlug={slug} />
      
      <div className="flex-1 h-full overflow-y-auto bg-transparent text-foreground transition-colors duration-300 flex flex-col items-center font-sans relative">
        <PromptModal isOpen={isOpen} config={config} onClose={handleClose} />
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} currentSlug={slug} />
      {!distractionFree && <TabBar currentSlug={slug} />}
      {isBurned && (
        <div className="w-full bg-red-600 text-white py-2 text-center text-sm font-semibold z-50 shadow-md">
          🔥 Burn After Read active: This pad has been deleted from the server. It will vanish forever when you leave this page.
        </div>
      )}
      {!distractionFree && (
      <header className="w-full max-w-[1400px] flex items-center justify-between p-4 sm:p-8 mb-2">
        <div className="flex items-center gap-2">
          {!isExplorerOpen && (
            <button 
              onClick={toggleExplorer}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle Explorer"
            >
              <Database size={24} />
            </button>
          )}
          <button 
            onClick={() => router.push("/")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Home"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 
            onClick={() => router.push("/")}
            className="text-2xl font-extrabold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            PadX
          </h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-2 mr-2">
              {activeUsers.map((user, i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: user.color || '#3b82f6' }}
                  title={user.name}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={handleSwitchPad}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent shadow-sm"
            title="Switch Pad (Ctrl+K)"
          >
            <Search size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Switch Pad</span>
          </button>
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900/50 transition-colors"
            title="Advanced Security"
          >
            <Shield size={18} />
          </button>
          
          {deleteAtDate && timeLeft && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold animate-pulse" title="Time until self-destruct">
              <Clock size={16} />
              {timeLeft}
            </div>
          )}

          {localText.trim() === "" && !isBurned && !isReadOnly && (
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors border border-transparent shadow-sm"
                title="Insert Template"
              >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Templates</span>
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95">
                  <button 
                    onClick={() => applyTemplate("# Markdown Boilerplate\n\n## Introduction\nStart writing here...\n\n- Bullet 1\n- Bullet 2\n\n```python\nprint('Hello World')\n```")}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Markdown Boilerplate
                  </button>
                  <button 
                    onClick={() => applyTemplate("// Code Interview\n\nfunction solveProblem(input) {\n  // TODO: implement\n  return input;\n}\n\nconsole.log(solveProblem([1,2,3]));")}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Code Interview
                  </button>
                  <button 
                    onClick={() => applyTemplate("# Daily Standup\n\n**Yesterday:**\n- \n\n**Today:**\n- \n\n**Blockers:**\n- None")}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Daily Standup
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            title="Share Pad"
          >
            <Share2 size={18} />
          </button>
          <span className={`hidden sm:flex text-sm font-semibold px-3 py-1.5 rounded-full items-center gap-1.5 ${connectionStatus === 'Synced' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : connectionStatus === 'Saving...' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : connectionStatus === 'Connecting...' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {isBurned ? "🔥 Burned" : connectionStatus === "Synced" ? "🟢 Synced" : connectionStatus === "Saving..." ? "🟡 Saving..." : connectionStatus === "Connecting..." ? "🟠 Connecting..." : connectionStatus === "Offline" ? "🔴 Offline" : "🔴 Sync Error"}
          </span>
          <ThemeToggle />
        </div>
      </header>
      )}

      <main className="w-full max-w-[1400px] px-4 sm:px-8 flex-1 flex flex-col">
        {!distractionFree && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200">
            # {slug} {isDecoyMode && <span className="text-sm font-normal text-gray-500">(Decoy)</span>}
          </h2>
          <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'notes' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              title="Notes (Alt+1)"
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'files' ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
              title="Files (Alt+2)"
            >
              Files
            </button>
            <div className="border-l border-gray-300 dark:border-gray-700 mx-1"></div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2"
            >
              Export
            </button>
          </div>
        </div>
        )}

        <div className="flex-1 w-full grid grid-cols-1 grid-rows-1 mb-8">
          {/* Notes Tab */}
          <div className={`col-start-1 row-start-1 w-full flex flex-col min-h-[600px] bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl p-6 sm:p-12 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.5)] ${activeTab === 'notes' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
              <div className="flex-1 flex flex-col min-h-[400px] relative overflow-hidden">
                <CollaborativeEditor 
                  slug={slug} 
                  isBurned={isBurned || isReadOnly} 
                  isDecoyMode={isDecoyMode}
                  initialText={isBurned ? localText : undefined}
                  language="plaintext"
                  onStatsChange={(words, chars, text) => {
                    setWordCount(words);
                    setCharCount(chars);
                    setLocalText(text);
                  }}
                  onUsersChange={setActiveUsers}
                />
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end text-sm font-medium text-gray-500 dark:text-gray-400">
                {wordCount} words • {charCount} chars
              </div>
          </div>

          {/* Files Tab */}
          <div className={`col-start-1 row-start-1 w-full transition-all duration-300 ${activeTab === 'files' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
            <PadFiles slug={slug} isLocked={!!sessionStorage.getItem(`unlocked-${slug}`)} />
          </div>
        </div>
      </main>

        {/* Mobile Bottom Navigation */}
      {!distractionFree && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex sm:hidden bg-card/90 backdrop-blur-xl border-t border-border p-2 pb-4 justify-around shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl font-semibold text-xs transition-all ${activeTab === 'notes' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <FileText size={20} />
            Notes
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-xl font-semibold text-xs transition-all ${activeTab === 'files' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <Database size={20} />
            Files
          </button>
        </div>
      )}

      <ShareModal slug={slug} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <SecurityModal slug={slug} isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />
      <ExportModal slug={slug} content={localText} metadata={settingsData} isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      </div>
    </div>
    </ErrorBoundary>
  );
}