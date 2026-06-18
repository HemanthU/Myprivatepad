"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Share2 } from "lucide-react";

interface ShareModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ slug, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 sm:p-0 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-sm bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out relative"
      >
        {/* Decorative ambient light */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-white/5 relative z-10">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100 tracking-tight">
            <Share2 className="text-indigo-500" /> Share Pad
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center gap-6 relative z-10">
          <div className="bg-white p-5 rounded-3xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-white/10 transform hover:scale-105 transition-transform duration-500">
            <QRCodeSVG 
              value={shareUrl} 
              size={180} 
              bgColor={"#ffffff"} 
              fgColor={"#0f172a"} 
              level={"Q"} 
              includeMargin={false}
            />
          </div>
          
          <div className="text-center space-y-1">
            <p className="font-bold text-lg text-slate-800 dark:text-slate-200 tracking-tight">Scan to Open</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Point your camera at the QR code to open this pad on your phone.</p>
          </div>

          <div className="w-full relative group mt-2">
            <input 
              readOnly 
              value={shareUrl} 
              className="w-full bg-white/80 dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-4 px-4 text-sm font-mono text-slate-600 dark:text-slate-300 outline-none pr-12 shadow-inner backdrop-blur-md transition-all group-hover:border-indigo-500/50"
            />
            <button 
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 shadow-sm active:scale-95"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
