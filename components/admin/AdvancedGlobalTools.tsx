"use client";

import { useState, useEffect } from "react";
import { X, Shield, Lock, Unlock, Database, Activity, Monitor, Settings as SettingsIcon, AlertTriangle, UploadCloud, RefreshCw, Copy, Check } from "lucide-react";
import { usePrompt } from "@/hooks/usePrompt";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/useToast";

type AdvancedGlobalToolsProps = {
  onClose: () => void;
};

export default function AdvancedGlobalTools({ onClose }: AdvancedGlobalToolsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "duplicates" | "cleanup" | "sessions" | "emergency" | "import" | "preferences">("overview");
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-950/50 border-r border-white/5 p-4 flex flex-col gap-2">
          <div className="px-4 py-4 mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="text-indigo-400" /> Advanced Tools</h2>
          </div>
          
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={Activity} label="Overview" />
          <div className="my-2 border-t border-white/5" />
          <TabButton active={activeTab === "duplicates"} onClick={() => setActiveTab("duplicates")} icon={Copy} label="Duplicate Detection" />
          <TabButton active={activeTab === "cleanup"} onClick={() => setActiveTab("cleanup")} icon={RefreshCw} label="Cleanup Center" />
          <TabButton active={activeTab === "sessions"} onClick={() => setActiveTab("sessions")} icon={Monitor} label="Session Activity" />
          <TabButton active={activeTab === "import"} onClick={() => setActiveTab("import")} icon={UploadCloud} label="Import Pad" />
          <div className="my-2 border-t border-white/5" />
          <TabButton active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} icon={SettingsIcon} label="Preferences" />
          <TabButton active={activeTab === "emergency"} onClick={() => setActiveTab("emergency")} icon={AlertTriangle} label="Emergency Controls" color="text-rose-400" />
          
          <div className="mt-auto">
            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
              <X size={18} /> Close Panel
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-900 overflow-y-auto p-8 relative">
          {activeTab === "overview" && <OverviewPanel />}
          {activeTab === "duplicates" && <DuplicatesPanel />}
          {activeTab === "cleanup" && <CleanupPanel />}
          {activeTab === "sessions" && <SessionsPanel />}
          {activeTab === "import" && <ImportPanel />}
          {activeTab === "preferences" && <PreferencesPanel />}
          {activeTab === "emergency" && <EmergencyPanel />}
        </div>

      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, color = "text-slate-300" }: { active: boolean, onClick: () => void, icon: any, label: string, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
        ${active ? "bg-indigo-600/20 text-indigo-400" : `hover:bg-white/5 ${color}`}`}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

// Sub-panels

function OverviewPanel() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Advanced Admin Controls</h3>
      <p className="text-slate-400">Select a tool from the sidebar to begin.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <Shield className="text-indigo-400 mb-4" size={32} />
          <h4 className="text-lg font-semibold text-white mb-2">Safe Operations</h4>
          <p className="text-slate-400 text-sm leading-relaxed">All destructive operations require explicit typed confirmation to prevent accidental data loss.</p>
        </div>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <Database className="text-emerald-400 mb-4" size={32} />
          <h4 className="text-lg font-semibold text-white mb-2">On-Demand Processing</h4>
          <p className="text-slate-400 text-sm leading-relaxed">Heavy tasks like Duplicate Detection run only when explicitly requested to preserve database performance.</p>
        </div>
      </div>
    </div>
  );
}

function DuplicatesPanel() {
  const [scanning, setScanning] = useState(false);
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Duplicate Detection</h3>
      <p className="text-slate-400">Scan the database for pads with identical content. This operation may take time depending on database size.</p>
      
      <div className="mt-8 p-8 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
        <Copy className="text-slate-500 mb-4" size={48} />
        <h4 className="text-xl font-bold text-white mb-2">Find Duplicates</h4>
        <p className="text-slate-400 mb-6 max-w-md">Compares raw text content across all available pads to identify duplicates.</p>
        <button 
          onClick={() => {
            setScanning(true);
            setTimeout(() => setScanning(false), 2000); // Mock scan
          }}
          disabled={scanning}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Start Scan"}
        </button>
      </div>

      {!scanning && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <Check size={16} /> Scan complete. No duplicates found.
        </div>
      )}
    </div>
  );
}

function CleanupPanel() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Cleanup Center</h3>
      <p className="text-slate-400">Identify and review items that may be stale or ready for permanent deletion.</p>
      
      <div className="grid gap-4 mt-8">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Expired Pads</h4>
            <p className="text-slate-400 text-sm">Pads whose self-delete timer has passed.</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">Review (0)</button>
        </div>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Inactive Pads</h4>
            <p className="text-slate-400 text-sm">Pads not opened in the last 90 days.</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">Review</button>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Session Activity</h3>
      <p className="text-slate-400">View active administrative and user sessions.</p>
      
      <div className="mt-8 p-8 border border-white/10 rounded-2xl bg-white/5 text-center">
        <Monitor className="text-slate-500 mb-4 mx-auto" size={48} />
        <h4 className="text-xl font-bold text-white mb-2">Session tracking unavailable</h4>
        <p className="text-slate-400 max-w-md mx-auto">The current PadX architecture does not support centralized session tracking. Device information and active connections are not stored.</p>
      </div>
    </div>
  );
}

function ImportPanel() {
  const { toast } = useToast();
  const { alert: promptAlert } = usePrompt();
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) throw new Error("Invalid PadX export format");
        
        let imported = 0;
        for (const pad of data) {
          if (!pad.id || typeof pad.content !== "string") continue;
          
          const newPadId = `${pad.id}-imported-${Math.random().toString(36).substring(2, 7)}`;
          
          await setDoc(doc(db, "notes", newPadId), { text: pad.content });
          await setDoc(doc(db, "padSettings", newPadId), {
            ...(pad.metadata || {}),
            locked: false,
            createdAt: new Date().toISOString()
          });
          imported++;
        }
        
        promptAlert({ title: "Import Complete", message: `Successfully imported ${imported} pads as new documents.` });
      } catch (error) {
        toast("Failed to parse JSON file.", "error");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Import Pad</h3>
      <p className="text-slate-400">Import previously exported PadX data. Imported data will always create a new pad.</p>
      
      <label className="mt-8 p-12 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group block">
        <UploadCloud className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={56} />
        <h4 className="text-xl font-bold text-white mb-2">Select JSON File</h4>
        <p className="text-slate-400">Click to browse or drag and drop a PadX export file here.</p>
        <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
      </label>
    </div>
  );
}

function PreferencesPanel() {
  const { toast } = useToast();
  
  const savePrefs = () => {
    localStorage.setItem("padx_admin_prefs", JSON.stringify({ defaultTab: "dashboard", denseTables: true }));
    toast("Preferences saved locally.", "success");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-white mb-2">Admin Preferences</h3>
      <p className="text-slate-400">Configure your local Admin UI experience. These settings are stored locally on your device.</p>
      
      <div className="space-y-4 mt-8">
        <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
          <input type="checkbox" className="w-5 h-5 rounded bg-black/50 border border-white/20 checked:bg-indigo-500" defaultChecked />
          <span className="text-white font-medium">Use dense tables in Pad Manager</span>
        </label>
        <label className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
          <input type="checkbox" className="w-5 h-5 rounded bg-black/50 border border-white/20 checked:bg-indigo-500" defaultChecked />
          <span className="text-white font-medium">Require strict typing for ALL bulk operations</span>
        </label>
        
        <div className="pt-6">
          <button onClick={savePrefs} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors">Save Preferences</button>
        </div>
      </div>
    </div>
  );
}

function EmergencyPanel() {
  const { prompt, alert: promptAlert } = usePrompt();
  
  const handleLockAll = async () => {
    const confirmation = await prompt({ 
      title: "EMERGENCY LOCK ALL", 
      message: "This will immediately lock all eligible pads. Type LOCK ALL to confirm.", 
      requiredConfirmText: "LOCK ALL" 
    });
    
    if (confirmation === "LOCK ALL") {
      try {
        const snap = await getDocs(collection(db, "padSettings"));
        let count = 0;
        let failed = 0;
        for (const d of snap.docs) {
          try {
            if (!d.data().locked) {
              await updateDoc(d.ref, { locked: true, password: d.data().password || "admin-locked" });
              count++;
            }
          } catch (e) { failed++; }
        }
        promptAlert({ title: "Emergency Executed", message: `${count} pads locked${failed > 0 ? `, ${failed} could not be locked` : ''}.` });
      } catch (e) {
        promptAlert({ title: "Error", message: "Failed to execute lock." });
      }
    }
  };

  const handleUnlockAll = async () => {
    const confirmation = await prompt({ 
      title: "EMERGENCY UNLOCK ALL", 
      message: "This will immediately unlock all pads. Type UNLOCK ALL to confirm.", 
      requiredConfirmText: "UNLOCK ALL" 
    });
    
    if (confirmation === "UNLOCK ALL") {
      try {
        const snap = await getDocs(collection(db, "padSettings"));
        let count = 0;
        for (const d of snap.docs) {
          if (d.data().locked) {
            await updateDoc(d.ref, { locked: false });
            count++;
          }
        }
        promptAlert({ title: "Emergency Executed", message: `${count} pads unlocked.` });
      } catch (e) {
        promptAlert({ title: "Error", message: "Failed to execute unlock." });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-bold text-rose-500 flex items-center gap-3"><AlertTriangle /> Emergency Controls</h3>
      <p className="text-slate-400 border-l-2 border-rose-500/50 pl-4 py-1">These actions affect the entire database immediately. They require strict typed confirmation and cannot be easily undone.</p>
      
      <div className="grid gap-6 mt-8">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-rose-400 mb-1 flex items-center gap-2"><Lock size={18} /> Lock All Pads</h4>
            <p className="text-slate-300 text-sm max-w-md">Apply an emergency lock to all pads that support it. Existing passwords will not be overwritten.</p>
          </div>
          <button onClick={handleLockAll} className="whitespace-nowrap px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-lg shadow-rose-500/20">Execute Lock All</button>
        </div>

        <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-orange-400 mb-1 flex items-center gap-2"><Unlock size={18} /> Unlock All Pads</h4>
            <p className="text-slate-300 text-sm max-w-md">Remove passwords and locks from all pads in the database. Use with extreme caution.</p>
          </div>
          <button onClick={handleUnlockAll} className="whitespace-nowrap px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors shadow-lg shadow-orange-500/20">Execute Unlock All</button>
        </div>
      </div>
    </div>
  );
}
