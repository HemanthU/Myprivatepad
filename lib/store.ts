import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'light' | 'dark' | 'amoled' | 'glass' | 'nord' | 'dracula' | 'solarized' | 'catppuccin' | 'cyberpunk';

export interface AppSettings {
  // Appearance
  theme: ThemeType;
  accentColor: string;
  
  // Glassmorphism
  glassmorphism: boolean;
  glassBlur: number;
  glassOpacity: number;
  
  // Wallpapers
  wallpaper: string | null;
  wallpaperBlur: number;
  wallpaperOpacity: number;
  wallpaperBrightness: number;

  // Fonts
  writingFont: string;
  codeFont: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;

  // Editor Layout
  layout: 'editor-only' | 'split-vertical' | 'split-horizontal' | 'preview-only';
  wordWrap: boolean;
  minimap: boolean;

  // Actions
  setTheme: (theme: ThemeType) => void;
  setAccentColor: (color: string) => void;
  setGlassmorphism: (enabled: boolean) => void;
  updateGlassSettings: (blur: number, opacity: number) => void;
  setWallpaper: (url: string | null) => void;
  updateWallpaperSettings: (blur: number, opacity: number, brightness: number) => void;
  updateFonts: (writing: string, code: string) => void;
  updateTypography: (size: number, lineH: number, letterS: number) => void;
  setLayout: (layout: AppSettings['layout']) => void;
  updateEditorOptions: (wrap: boolean, showMinimap: boolean) => void;
}

export const useAppStore = create<AppSettings>()(
  persist(
    (set) => ({
      theme: 'dark',
      accentColor: '#3b82f6', // Default blue
      
      glassmorphism: false,
      glassBlur: 16,
      glassOpacity: 0.65,
      
      wallpaper: null,
      wallpaperBlur: 0,
      wallpaperOpacity: 100,
      wallpaperBrightness: 100,

      writingFont: 'Inter',
      codeFont: 'JetBrains Mono',
      fontSize: 14,
      lineHeight: 1.5,
      letterSpacing: 0,

      layout: 'editor-only',
      wordWrap: true,
      minimap: false,

      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
      setGlassmorphism: (enabled) => set({ glassmorphism: enabled }),
      updateGlassSettings: (blur, opacity) => set({ glassBlur: blur, glassOpacity: opacity }),
      setWallpaper: (url) => set({ wallpaper: url }),
      updateWallpaperSettings: (blur, opacity, brightness) => set({ wallpaperBlur: blur, wallpaperOpacity: opacity, wallpaperBrightness: brightness }),
      updateFonts: (writing, code) => set({ writingFont: writing, codeFont: code }),
      updateTypography: (size, lineH, letterS) => set({ fontSize: size, lineHeight: lineH, letterSpacing: letterS }),
      setLayout: (layout) => set({ layout }),
      updateEditorOptions: (wrap, showMinimap) => set({ wordWrap: wrap, minimap: showMinimap }),
    }),
    {
      name: 'padx-settings',
    }
  )
);
