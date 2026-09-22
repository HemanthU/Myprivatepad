"use client";

export type PadType = 'text' | 'checklist' | 'markdown' | 'code' | 'journal';

const PAD_TYPES: { value: PadType; label: string; icon: string; description: string }[] = [
  { value: 'text', label: 'Text', icon: '📄', description: 'Plain text notes' },
  { value: 'checklist', label: 'Checklist', icon: '✅', description: 'Tasks & to-dos' },
  { value: 'markdown', label: 'Markdown', icon: '📝', description: 'Formatted writing' },
  { value: 'code', label: 'Code', icon: '💻', description: 'Code & scripts' },
  { value: 'journal', label: 'Journal', icon: '📓', description: 'Daily entries' },
];

interface PadTypeSelectorProps {
  value: PadType;
  onChange: (type: PadType) => void;
  compact?: boolean;
}

export default function PadTypeSelector({ value, onChange, compact }: PadTypeSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {PAD_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
              value === t.value
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {PAD_TYPES.map((t) => (
        <label
          key={t.value}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            value === t.value
              ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <input
            type="radio"
            name="padType"
            value={t.value}
            checked={value === t.value}
            onChange={() => onChange(t.value)}
            className="sr-only"
          />
          <span className="text-xl">{t.icon}</span>
          <span className="flex-1">
            <span className="font-semibold text-sm block">{t.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.description}</span>
          </span>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            value === t.value ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
          }`}>
            {value === t.value && <div className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white" />}
          </div>
        </label>
      ))}
    </div>
  );
}
