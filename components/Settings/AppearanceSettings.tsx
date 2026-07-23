"use client";

import React, { useState } from "react";
import { useAppStore, ThemeType } from "@/lib/store";
import { Check, Monitor, Moon, Sun, Palette, Type, Layout, Sliders, Image as ImageIcon } from "lucide-react";

export default function AppearanceSettings() {
  const store = useAppStore();

  const themes: { id: ThemeType, label: string, icon: any }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={16} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { id: 'amoled', label: 'AMOLED', icon: <Moon size={16} /> },
    { id: 'glass', label: 'Glass', icon: <Palette size={16} /> },
    { id: 'nord', label: 'Nord', icon: <Palette size={16} /> },
    { id: 'dracula', label: 'Dracula', icon: <Palette size={16} /> },
    { id: 'solarized', label: 'Solarized', icon: <Sun size={16} /> },
    { id: 'catppuccin', label: 'Catppuccin', icon: <Palette size={16} /> },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: <Monitor size={16} /> }
  ];

  const presets = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Theme Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => store.setTheme(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                store.theme === t.id 
                  ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
                  : 'bg-card border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground'
              }`}
            >
              {t.icon}
              <span className="font-medium text-sm">{t.label}</span>
              {store.theme === t.id && <Check size={16} className="ml-auto" />}
            </button>
          ))}
        </div>
      </section>

      {/* Accent Colors */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Accent Color</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {presets.map(color => (
            <button
              key={color}
              onClick={() => store.setAccentColor(color)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
              style={{ backgroundColor: color }}
            >
              {store.accentColor === color && <Check size={16} className="text-white" />}
            </button>
          ))}
          <div className="w-[1px] h-8 bg-border mx-2" />
          <input 
            type="color" 
            value={store.accentColor} 
            onChange={(e) => store.setAccentColor(e.target.value)}
            className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 bg-transparent"
          />
        </div>
      </section>

      {/* Glassmorphism Settings */}
      <section className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Sliders size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Glassmorphism Mode</h4>
              <p className="text-xs text-gray-500">Enable frosted glass effects on cards and dialogs.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={store.glassmorphism} onChange={(e) => store.setGlassmorphism(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {store.glassmorphism && (
          <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Blur Intensity: {store.glassBlur}px</label>
              <input type="range" min="0" max="64" value={store.glassBlur} onChange={(e) => store.updateGlassSettings(Number(e.target.value), store.glassOpacity)} className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Opacity: {Math.round(store.glassOpacity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={store.glassOpacity} onChange={(e) => store.updateGlassSettings(store.glassBlur, Number(e.target.value))} className="w-full accent-blue-500" />
            </div>
          </div>
        )}
      </section>

      {/* Typography */}
      <section className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
            <Type size={18} />
          </div>
          <h4 className="font-semibold text-foreground">Typography</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Writing Font</label>
            <select 
              value={store.writingFont} 
              onChange={(e) => store.updateFonts(e.target.value, store.codeFont)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="IBM Plex Sans">IBM Plex Sans</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Code Font</label>
            <select 
              value={store.codeFont} 
              onChange={(e) => store.updateFonts(store.writingFont, e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
            >
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Fira Code">Fira Code</option>
              <option value="Cascadia Code">Cascadia Code</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Size: {store.fontSize}px</label>
            <input type="range" min="12" max="24" value={store.fontSize} onChange={(e) => store.updateTypography(Number(e.target.value), store.lineHeight, store.letterSpacing)} className="w-full accent-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Line Height: {store.lineHeight}</label>
            <input type="range" min="1" max="2.5" step="0.1" value={store.lineHeight} onChange={(e) => store.updateTypography(store.fontSize, Number(e.target.value), store.letterSpacing)} className="w-full accent-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Spacing: {store.letterSpacing}px</label>
            <input type="range" min="-1" max="5" step="0.5" value={store.letterSpacing} onChange={(e) => store.updateTypography(store.fontSize, store.lineHeight, Number(e.target.value))} className="w-full accent-blue-500" />
          </div>
        </div>
      </section>

    </div>
  );
}
