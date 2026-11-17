"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Share2, Printer, Sparkles } from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ShareModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ slug, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharingMode, setSharingMode] = useState<'private' | 'readonly' | 'edit'>('private');
  const [printKey, setPrintKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPrintKey((prev) => prev + 1);
      getDoc(doc(db, 'padSettings', slug)).then((snap) => {
        if (snap.exists() && snap.data().sharingMode) {
          setSharingMode(snap.data().sharingMode);
        }
      });
    }
  }, [isOpen, slug]);

  const handleModeChange = async (mode: 'private' | 'readonly' | 'edit') => {
    setSharingMode(mode);
    const snap = await getDoc(doc(db, 'padSettings', slug));
    await setDoc(
      doc(db, 'padSettings', slug),
      {
        ...(snap.exists() ? snap.data() : {}),
        sharingMode: mode,
        readOnly: mode === 'readonly'
      },
      { merge: true }
    );
  };

  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : "";
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 sm:p-0 animate-in fade-in duration-300">
      <div className="w-full max-w-md glass-frosted rounded-[2.5rem] border border-white/20 shadow-[0_35px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400 ease-out relative text-white">
        
        {/* Top ambient highlight */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl glass-clear border border-white/15">
              <Share2 size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Share Pad
                <Sparkles size={14} className="text-yellow-400" />
              </h2>
              <p className="text-xs text-gray-400 font-mono">pad/{slug}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full glass-clear hover:glass-frosted transition-colors text-gray-400 hover:text-white"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 sm:p-7 flex flex-col items-center gap-5 relative z-10">
          
          {/* Printer Slot Housing */}
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-xs flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                  Ticket Printer Online
                </span>
              </div>
              <button
                onClick={() => setPrintKey((k) => k + 1)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl glass-clear hover:glass-frosted border border-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition-all shadow-sm"
                title="Reprint QR Ticket"
              >
                <Printer size={12} />
                <span>Reprint</span>
              </button>
            </div>

            {/* Recessed Thermal Slot Slit */}
            <div className="w-64 sm:w-72 h-3 bg-black/90 rounded-full border border-white/20 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] relative z-20 mb-[-6px]" />

            {/* Thermal Receipt Ticket Emerging from Slot */}
            <div
              key={printKey}
              className="animate-receipt-print w-64 sm:w-72 bg-gradient-to-b from-[#ffffff] via-[#fafafa] to-[#f4f4f5] text-slate-900 rounded-t-sm receipt-sawtooth shadow-[0_25px_50px_rgba(0,0,0,0.45)] border-x border-t border-slate-200/90 pt-4 pb-7 px-4 flex flex-col items-center relative z-10 font-mono"
            >
              {/* Receipt Header Text */}
              <div className="w-full text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <p className="text-[11px] font-black tracking-widest uppercase text-slate-800">*** PADX PASS ***</p>
                <p className="text-[9px] text-slate-500 truncate">ID: #{slug}</p>
                <p className="text-[9px] text-slate-400">{formattedDate}</p>
              </div>

              {/* Status Row */}
              <div className="w-full flex justify-between items-center py-1.5 text-[9px] font-semibold text-slate-600 border-b border-dashed border-slate-300">
                <span>ACCESS:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 uppercase font-bold text-[8px]">
                  {sharingMode}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-inner my-2.5 flex items-center justify-center">
                <QRCodeSVG 
                  value={shareUrl} 
                  size={144} 
                  bgColor={"#ffffff"} 
                  fgColor={"#0f172a"} 
                  level={"Q"} 
                  includeMargin={false}
                />
              </div>

              {/* Scan Instruction */}
              <div className="w-full text-center border-t border-dashed border-slate-300 pt-1.5">
                <p className="text-[10px] font-extrabold tracking-wider uppercase text-slate-800">POINT CAMERA TO OPEN</p>
                <p className="text-[8px] text-slate-400 mt-0.5">ENCRYPTED VIA WEBRTC</p>
              </div>

              {/* Simulated Thermal Barcode */}
              <div className="flex items-center justify-center gap-[2px] h-5 w-40 mt-2 opacity-65">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                  <div key={idx} className="bg-slate-900 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Access Level Selector */}
          <div className="w-full flex flex-col gap-2 mt-1">
            <label className="text-xs font-semibold text-gray-300">Access Level</label>
            <div className="flex rounded-2xl glass-clear p-1 border border-white/10">
              {(['private', 'readonly', 'edit'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`flex-1 py-1.5 px-2 text-xs rounded-xl font-semibold transition-all ${
                    sharingMode === mode
                      ? 'bg-white text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              The pad link stays the same. The backend applies this rule instantly.
            </p>
          </div>

          {/* Share Link Copy Bar */}
          <div className="w-full relative group">
            <input 
              readOnly 
              value={shareUrl} 
              className="w-full glass-clear border border-white/15 rounded-2xl py-3 px-4 text-xs font-mono text-gray-200 outline-none pr-12 shadow-inner focus:border-white/40 transition-all"
            />
            <button 
              onClick={handleCopy}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white text-black hover:bg-gray-200 transition-all font-bold shadow-md active:scale-95 flex items-center justify-center"
              title="Copy Pad URL"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
