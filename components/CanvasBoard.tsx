"use client";

import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

export default function CanvasBoard({ slug, isBurned }: { slug: string, isBurned: boolean }) {
  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={isBurned ? undefined : `padX-canvas-${slug}`} autoFocus={false} />
    </div>
  );
}
