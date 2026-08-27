import { useState, useEffect } from "react";
import { Shield, Lock, Trash, Clock, Flame, Ghost, EyeOff, Save, X } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/useToast";
import { usePrompt } from "@/hooks/usePrompt";

export default function SecurityModal({ slug, isOpen, onClose }: { slug: string, isOpen: boolean, onClose: () => void }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { prompt, confirm } = usePrompt();

  useEffect(() => {
    if (isOpen) {
      getDoc(doc(db, "padSettings", slug)).then(snap => {
        if (snap.exists()) setSettings(snap.data());
        setLoading(false);
      });
    }
  }, [isOpen, slug]);

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await setDoc(doc(db, "padSettings", slug), newSettings, { merge: true });
    toast("Security settings updated", "success");
  };

  const handlePasswordLock = async () => {
    if (settings.locked) {
      await updateSetting("locked", false);
      await updateSetting("password", "");
    } else {
      const password = await prompt({ title: "Set Password", placeholder: "Enter a strong password..." });
      if (password) {
        await updateSetting("locked", true);
        await updateSetting("password", password);
      }
    }
  };

  const handleSelfDestruct = async () => {
    if (settings.selfDelete) {
      await updateSetting("selfDelete", false);
      await updateSetting("deleteAt", "");
    } else {
      const mins = await prompt({ title: "Self Destruct", placeholder: "Minutes until destruction (e.g. 60)..." });
      if (mins && !isNaN(Number(mins))) {
        await updateSetting("selfDelete", true);
        await updateSetting("deleteAt", new Date(Date.now() + Number(mins) * 60000).toISOString());
      }
    }
  };

  const handleTimeLock = async () => {
    if (settings.timeLocked) {
      await updateSetting("timeLocked", false);
      await updateSetting("unlockAt", "");
    } else {
      const hours = await prompt({ title: "Time Lock", placeholder: "Hours to lock pad (e.g. 24)..." });
      if (hours && !isNaN(Number(hours))) {
        await updateSetting("timeLocked", true);
        await updateSetting("unlockAt", new Date(Date.now() + Number(hours) * 3600000).toISOString());
      }
    }
  };

  const handleDecoyMode = async () => {
    if (settings.decoyPassword) {
      const confirmRemove = await confirm({ title: "Remove Decoy", message: "Disable decoy mode?" });
      if (confirmRemove) {
        await updateSetting("decoyPassword", "");
        await updateSetting("decoyContent", "");
      }
    } else {
      const pass = await prompt({ title: "Decoy Setup 1/2", placeholder: "Enter decoy password..." });
      if (!pass) return;
      const content = await prompt({ title: "Decoy Setup 2/2", placeholder: "Enter fake content..." });
      if (content !== null) {
        await updateSetting("decoyPassword", pass);
        await updateSetting("decoyContent", content);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-xl">
              <Shield size={24} />
            </div>
            <h2 className="text-xl font-bold">Advanced Security</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="p-6 space-y-4">
            
            <div className="grid gap-4">
              {/* Password Lock */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <Lock size={20} className={settings.locked ? "text-blue-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Password Lock</h3>
                    <p className="text-xs text-slate-500">Require password to view</p>
                  </div>
                </div>
                <button 
                  onClick={handlePasswordLock}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${settings.locked ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {settings.locked ? "Disable" : "Enable"}
                </button>
              </div>

              {/* Self Destruct */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <Trash size={20} className={settings.selfDelete ? "text-red-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Self Destruct</h3>
                    <p className="text-xs text-slate-500">{settings.selfDelete ? `Deletes at ${new Date(settings.deleteAt).toLocaleString()}` : "Delete pad automatically"}</p>
                  </div>
                </div>
                <button 
                  onClick={handleSelfDestruct}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${settings.selfDelete ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {settings.selfDelete ? "Cancel" : "Set Timer"}
                </button>
              </div>

              {/* Time Lock */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <Clock size={20} className={settings.timeLocked ? "text-yellow-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Time Lock</h3>
                    <p className="text-xs text-slate-500">{settings.timeLocked ? `Unlocks at ${new Date(settings.unlockAt).toLocaleString()}` : "Lock until a specific time"}</p>
                  </div>
                </div>
                <button 
                  onClick={handleTimeLock}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${settings.timeLocked ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {settings.timeLocked ? "Cancel" : "Set Lock"}
                </button>
              </div>

              {/* Burn After Read */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <Flame size={20} className={settings.burnAfterRead ? "text-orange-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Burn After Read</h3>
                    <p className="text-xs text-slate-500">Destroy pad after next open</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={!!settings.burnAfterRead} onChange={() => updateSetting("burnAfterRead", !settings.burnAfterRead)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {/* Ghost Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <Ghost size={20} className={settings.ghostMode ? "text-purple-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Ghost Mode</h3>
                    <p className="text-xs text-slate-500">Hide from Pad Manager search</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={!!settings.ghostMode} onChange={() => updateSetting("ghostMode", !settings.ghostMode)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {/* Read Only Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <EyeOff size={20} className={settings.readOnly ? "text-cyan-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Read Only</h3>
                    <p className="text-xs text-slate-500">Prevent further edits to this pad</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={!!settings.readOnly} onChange={() => updateSetting("readOnly", !settings.readOnly)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* Decoy Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <EyeOff size={20} className={settings.decoyPassword ? "text-indigo-500" : "text-slate-400"} />
                  <div>
                    <h3 className="font-semibold text-sm">Decoy Mode</h3>
                    <p className="text-xs text-slate-500">Secondary password shows fake pad</p>
                  </div>
                </div>
                <button 
                  onClick={handleDecoyMode}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${settings.decoyPassword ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {settings.decoyPassword ? "Disable" : "Setup"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
