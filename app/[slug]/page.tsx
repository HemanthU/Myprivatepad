"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { FileText, Unlock, Lock, EyeOff, Save, Key, User, ArrowLeft, Trash, Eye, Ghost, Database, Settings } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";
import PadFiles from "@/components/PadFiles";
import { usePrompt } from "@/hooks/usePrompt";
import { useToast } from "@/hooks/useToast";
import PromptModal from "@/components/ui/PromptModal";
import CommandPalette from "@/components/ui/CommandPalette";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import TabBar from "@/components/TabBar";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });
const CanvasBoard = dynamic(() => import("@/components/CanvasBoard"), { ssr: false });

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [localText, setLocalText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [language, setLanguage] = useState("plaintext");
  const [editorMode, setEditorMode] = useState<"code" | "rich">("code");

  const handleExport = async (format: string) => {
    if (format === "txt") {
      const blob = new Blob([localText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-export.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "md") {
      const blob = new Blob([localText], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-export.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.createElement("div");
      element.innerHTML = `<h1 style="font-family: sans-serif; text-align: center; color: #333;">PadX: ${slug}</h1><hr/><pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; padding: 20px; line-height: 1.5; color: #000;">${localText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
      html2pdf().set({
        margin: 15,
        filename: `${slug}-export.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    }
  };
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Saved");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isDecoyMode, setIsDecoyMode] = useState(false);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [isBurned, setIsBurned] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "files" | "canvas">("notes");

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

  const { prompt, confirm, alert: promptAlert, isOpen, config, handleClose } = usePrompt();
  const { toast } = useToast();

  useEffect(() => {
    const loadPad = async () => {
      const settingsRef = doc(db, "padSettings", slug);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
        setLanguage(settings.language || "plaintext");
        setEditorMode(settings.editorMode || "code");

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

        if (settings.shadowMode) {
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
          }
        }

        if (settings.locked) {
          const unlocked = sessionStorage.getItem(`unlocked-${slug}`);
          const decoyUnlocked = sessionStorage.getItem(`decoy-unlocked-${slug}`);

          if (!unlocked && !decoyUnlocked) {
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
      }

      setLoaded(true);
      setInitialLoadComplete(true);
    };

    loadPad();
  }, [slug, router]);

  useEffect(() => {
    const handleShortcuts = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isBurned) return;

        setStatus("Saving...");

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
          setStatus("Saved");
          toast("Note saved successfully", "success");
        } catch {
          setStatus("Sync Error");
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
    <div className="min-h-screen bg-transparent text-foreground transition-colors duration-300 flex flex-col items-center font-sans relative">
      <PromptModal isOpen={isOpen} config={config} onClose={handleClose} />
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} currentSlug={slug} />
      <TabBar currentSlug={slug} />
      {isBurned && (
        <div className="w-full bg-red-600 text-white py-2 text-center text-sm font-semibold z-50 shadow-md">
          🔥 Burn After Read active: This pad has been deleted from the server. It will vanish forever when you leave this page.
        </div>
      )}
      <header className="w-full max-w-[1400px] flex items-center justify-between p-4 sm:p-8 mb-2">
        <h1 
          onClick={() => router.push("/")}
          className="text-2xl font-extrabold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-4"
        >
          PadX
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${status === 'Saved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : status === 'Saving...' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
            {isBurned ? "🔥 Burned" : status === "Saved" ? "✓ Saved" : status === "Saving..." ? "⟳ Saving..." : "⚠ Sync Error"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="w-full max-w-[1400px] px-4 sm:px-8 flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-200">
            # {slug} {isDecoyMode && <span className="text-sm font-normal text-gray-500">(Decoy)</span>}
          </h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'notes' ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'files' ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab("canvas")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'canvas' ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
            >
              Canvas
            </button>
            {activeTab === "notes" && (
              <>
                <div className="border-l border-gray-300 dark:border-gray-700 mx-1"></div>
                <select
                  value={editorMode}
                  onChange={async (e) => {
                    const newMode = e.target.value as "code" | "rich";
                    setEditorMode(newMode);
                    if (!isBurned && !isDecoyMode) {
                      const { setDoc, doc } = await import("firebase/firestore");
                      await setDoc(doc(db, "padSettings", slug), { editorMode: newMode }, { merge: true });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-white dark:hover:bg-black text-gray-500 hover:text-black dark:hover:text-white transition-all outline-none font-semibold text-sm cursor-pointer border-none"
                >
                  <option value="code">Code / Text</option>
                  <option value="rich">Rich Text (Notion)</option>
                </select>
                {editorMode === "code" && (
                  <>
                    <div className="border-l border-gray-300 dark:border-gray-700 mx-1"></div>
                    <select
                      value={language}
                      onChange={async (e) => {
                        const newLang = e.target.value;
                        setLanguage(newLang);
                        if (!isBurned && !isDecoyMode) {
                          const { setDoc, doc } = await import("firebase/firestore");
                          await setDoc(doc(db, "padSettings", slug), { language: newLang }, { merge: true });
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-transparent hover:bg-white dark:hover:bg-black text-gray-500 hover:text-black dark:hover:text-white transition-all outline-none font-semibold text-sm cursor-pointer border-none"
                    >
                      <option value="plaintext">Text</option>
                      <option value="markdown">Markdown</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="json">JSON</option>
                    </select>
                  </>
                )}
              </>
            )}
            <div className="border-l border-gray-300 dark:border-gray-700 mx-1"></div>
            <select
              value=""
              onChange={(e) => {
                const format = e.target.value;
                if (format) handleExport(format);
                e.target.value = "";
              }}
              className="px-4 py-2 rounded-lg bg-transparent hover:bg-white dark:hover:bg-black text-gray-500 hover:text-black dark:hover:text-white transition-all outline-none font-semibold text-sm cursor-pointer border-none"
            >
              <option value="" disabled>Export</option>
              <option value="txt">.TXT</option>
              <option value="md">.MD</option>
              <option value="pdf">.PDF</option>
            </select>
          </div>
        </div>

        {activeTab === "notes" ? (
          <div className="flex-1 w-full min-h-[70vh] bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl p-6 sm:p-12 mb-8 flex flex-col transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.5)]">
            {editorMode === "code" ? (
              <CollaborativeEditor 
                slug={slug} 
                isBurned={isBurned} 
                isDecoyMode={isDecoyMode}
                initialText={isBurned ? localText : undefined}
                language={language}
                onStatsChange={(words, chars, text) => {
                  setWordCount(words);
                  setCharCount(chars);
                  setLocalText(text);
                }}
              />
            ) : (
              <RichTextEditor 
                slug={slug}
                isBurned={isBurned}
                isDecoyMode={isDecoyMode}
              />
            )}
            {editorMode === "code" && (
              <div className="mt-6 pt-4 border-t border-border flex justify-end text-sm font-medium text-gray-500 dark:text-gray-400">
                {wordCount} words • {charCount} chars
              </div>
            )}
          </div>
        ) : activeTab === "files" ? (
          <PadFiles slug={slug} isLocked={!!sessionStorage.getItem(`unlocked-${slug}`)} />
        ) : (
          <div className="flex-1 w-full min-h-[70vh] bg-card shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-border rounded-3xl mb-8 flex flex-col transition-all duration-300 relative overflow-hidden">
             <CanvasBoard slug={slug} isBurned={isBurned} />
          </div>
        )}
      </main>
    </div>
  );
}