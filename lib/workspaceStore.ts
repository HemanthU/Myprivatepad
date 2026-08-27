import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Folder {
  id: string;
  name: string;
  pads: string[];
}

export interface RecentPad {
  slug: string;
  label: string;
  lastOpened: string;
}

export interface WorkspaceState {
  folders: Folder[];
  recentPads: RecentPad[];
  isExplorerOpen: boolean;
  
  toggleExplorer: () => void;
  addRecentPad: (slug: string) => void;
  removePad: (slug: string) => void;
  updatePadLabel: (slug: string, label: string) => void;
  
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  movePadToFolder: (slug: string, folderId: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      folders: [],
      recentPads: [],
      isExplorerOpen: false,

      toggleExplorer: () => set((state) => ({ isExplorerOpen: !state.isExplorerOpen })),
      
      addRecentPad: (slug) => set((state) => {
        const existing = state.recentPads.find(p => p.slug === slug);
        const filtered = state.recentPads.filter(p => p.slug !== slug);
        return {
          recentPads: [
            { slug, label: existing?.label || slug, lastOpened: new Date().toISOString() },
            ...filtered
          ].slice(0, 50) // Keep last 50 pads
        };
      }),

      removePad: (slug) => set((state) => ({
        recentPads: state.recentPads.filter(p => p.slug !== slug),
        folders: state.folders.map(f => ({
          ...f,
          pads: f.pads.filter(p => p !== slug)
        }))
      })),

      updatePadLabel: (slug, label) => set((state) => ({
        recentPads: state.recentPads.map(p => p.slug === slug ? { ...p, label } : p)
      })),

      createFolder: (name) => set((state) => ({
        folders: [...state.folders, { id: Math.random().toString(36).substr(2, 9), name, pads: [] }]
      })),

      renameFolder: (id, name) => set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
      })),

      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter(f => f.id !== id)
      })),

      movePadToFolder: (slug, folderId) => set((state) => {
        // First remove from all folders
        const newFolders = state.folders.map(f => ({
          ...f,
          pads: f.pads.filter(p => p !== slug)
        }));
        
        // Then add to target folder if not null
        if (folderId) {
          const target = newFolders.find(f => f.id === folderId);
          if (target && !target.pads.includes(slug)) {
            target.pads.push(slug);
          }
        }
        
        return { folders: newFolders };
      }),
    }),
    {
      name: 'padx-workspace',
    }
  )
);
