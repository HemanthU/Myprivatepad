"use client";

import { useEffect, useState } from "react";
import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { motion } from "framer-motion";

export default function CanvasBoard({ slug, isBurned }: { slug: string, isBurned: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="absolute inset-0 bg-card animate-pulse rounded-3xl" />;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 w-full h-full tldraw-wrapper"
    >
      <Tldraw 
        persistenceKey={isBurned ? undefined : `padX-canvas-${slug}`} 
        autoFocus={false} 
        hideUi={false}
      />
    </motion.div>
  );
}
