"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { Clock, Download, Trash, RotateCcw, X } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";

export default function VersionHistory({ slug, currentText, onClose, onRestore }: { slug: string, currentText: string, onClose: () => void, onRestore: (text: string) => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const { confirm, alert: promptAlert } = usePrompt();

  const fetchVersions = async () => {
    const q = query(collection(db, "padVersions", slug, "snapshots"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchVersions();
  }, [slug]);

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
    <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card/90 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-border flex justify-between items-center bg-transparent">
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

        <div className="p-6 border-b border-border bg-transparent">
          <button onClick={saveCurrentVersion} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
            Snapshot Current Pad
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {versions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No past versions found.</p>
          ) : (
            versions.map(v => (
              <div key={v.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex justify-between items-center group">
                <div>
                  <h3 className="font-semibold text-lg">{new Date(v.createdAt).toLocaleString()}</h3>
                  <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(v.createdAt))} ago • {v.text.length} chars</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRestore(v.text)} className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors" title="Restore this version">
                    <RotateCcw size={18} />
                  </button>
                  <button onClick={() => deleteVersion(v.id)} className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors opacity-0 group-hover:opacity-100" title="Delete version">
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
