"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, deleteDoc, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { Clock, Trash, RotateCcw, X, GitCompare, Save } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useAppStore } from "@/lib/store";

export default function VersionHistory({ slug, currentText, onClose, onRestore }: {
  slug: string;
  currentText: string;
  onClose: () => void;
  onRestore: (text: string) => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const { confirm, alert: promptAlert } = usePrompt();
  const { theme } = useAppStore();

  const fetchVersions = async () => {
    const q = query(collection(db, "padVersions", slug, "snapshots"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const all = [{ id: "current", text: currentText, createdAt: new Date().toISOString(), isCurrent: true, source: 'live' }, ...fetched];
    setVersions(all);
    setSelectedIndex(0);
    setCompareIndex(fetched.length > 0 ? 1 : null);
  };

  useEffect(() => { fetchVersions(); }, [slug]);

  const selectedVersion = versions[selectedIndex];
  const compareVersion = compareIndex !== null ? versions[compareIndex] : null;

  const saveCurrentVersion = async () => {
    const id = Date.now().toString();
    await setDoc(doc(db, "padVersions", slug, "snapshots", id), {
      text: currentText,
      createdAt: new Date().toISOString(),
      source: 'manual',
    });
    fetchVersions();
    await promptAlert({ title: "Version Saved", message: "A snapshot of your current pad has been saved." });
  };

  const handleRestore = async (text: string, versionLabel: string) => {
    const confirmed = await confirm({
      title: "Restore Version?",
      message: `This will create a new version from "${versionLabel}" while preserving your current version. Continue?`
    });
    if (!confirmed) return;

    // Step 1: Save the current version as a checkpoint BEFORE restoring
    const checkpointId = Date.now().toString();
    await setDoc(doc(db, "padVersions", slug, "snapshots", checkpointId), {
      text: currentText,
      createdAt: new Date().toISOString(),
      source: 'checkpoint', // Saved automatically before a restore
    });

    // Step 2: Apply the restored content
    onRestore(text);
    onClose();
  };

  const deleteVersion = async (id: string) => {
    const confirmed = await confirm({ title: "Delete Version", message: "Delete this snapshot permanently?" });
    if (confirmed) {
      await deleteDoc(doc(db, "padVersions", slug, "snapshots", id));
      fetchVersions();
    }
  };

  // Group versions by date
  const groupedVersions = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const groups: { label: string; items: { version: any; idx: number }[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Older', items: [] },
    ];
    versions.forEach((v, idx) => {
      const d = new Date(v.createdAt); d.setHours(0,0,0,0);
      if (d >= today) groups[0].items.push({ version: v, idx });
      else if (d >= yesterday) groups[1].items.push({ version: v, idx });
      else groups[2].items.push({ version: v, idx });
    });
    return groups.filter(g => g.items.length > 0);
  };

  const monacoTheme = theme === 'light' ? 'light' : 'vs-dark';
  const sourceLabel = (v: any) => {
    if (v.isCurrent) return 'LIVE';
    if (v.source === 'manual') return 'Manual';
    if (v.source === 'checkpoint') return 'Pre-restore';
    if (v.source === 'restore') return 'Restored';
    if (v.auto || v.autoSaved) return 'Auto';
    return 'Snapshot';
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div className="bg-card/95 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-6xl h-full sm:h-[90vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-xl">
              <Clock size={24} />
            </div>
            <h2 className="text-2xl font-bold">Version History</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                compareMode
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <GitCompare size={16} />
              Compare
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
            <div className="p-4 border-b border-border">
              <button onClick={saveCurrentVersion} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md flex items-center justify-center gap-2">
                <Save size={16} /> Snapshot Current State
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {groupedVersions().map(group => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 pb-2">{group.label}</h3>
                  <div className="space-y-1">
                    {group.items.map(({ version: v, idx }) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedIndex === idx
                            ? 'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-500/50'
                            : compareMode && compareIndex === idx
                            ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-500/50'
                            : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between" onClick={() => {
                          if (compareMode && idx !== selectedIndex) {
                            setCompareIndex(idx);
                          } else {
                            setSelectedIndex(idx);
                          }
                        }}>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm flex items-center gap-2 truncate">
                              {v.isCurrent ? 'Current State' : new Date(v.createdAt).toLocaleTimeString()}
                              <span className={`text-[10px] px-1.5 rounded-full shrink-0 ${
                                v.isCurrent ? 'bg-green-500 text-white' :
                                v.source === 'checkpoint' ? 'bg-orange-400 text-white' :
                                v.source === 'manual' ? 'bg-blue-500 text-white' :
                                'bg-gray-400 text-white'
                              }`}>{sourceLabel(v)}</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {v.isCurrent ? 'Live' : formatDistanceToNow(new Date(v.createdAt)) + ' ago'}
                            </p>
                          </div>
                          {!v.isCurrent && (
                            <button onClick={(e) => { e.stopPropagation(); deleteVersion(v.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                        {!v.isCurrent && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(v.text, new Date(v.createdAt).toLocaleString()); }}
                            className="mt-2 w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {compareMode && compareVersion && selectedVersion ? (
              <div className="flex-1 flex flex-col">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-border text-xs text-gray-500 flex gap-6">
                  <span className="text-red-500 font-semibold">← {compareVersion.isCurrent ? 'Current State' : new Date(compareVersion.createdAt).toLocaleString()}</span>
                  <span className="text-green-500 font-semibold">→ {selectedVersion.isCurrent ? 'Current State' : new Date(selectedVersion.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex-1">
                  <DiffEditor
                    height="100%"
                    original={compareVersion?.text || ''}
                    modified={selectedVersion?.text || ''}
                    theme={monacoTheme}
                    options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false } }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-border text-xs text-gray-500 flex justify-between items-center">
                  <span>{selectedVersion?.isCurrent ? 'Current State — Live' : selectedVersion ? new Date(selectedVersion.createdAt).toLocaleString() : ''}</span>
                  {selectedVersion && !selectedVersion.isCurrent && (
                    <button
                      onClick={() => handleRestore(selectedVersion.text, new Date(selectedVersion.createdAt).toLocaleString())}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <RotateCcw size={12} /> Restore This Version
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
                    language="plaintext"
                    value={selectedVersion?.text || ''}
                    theme={monacoTheme}
                    options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on', padding: { top: 16 } }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
