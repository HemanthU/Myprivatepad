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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
      <div 
        className="w-full max-w-sm bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Share2 className="text-indigo-500" /> Share Pad
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center gap-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
            <QRCodeSVG 
              value={shareUrl} 
              size={180} 
              bgColor={"#ffffff"} 
              fgColor={"#000000"} 
              level={"M"} 
              includeMargin={false}
            />
          </div>
          
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">Scan to Open</p>
            <p className="text-sm text-gray-500">Point your camera at the QR code to open this pad on your phone.</p>
          </div>

          <div className="w-full relative group">
            <input 
              readOnly 
              value={shareUrl} 
              className="w-full bg-gray-100 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-300 outline-none pr-12"
            />
            <button 
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-all text-gray-600 dark:text-gray-300 shadow-sm"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
