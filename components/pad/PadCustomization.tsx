"use client";

import { useState } from "react";
import { X, Palette } from "lucide-react";

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
  icon: '',
  accent: '',
  background: '',
  font: 'default',
  fontSize: 'medium',
  lineSpacing: 'normal',
  width: 'default',
};

const ACCENTS = ['', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#10b981', '#14b8a6'];
const BACKGROUNDS = ['', '#0f172a', '#1e1b4b', '#172554', '#14532d', '#1c1917', '#fafaf9', '#f0f9ff'];
const FONTS = [
  { value: 'default', label: 'System' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'cursive', label: 'Cursive' },
];
const FONT_SIZES = [
  { value: 'small', label: 'Small', size: '13px' },
  { value: 'medium', label: 'Medium', size: '15px' },
  { value: 'large', label: 'Large', size: '17px' },
  { value: 'xl', label: 'XL', size: '20px' },
];
const LINE_SPACINGS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'loose', label: 'Loose' },
];
const WIDTHS = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'default', label: 'Default' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
];
const ICONS = ['', '📄', '📝', '💻', '📓', '🔒', '⚡', '🎯', '🚀', '💡', '📊', '🗒️'];

interface PadCustomizationProps {
  settings: PadCustomizationSettings;
  onChange: (settings: PadCustomizationSettings) => void;
  onClose: () => void;
}

export default function PadCustomization({ settings, onChange, onClose }: PadCustomizationProps) {
  const update = (key: keyof PadCustomizationSettings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Palette size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold">Pad Appearance</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Icon */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} onClick={() => update('icon', icon)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
                    settings.icon === icon ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-white/10' : 'border-transparent hover:border-gray-200 dark:hover:border-white/20'
                  }`}>
                  {icon || <span className="text-xs text-gray-400">∅</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENTS.map(color => (
                <button key={color} onClick={() => update('accent', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    settings.accent === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color || undefined }}
                  title={color || 'Default'}>
                  {!color && <span className="text-xs text-gray-400 w-full h-full flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-full">∅</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Font</label>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(f => (
                <button key={f.value} onClick={() => update('font', f.value)}
                  className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                    settings.font === f.value ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Font Size</label>
            <div className="grid grid-cols-4 gap-2">
              {FONT_SIZES.map(f => (
                <button key={f.value} onClick={() => update('fontSize', f.value)}
                  className={`p-2 rounded-xl border text-sm transition-all ${
                    settings.fontSize === f.value ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5 font-bold' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Line Spacing</label>
            <div className="grid grid-cols-2 gap-2">
              {LINE_SPACINGS.map(s => (
                <button key={s.value} onClick={() => update('lineSpacing', s.value)}
                  className={`p-2.5 rounded-xl border text-sm transition-all ${
                    settings.lineSpacing === s.value ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5 font-semibold' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Editor Width</label>
            <div className="grid grid-cols-2 gap-2">
              {WIDTHS.map(w => (
                <button key={w.value} onClick={() => update('width', w.value)}
                  className={`p-2.5 rounded-xl border text-sm transition-all ${
                    settings.width === w.value ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5 font-semibold' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  }`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
