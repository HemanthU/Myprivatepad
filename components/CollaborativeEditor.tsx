"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { yCollab } from "y-codemirror.next";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EditorView } from "@codemirror/view";
import { useToast } from "@/hooks/useToast";

const getRandomColor = () => {
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function CollaborativeEditor({ slug, isBurned, isDecoyMode, initialText, language = "plaintext", onStatsChange }: { slug: string, isBurned: boolean, isDecoyMode: boolean, initialText?: string, language?: string, onStatsChange: (words: number, chars: number, text: string) => void }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider>();
  const [langExtension, setLangExtension] = useState<any>(null);
  const { toast } = useToast();
  const initRef = useRef(false);

  useEffect(() => {
    const loadLang = async () => {
      if (language && language !== "plaintext") {
        try {
          const { langs } = await import("@uiw/codemirror-extensions-langs");
          if ((langs as any)[language]) {
            setLangExtension((langs as any)[language]());
          } else {
            setLangExtension(null);
          }
        } catch (e) {
          console.error("Failed to load language extension", e);
        }
      } else {
        setLangExtension(null);
      }
    };
    loadLang();
  }, [language]);

  useEffect(() => {
    // Serverless WebRTC room for this specific pad
    const webrtcProvider = new WebrtcProvider(`padX-secure-${slug}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });
    
    // Assign a random color and name for the multiplayer cursor
    webrtcProvider.awareness.setLocalStateField('user', {
      name: 'Anonymous Ghost',
      color: getRandomColor(),
    });

    setProvider(webrtcProvider);

    const ytext = ydoc.getText("codemirror");

    // Load from Firebase initially if empty
    if (!initRef.current) {
      initRef.current = true;
      if (initialText) {
         if (ytext.toString() === "") ytext.insert(0, initialText);
      } else {
        getDoc(doc(db, isDecoyMode ? "padSettings" : "notes", slug)).then(snap => {
          if (snap.exists() && ytext.toString() === "") {
            const content = isDecoyMode ? snap.data().decoyContent : snap.data().content;
            ytext.insert(0, content || "");
          }
        });
      }
    }

    let timeout: NodeJS.Timeout;
    const observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
      const currentText = ytext.toString();
      const words = currentText.trim() === "" ? 0 : currentText.trim().split(/\s+/).length;
      onStatsChange(words, currentText.length, currentText);

      if (transaction.local && !isBurned) {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          try {
            if (isDecoyMode) {
               const settingsSnap = await getDoc(doc(db, "padSettings", slug));
               if (settingsSnap.exists()) {
                 await setDoc(doc(db, "padSettings", slug), {
                   ...settingsSnap.data(),
                   decoyContent: currentText
                 });
               }
            } else {
               await setDoc(doc(db, "notes", slug), { content: currentText, updatedAt: new Date() });
            }
            toast("Pad Auto-Saved", "success");
          } catch {
            toast("Sync Error", "error");
          }
        }, 1500);
      }
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
      webrtcProvider.destroy();
    };
  }, [slug, isDecoyMode, isBurned]);

  const extensions = useMemo(() => {
    if (!provider) return [];
    const baseExtensions = [
      yCollab(ydoc.getText("codemirror"), provider.awareness),
      EditorView.theme({
        "&": { backgroundColor: "transparent", height: "100%", fontSize: "1.125rem", fontFamily: "inherit", outline: "none" },
        ".cm-scroller": { fontFamily: "inherit", overflow: "auto" },
        ".cm-content": { fontFamily: "inherit", padding: "0" },
        "&.cm-focused": { outline: "none" },
        ".cm-cursor": { borderLeftColor: "var(--foreground)" }
      })
    ];
    if (langExtension) {
      baseExtensions.push(langExtension);
    }
    return baseExtensions;
  }, [provider, ydoc, langExtension]);

  if (!provider) return <div className="animate-pulse flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  return (
    <CodeMirror
      extensions={extensions}
      readOnly={isBurned}
      basicSetup={{ 
        lineNumbers: false, 
        foldGutter: false, 
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        bracketMatching: false
      }}
      theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
      className="w-full flex-1 flex flex-col custom-cm-wrapper"
    />
  );
}
