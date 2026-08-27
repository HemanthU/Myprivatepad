"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { Clock, Download, Trash, RotateCcw, X, Eye, GitCommit } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";
import Editor from "@monaco-editor/react";
import { useAppStore } from "@/lib/store";

export default function VersionHistory({ slug, currentText, onClose, onRestore }: { slug: string, currentText: string, onClose: () => void, onRestore: (text: string) => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const { confirm, alert: promptAlert } = usePrompt();
  const { theme } = useAppStore();

  const fetchVersions = async () => {
    const q = query(collection(db, "padVersions", slug, "snapshots"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // include current unsaved/latest text as index 0
    const all = [{ id: "current", text: currentText, createdAt: new Date().toISOString(), isCurrent: true }, ...fetched];
    setVersions(all);
    setSelectedIndex(0);
  };

  useEffect(() => {
    fetchVersions();
  }, [slug]);

  const selectedVersion = versions[selectedIndex];

  const saveCurrentVersion = async () => {
    const id = Date.now().toString();
    await setDoc(doc(db, "padVersions", slug, "snapshots", id), {
      text: currentText,
      createdAt: new Date().toISOString()
    });
    fetchVersions();
    await promptAlert({ title: "Version Saved", message: "A snapshot of your current pad has been saved." });
  };

  const handleRestore = async (text: string) => {
    const confirmed = await confirm({ title: "Restore Version", message: "This will overwrite your current pad. Continue?" });
    if (confirmed) {
      onRestore(text);
      onClose();
    }
  };

  const deleteVersion = async (id: string) => {
    const confirmed = await confirm({ title: "Delete Version", message: "Delete this snapshot permanently?" });
    if (confirmed) {
      await deleteDoc(doc(db, "padVersions", slug, "snapshots", id));
      fetchVersions();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div className="bg-card/95 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-6xl h-full sm:h-[90vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-xl">
              <Clock size={24} />
            </div>
            <h2 className="text-2xl font-bold">Time Machine</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Sidebar / List */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-slate-50/50 dark:bg-slate-900/50 z-10">
            <div className="p-4 border-b border-border">
              <button onClick={saveCurrentVersion} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md">
                Snapshot Current State
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {versions.map((v, idx) => (
                <div 
                  key={v.id} 
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-2xl border cursor-pointer flex justify-between items-center group transition-all ${selectedIndex === idx ? 'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-500/50 shadow-sm' : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                >
                  <div>
                    <h3 className={`font-semibold text-sm flex items-center gap-2 ${selectedIndex === idx ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                      {v.isCurrent ? "Current State" : new Date(v.createdAt).toLocaleTimeString()}
                      {v.isCurrent && <span className="text-[10px] bg-green-500 text-white px-1.5 rounded-full">LIVE</span>}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {v.isCurrent ? "Unsaved changes" : formatDistanceToNow(new Date(v.createdAt)) + " ago"}
                    </p>
                  </div>
                  {!v.isCurrent && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteVersion(v.id); }} 
                      className={`p-1.5 hover:bg-red-200 text-red-600 rounded-lg transition-colors ${selectedIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      title="Delete version"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            {selectedVersion && (
              <>
                <div className="px-4 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between z-10 text-slate-300 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-indigo-400" />
                    <span>Previewing: {selectedVersion.isCurrent ? "Current State" : new Date(selectedVersion.createdAt).toLocaleString()}</span>
                  </div>
                  <span>{selectedVersion.text.length} chars</span>
                </div>
                
                {/* Timeline Slider */}
                <div className="px-6 py-4 bg-black/20 border-b border-white/5 flex items-center gap-4">
                  <GitCommit size={18} className="text-slate-500" />
                  <input 
                    type="range" 
                    min="0" 
                    max={versions.length > 0 ? versions.length - 1 : 0} 
                    value={selectedIndex} 
                    onChange={(e) => setSelectedIndex(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    style={{ direction: 'rtl' }} // newer (idx 0) on right
                  />
                  <span className="text-xs text-slate-400 font-mono w-12 text-right">
                    {selectedIndex + 1}/{versions.length}
                  </span>
                </div>

                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    language="plaintext"
                    theme="vs-dark"
                    value={selectedVersion.text}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      padding: { top: 16, bottom: 16 },
                      fontFamily: "monospace",
                    }}
                  />
                  
                  {/* Restore overlay button */}
                  {!selectedVersion.isCurrent && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 shadow-2xl">
                      <button 
                        onClick={() => handleRestore(selectedVersion.text)} 
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full transition-all flex items-center gap-2 hover:-translate-y-1 shadow-[0_10px_20px_-10px_rgba(22,163,74,0.6)]"
                      >
                        <RotateCcw size={20} /> Restore This Version
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
