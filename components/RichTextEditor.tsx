"use client";

import { useEffect, useMemo, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export default function RichTextEditor({ slug, isBurned, isDecoyMode }: { slug: string, isBurned: boolean, isDecoyMode: boolean }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider>();

  useEffect(() => {
    const webrtcProvider = new WebrtcProvider(`padX-rich-${slug}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });

    setProvider(webrtcProvider);

    return () => {
      webrtcProvider.destroy();
    };
  }, [slug, ydoc]);

  const editor = useCreateBlockNote({
    collaboration: provider ? {
      provider,
      fragment: ydoc.getXmlFragment("blocknote"),
      user: {
        name: "Anonymous",
        color: "#" + Math.floor(Math.random()*16777215).toString(16)
      }
    } : undefined
  });

  if (!provider) return <div className="animate-pulse flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  return (
    <div className="w-full h-full flex-1 overflow-auto custom-blocknote-wrapper">
      <BlockNoteView editor={editor} theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'} editable={!isBurned} />
    </div>
  );
}
