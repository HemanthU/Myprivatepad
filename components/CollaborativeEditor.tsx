"use client";

import { useEffect, useState, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { MonacoBinding } from "y-monaco";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/useToast";
import { useAppStore } from "@/lib/store";

const getRandomColor = () => {
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function CollaborativeEditor({ slug, isBurned, isDecoyMode, initialText, language = "plaintext", onStatsChange, onUsersChange }: { slug: string, isBurned: boolean, isDecoyMode: boolean, initialText?: string, language?: string, onStatsChange: (words: number, chars: number, text: string) => void, onUsersChange?: (users: any[]) => void }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider>();
  const { toast } = useToast();
  const initRef = useRef(false);
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const monaco = useMonaco();
  const { theme, codeFont, fontSize, lineHeight, letterSpacing, wordWrap, minimap } = useAppStore();

  useEffect(() => {
    // Map custom themes to Monaco themes
    if (monaco) {
      monaco.editor.defineTheme('padX-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#00000000', // transparent
        }
      });
      monaco.editor.defineTheme('padX-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#00000000', // transparent
        }
      });
    }
  }, [monaco]);

  useEffect(() => {
    const webrtcProvider = new WebrtcProvider(`padX-secure-${slug}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });
    
    webrtcProvider.awareness.setLocalStateField('user', {
      name: 'Anonymous Ghost',
      color: getRandomColor(),
    });

    webrtcProvider.awareness.on('change', () => {
      if (onUsersChange) {
        const states = Array.from(webrtcProvider.awareness.getStates().values());
        const activeUsers = states.map(s => s.user).filter(Boolean);
        onUsersChange(activeUsers);
      }
    });

    setProvider(webrtcProvider);

    const ytext = ydoc.getText("monaco");

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
        if (!initRef.current) return;
        
        if (!sessionStorage.getItem(`snapshot-${slug}`)) {
          sessionStorage.setItem(`snapshot-${slug}`, 'true');
          setDoc(doc(db, "padVersions", slug, "snapshots", Date.now().toString()), {
            text: currentText,
            createdAt: new Date().toISOString(),
            auto: true
          }).catch(console.error);
        }

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
      if (bindingRef.current) bindingRef.current.destroy();
    };
  }, [slug, isDecoyMode, isBurned]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    if (provider) {
      const ytext = ydoc.getText("monaco");
      bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    }
  };

  const monacoTheme = theme === 'light' ? 'padX-light' : 'padX-dark';

  if (!provider) return <div className="animate-pulse flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  return (
    <div className="w-full flex-1 flex flex-col custom-monaco-wrapper">
      <Editor
        height="100%"
        language={language === 'plaintext' ? 'text' : language}
        theme={monacoTheme}
        onMount={handleEditorDidMount}
        options={{
          readOnly: isBurned,
          fontFamily: codeFont,
          fontSize: fontSize,
          lineHeight: lineHeight * fontSize,
          letterSpacing: letterSpacing,
          minimap: { enabled: minimap },
          wordWrap: wordWrap ? "on" : "off",
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: "always",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          }
        }}
        className="w-full h-full rounded-b-xl overflow-hidden"
      />
    </div>
  );
}
