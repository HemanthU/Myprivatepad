"use client";

import { useState } from "react";
import { Folder as FolderIcon, FileText, ChevronRight, ChevronDown, MoreVertical, Plus, Edit2, Trash, X, Clock } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspaceStore";
import { useRouter } from "next/navigation";
import { usePrompt } from "@/hooks/usePrompt";

export default function Sidebar({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const { prompt, confirm } = usePrompt();
  const { folders, recentPads, isExplorerOpen, toggleExplorer, createFolder, renameFolder, deleteFolder, movePadToFolder, removePad, updatePadLabel } = useWorkspaceStore();
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = async () => {
    const name = await prompt({ title: "New Folder", placeholder: "Folder name..." });
    if (name) createFolder(name);
  };

  const handleRenameFolder = async (id: string, oldName: string) => {
    setActiveMenu(null);
    const name = await prompt({ title: "Rename Folder", defaultValue: oldName });
    if (name) renameFolder(id, name);
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    setActiveMenu(null);
    if (await confirm({ title: "Delete Folder", message: `Delete "${name}"? The pads will remain in Recent.` })) {
      deleteFolder(id);
    }
  };

  const handleRenamePad = async (slug: string, oldLabel: string) => {
    setActiveMenu(null);
    const label = await prompt({ title: "Rename Local Label", defaultValue: oldLabel });
    if (label) updatePadLabel(slug, label);
  };

  const handleRemovePad = async (slug: string) => {
    setActiveMenu(null);
    if (await confirm({ title: "Remove Pad", message: "Remove this pad from your local explorer? (The pad itself is not deleted from the server)" })) {
      removePad(slug);
      if (currentSlug === slug) router.push("/");
    }
  };

  const handleMovePad = async (slug: string) => {
    setActiveMenu(null);
    // Simple prompt for now, in a real app would be a dropdown/drag-drop
    const folderName = await prompt({ title: "Move to Folder", placeholder: "Exact folder name (or leave empty for Recent)..." });
    if (folderName === "" || folderName === null) {
      movePadToFolder(slug, null);
    } else {
      const folder = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
      if (folder) movePadToFolder(slug, folder.id);
      else alert("Folder not found");
    }
  };

  if (!isExplorerOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={toggleExplorer} />
      
      {/* Sidebar */}
      <div className="fixed sm:static top-0 left-0 h-full w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col z-50 transition-transform duration-300 transform translate-x-0">
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
          <span className="font-bold text-sm text-slate-500 uppercase tracking-widest">Explorer</span>
          <div className="flex gap-2">
            <button onClick={handleCreateFolder} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded" title="New Folder">
              <Plus size={16} />
            </button>
            <button onClick={toggleExplorer} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded sm:hidden" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Folders */}
          {folders.map(folder => (
            <div key={folder.id} className="mb-1">
              <div className="group flex items-center justify-between px-2 py-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 flex-1" onClick={() => toggleFolder(folder.id)}>
                  {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderIcon size={14} className="text-indigo-400" fill="currentColor" />
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                </div>
                <button onClick={() => setActiveMenu(activeMenu === `f-${folder.id}` ? null : `f-${folder.id}`)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded">
                  <MoreVertical size={14} />
                </button>
              </div>

              {/* Folder Menu */}
              {activeMenu === `f-${folder.id}` && (
                <div className="ml-6 mr-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1 shadow-lg text-sm mb-2 z-10 relative">
                  <button onClick={() => handleRenameFolder(folder.id, folder.name)} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"><Edit2 size={12}/> Rename</button>
                  <button onClick={() => handleDeleteFolder(folder.id, folder.name)} className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded flex items-center gap-2"><Trash size={12}/> Delete</button>
                </div>
              )}

              {/* Pads in Folder */}
              {expandedFolders[folder.id] && (
                <div className="ml-4 pl-2 border-l border-slate-200 dark:border-white/10 mt-1 flex flex-col gap-0.5">
                  {folder.pads.map(slug => {
                    const pad = recentPads.find(p => p.slug === slug);
                    if (!pad) return null;
                    return (
                      <div key={slug} className="group relative">
                        <div 
                          onClick={() => { if (currentSlug !== slug) router.push(`/${slug}`); }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${currentSlug === slug ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : 'hover:bg-slate-200 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                        >
                          <FileText size={14} className={currentSlug === slug ? 'text-indigo-500' : ''} />
                          <span className="truncate flex-1">{pad.label}</span>
                          <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === `p-${slug}` ? null : `p-${slug}`); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded">
                            <MoreVertical size={14} />
                          </button>
                        </div>
                        
                        {/* Pad Menu */}
                        {activeMenu === `p-${slug}` && (
                          <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1 shadow-lg text-sm z-20">
                            <button onClick={() => handleRenamePad(slug, pad.label)} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"><Edit2 size={12}/> Rename Label</button>
                            <button onClick={() => handleMovePad(slug)} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"><FolderIcon size={12}/> Move...</button>
                            <button onClick={() => handleRemovePad(slug)} className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded flex items-center gap-2"><X size={12}/> Remove from list</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {folder.pads.length === 0 && <span className="text-xs text-slate-400 italic px-2 py-1">Empty</span>}
                </div>
              )}
            </div>
          ))}

          {/* Recent (Pads not in any folder) */}
          <div className="mt-4 mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-slate-500 uppercase tracking-widest text-xs font-bold">
              <Clock size={12} /> Recent
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              {recentPads.filter(p => !folders.some(f => f.pads.includes(p.slug))).map(pad => (
                <div key={pad.slug} className="group relative">
                  <div 
                    onClick={() => { if (currentSlug !== pad.slug) router.push(`/${pad.slug}`); }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${currentSlug === pad.slug ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : 'hover:bg-slate-200 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                  >
                    <FileText size={14} className={currentSlug === pad.slug ? 'text-indigo-500' : ''} />
                    <span className="truncate flex-1">{pad.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === `p-${pad.slug}` ? null : `p-${pad.slug}`); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-white/10 rounded">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  
                  {/* Pad Menu */}
                  {activeMenu === `p-${pad.slug}` && (
                    <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1 shadow-lg text-sm z-20">
                      <button onClick={() => handleRenamePad(pad.slug, pad.label)} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"><Edit2 size={12}/> Rename Label</button>
                      <button onClick={() => handleMovePad(pad.slug)} className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded flex items-center gap-2"><FolderIcon size={12}/> Move...</button>
                      <button onClick={() => handleRemovePad(pad.slug)} className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded flex items-center gap-2"><X size={12}/> Remove from list</button>
                    </div>
                  )}
                </div>
              ))}
              {recentPads.filter(p => !folders.some(f => f.pads.includes(p.slug))).length === 0 && (
                <span className="text-xs text-slate-400 italic px-2 py-1">No recent pads</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
