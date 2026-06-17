"use client";

import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

export default function CanvasBoard({ slug, isBurned }: { slug: string, isBurned: boolean }) {
  return (
    <div className="w-full h-full flex-1 rounded-xl overflow-hidden relative" style={{ minHeight: '70vh' }}>
      <Tldraw persistenceKey={isBurned ? undefined : `padX-canvas-${slug}`} autoFocus={false} />
    </div>
  );
}
