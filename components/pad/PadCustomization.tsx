"use client";

import { useState } from "react";
import { X, Palette, Type, AlignLeft, Layout, Smile, Droplets, Sparkles, Check } from "lucide-react";

export interface PadCustomizationSettings {
  icon: string;
  accent: string;
  background: string;
  font: string;
  fontSize: string;
  lineSpacing: string;
  width: string;
}

export const DEFAULT_CUSTOMIZATION: PadCustomizationSettings = {
  icon: "",
  accent: "",
  background: "",
  font: "default",
  fontSize: "medium",
  lineSpacing: "normal",
  width: "default",
};

const ACCENTS = [
  { value: "", label: "Pure White", color: "#ffffff" },
  { value: "#e2e8f0", label: "Silver Mist", color: "#e2e8f0" },
  { value: "#94a3b8", label: "Slate", color: "#94a3b8" },
  { value: "#8b5cf6", label: "Violet", color: "#8b5cf6" },
  { value: "#ec4899", label: "Pink", color: "#ec4899" },
  { value: "#ef4444", label: "Crimson", color: "#ef4444" },
  { value: "#f97316", label: "Amber", color: "#f97316" },
  { value: "#10b981", label: "Emerald", color: "#10b981" },
];

const BACKGROUND_TINTS = [
  { value: "", label: "Frosted Glass", color: "transparent" },
  { value: "rgba(0, 0, 0, 0.55)", label: "Obsidian", color: "#000000" },
  { value: "rgba(15, 23, 42, 0.6)", label: "Midnight Navy", color: "#0f172a" },
  { value: "rgba(6, 78, 59, 0.4)", label: "Deep Forest", color: "#064e3b" },
  { value: "rgba(88, 28, 135, 0.35)", label: "Amethyst", color: "#581c87" },
  { value: "rgba(255, 255, 255, 0.12)", label: "Polar Ice", color: "#e2e8f0" },
];

const FONTS = [
  { value: "default", label: "System", preview: "Aa" },
  { value: "serif", label: "Serif", preview: "Aa", style: "ui-serif, Georgia, serif" },
  { value: "mono", label: "Mono", preview: "Aa", style: "ui-monospace, monospace" },
  { value: "cursive", label: "Cursive", preview: "Aa", style: "cursive" },
];

const FONT_SIZES = [
  { value: "small", label: "S", px: "16px" },
  { value: "medium", label: "M", px: "20px" },
  { value: "large", label: "L", px: "22px" },
  { value: "xl", label: "XL", px: "26px" },
];

const LINE_SPACINGS = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
  { value: "loose", label: "Loose" },
];

const WIDTHS = [
  { value: "narrow", label: "Narrow" },
  { value: "default", label: "Default" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
];

const ICONS = ["", "📄", "📝", "💻", "📓", "🔒", "⚡", "🎯", "🚀", "💡", "📊", "✨"];

interface PadCustomizationProps {
  settings: PadCustomizationSettings;
  onChange: (settings: PadCustomizationSettings) => void;
  onClose: () => void;
}

export default function PadCustomization({ settings, onChange, onClose }: PadCustomizationProps) {
  const [saved, setSaved] = useState(false);

  const update = (key: keyof PadCustomizationSettings, value: string) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-white" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl glass-frosted border border-white/20 dark:border-white/10 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shadow-lg border border-white/20">
              <Palette size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Pad Appearance</h2>
              <p className="text-xs text-gray-500 leading-tight">Customise your pad canvas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check size={12} /> Saved
              </span>
            )}
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full glass-clear hover:glass-frosted flex items-center justify-center text-foreground hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">

          {/* Icon */}
          <Section icon={Smile} title="Pad Icon">
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => update("icon", icon)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all border ${
                    settings.icon === icon
                      ? "border-white bg-white/20 scale-110 shadow-md shadow-white/10"
                      : "border-white/10 glass-clear hover:border-white/20 hover:scale-105"
                  }`}
                >
                  {icon || <span className="text-xs text-gray-400">∅</span>}
                </button>
              ))}
            </div>
          </Section>

          {/* Accent Color */}
          <Section icon={Droplets} title="Accent Color">
            <div className="flex gap-2.5 flex-wrap">
              {ACCENTS.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("accent", value)}
                  title={label}
                  className={`w-8 h-8 rounded-full transition-all border-2 flex items-center justify-center ${
                    settings.accent === value 
                      ? "scale-110 border-white shadow-lg ring-2 ring-white/50" 
                      : "border-transparent hover:scale-105 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {!value && <span className="text-[10px] text-black font-bold">∅</span>}
                </button>
              ))}
            </div>
          </Section>

          {/* Canvas Background Tint */}
          <Section icon={Sparkles} title="Canvas Background Tint">
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_TINTS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => update("background", b.value)}
                  className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                    settings.background === b.value
                      ? "border-white bg-white/15 text-foreground shadow-sm"
                      : "border-white/10 glass-clear text-gray-400 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" 
                    style={{ backgroundColor: b.color }} 
                  />
                  <span className="truncate">{b.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Font Family */}
          <Section icon={Type} title="Font Family">
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => update("font", f.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.font === f.value
                      ? "border-white bg-white/15 text-foreground shadow-sm"
                      : "border-white/10 glass-clear text-gray-400 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  <span className="block text-lg leading-none mb-1 font-bold" style={{ fontFamily: f.style }}>
                    {f.preview}
                  </span>
                  <span className="text-xs font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Font Size */}
          <Section icon={Type} title="Font Size">
            <div className="grid grid-cols-4 gap-2">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => update("fontSize", f.value)}
                  className={`py-2 rounded-xl border text-sm font-bold transition-all ${
                    settings.fontSize === f.value
                      ? "border-white bg-white/15 text-foreground shadow-sm"
                      : "border-white/10 glass-clear text-gray-400 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Line Spacing */}
          <Section icon={AlignLeft} title="Line Spacing">
            <div className="grid grid-cols-2 gap-2">
              {LINE_SPACINGS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update("lineSpacing", s.value)}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    settings.lineSpacing === s.value
                      ? "border-white bg-white/15 text-foreground shadow-sm"
                      : "border-white/10 glass-clear text-gray-400 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Width */}
          <Section icon={Layout} title="Editor Canvas Width">
            <div className="grid grid-cols-4 gap-2">
              {WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => update("width", w.value)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                    settings.width === w.value
                      ? "border-white bg-white/15 text-foreground shadow-sm"
                      : "border-white/10 glass-clear text-gray-400 hover:text-foreground hover:border-white/20"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_CUSTOMIZATION)}
            className="text-xs text-gray-400 hover:text-foreground transition-colors"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-xs transition-all shadow-md shadow-white/10 active:scale-95"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
