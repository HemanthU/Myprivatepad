"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Lock, Shield, EyeOff, Ghost, Flame, FileText, Activity, AlertTriangle, Check, Info, Clock, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrompt } from "@/hooks/usePrompt";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type AdminPadDetailsProps = {
  pad: any;
  onClose: () => void;
};

export default function AdminPadDetails({ pad, onClose }: AdminPadDetailsProps) {
  const router = useRouter();
  const { confirm, prompt, alert: promptAlert } = usePrompt();
  const [padContent, setPadContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (showPreview && padContent === null) {
      const fetchContent = async () => {
        setLoadingContent(true);
        try {
          const res = await fetch(`/api/admin/pad/${pad.name}`);
          if (res.ok) {
            const data = await res.json();
            setPadContent(data.content || "");
          } else {
            setPadContent("Unauthorized or Error loading content.");
          }
        } catch (e) {
          setPadContent("Error loading content.");
        }
        setLoadingContent(false);
      };
      fetchContent();
    }
  }, [showPreview, pad.name, padContent]);

  const handleOpenPad = () => {
    router.push(`/${pad.name}`);
    onClose();
  };

  const getHealthStatus = () => {
    if (pad.isTrashed) return { status: "🔴 Trashed", color: "text-rose-400", bg: "bg-rose-500/20" };
    if (pad.locked) return { status: "🔒 Locked", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (pad.readOnly) return { status: "👁 Read Only", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (pad.burnAfterRead) return { status: "🔥 Burn on Read", color: "text-orange-400", bg: "bg-orange-500/20" };
    if (pad.deleteAt && new Date(pad.deleteAt).getTime() < Date.now()) return { status: "⚫ Expired", color: "text-slate-400", bg: "bg-slate-500/20" };
    if (pad.deleteAt && new Date(pad.deleteAt).getTime() - Date.now() < 86400000) return { status: "⏳ Expiring Soon", color: "text-yellow-400", bg: "bg-yellow-500/20" };
    return { status: "🟢 Healthy", color: "text-emerald-400", bg: "bg-emerald-500/20" };
  };

  const getSecurityScore = () => {
    let score = 0;
    if (pad.locked) score += 40;
    if (pad.ghostMode) score += 20;
    if (pad.shadowMode) score += 20;
    if (pad.burnAfterRead) score += 20;
    
    if (score >= 60) return { label: "🟢 Strong", text: "text-emerald-400" };
    if (score >= 40) return { label: "🟡 Moderate", text: "text-yellow-400" };
    return { label: "🔴 Weak", text: "text-rose-400" };
  };

  const health = getHealthStatus();
  const security = getSecurityScore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/50">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="text-indigo-400" /> 
              {pad.name}
            </h2>
            <p className="text-slate-400 text-sm font-mono mt-1">ID: {pad.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleOpenPad} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm font-medium">
              <ExternalLink size={16} /> Open Pad
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Pad Health</h3>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-bold text-lg ${health.bg} ${health.color}`}>
                {health.status}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Security Score</h3>
              <div className={`font-bold text-lg ${security.text}`}>
                {security.label}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {pad.locked && "✓ Password protected"}
                {pad.ghostMode && " ✓ Ghost Mode"}
                {pad.burnAfterRead && " ✓ Burn after read"}
                {!pad.locked && !pad.ghostMode && !pad.burnAfterRead && "No security features active."}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Expiration</h3>
              <div className="text-lg font-bold text-white" suppressHydrationWarning>
                {pad.selfDelete ? (
                  pad.deleteAt ? (
                    new Date(pad.deleteAt).getTime() < Date.now() ? <span className="text-rose-400">Expired</span> : new Date(pad.deleteAt).toLocaleString()
                  ) : "Self-Delete Enabled"
                ) : "Never expires"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Info Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4"><Info size={18} /> Metadata</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Creator</span>
                    <span className="text-white font-medium">Unknown (Anonymous)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Owner</span>
                    <span className="text-white font-medium">Unknown</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-400">Created</span>
                    <span className="text-white font-medium">Not available</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4"><Activity size={18} /> Access History</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Total Opens</span>
                    <span className="text-white font-medium font-mono">{pad.totalOpens || 0}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-400">Last Opened</span>
                    <span className="text-white font-medium" suppressHydrationWarning>{pad.lastOpened ? new Date(pad.lastOpened).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4"><Clock size={18} /> Pad Timeline</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="relative border-l-2 border-indigo-500/30 pl-4 space-y-6">
                    {/* We construct a timeline based on available state since historical events aren't fully tracked */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 bg-indigo-500 rounded-full"></div>
                      <p className="text-sm font-bold text-white">Pad Created</p>
                      <p className="text-xs text-slate-500">Not available</p>
                    </div>
                    {pad.lastOpened && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <p className="text-sm font-bold text-white">Last Accessed</p>
                        <p className="text-xs text-slate-500" suppressHydrationWarning>{new Date(pad.lastOpened).toLocaleString()}</p>
                      </div>
                    )}
                    {pad.locked && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        <p className="text-sm font-bold text-white">Locked</p>
                        <p className="text-xs text-slate-500">Security enabled</p>
                      </div>
                    )}
                    {pad.isTrashed && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-rose-500 rounded-full"></div>
                        <p className="text-sm font-bold text-white">Moved to Trash</p>
                        <p className="text-xs text-slate-500">Pending deletion</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4"><Shield size={18} /> Advanced Admin Tools</h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <button onClick={() => setShowPreview(!showPreview)} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2"><EyeOff size={16} /> {showPreview ? "Hide Admin Preview" : "Admin Preview (Read-Only)"}</span>
                  </button>
                  <button onClick={() => router.push(`/admin/edit/${pad.name}`)} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2"><Edit2 size={16} /> Admin Edit Mode</span>
                  </button>
                  <button onClick={async () => {
                    const days = await prompt({ title: "Extend Expiration", placeholder: "Enter days to extend" });
                    if (days && !isNaN(Number(days))) {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + Number(days));
                      await fetch(`/api/admin/pad/${pad.name}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "updateLifecycle", updates: { deleteAt: newDate.toISOString(), selfDelete: true } })
                      });
                      promptAlert({ title: "Success", message: `Expiration extended by ${days} days.` });
                    }
                  }} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2"><Clock size={16} /> Extend Expiration</span>
                  </button>
                  <button onClick={async () => {
                    const confirmed = await confirm({ title: "Remove Expiration", message: "Remove self-delete timer for this pad?" });
                    if (confirmed) {
                      await fetch(`/api/admin/pad/${pad.name}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "updateLifecycle", updates: { selfDelete: false, deleteAt: null } })
                      });
                      promptAlert({ title: "Success", message: "Expiration removed." });
                    }
                  }} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2"><X size={16} /> Remove Expiration</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {showPreview && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-4 uppercase tracking-widest"><AlertTriangle size={18} /> ADMIN OVERRIDE VIEW {pad.shadowMode && " | SHADOW PAD — ADMIN ACCESS"}</h3>
              <div className="bg-black/60 border border-white/10 rounded-2xl p-6 relative">
                {loadingContent ? (
                  <p className="text-slate-500 animate-pulse">Loading secure content...</p>
                ) : (
                  <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                    {padContent || <span className="text-slate-600 italic">Pad is empty.</span>}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
