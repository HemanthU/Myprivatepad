"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminEditPad() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [padSettings, setPadSettings] = useState<any>(null);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        const res = await fetch(`/api/admin/pad/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPadSettings(data.settings);
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (e) {
        setAuthorized(false);
      }
    };
    verifyAndFetch();
  }, [slug]);

  if (authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse">Authorizing Super Admin access...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <AlertTriangle className="text-rose-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6">You must be authenticated as Super Admin to use Admin Edit Mode.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition">Return Home</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-rose-500/30 bg-rose-500/5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              {slug}
              <span className="px-2 py-0.5 rounded text-xs bg-rose-500 text-white font-bold tracking-widest uppercase">ADMIN OVERRIDE</span>
            </h1>
            <p className="text-xs text-slate-400">
              {padSettings?.shadowMode ? "Shadow Pad" : padSettings?.locked ? "Protected Pad" : "Public Pad"}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>
      
      <main className="flex-1 relative">
        <CollaborativeEditor
          slug={slug}
          isBurned={false}
          isDecoyMode={false}
          onStatsChange={() => {}}
        />
      </main>
    </div>
  );
}
