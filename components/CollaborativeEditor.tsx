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
import { encryptText, decryptText, hashRoomName } from "@/lib/clientCrypto";

const getRandomColor = () => {
  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function CollaborativeEditor({ 
  slug, isBurned, isDecoyMode, isLocked, initialText, language = "plaintext", customization, onStatsChange, onUsersChange 
}: { 
  slug: string, isBurned: boolean, isDecoyMode: boolean, isLocked: boolean, initialText?: string, language?: string, customization?: any, onStatsChange: (words: number, chars: number, text: string) => void, onUsersChange?: (users: any[]) => void 
}) {
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
          'editor.foreground': '#f8fafc',
        }
      });
      monaco.editor.defineTheme('padX-light', {
        base: 'vs',
        inherit: true,
        rules: [{ token: '', foreground: '0f172a' }],
        colors: {
          'editor.background': '#00000000', // transparent
          'editor.foreground': '#0f172a',
        }
      });
    }
  }, [monaco]);

  useEffect(() => {
    let webrtcProvider: WebrtcProvider | null = null;
    let observer: (event: Y.YTextEvent, transaction: Y.Transaction) => void;
    let timeout: NodeJS.Timeout;
    let isMounted = true;

    const setupSync = async () => {
      const password = isLocked ? sessionStorage.getItem(`padx-key-${slug}`) : null;
      const roomName = await hashRoomName(slug, password);

      if (!isMounted) return;

      webrtcProvider = new WebrtcProvider(roomName, ydoc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
      });
      
      webrtcProvider.awareness.setLocalStateField('user', {
        name: 'Anonymous Ghost',
        color: getRandomColor(),
      });

      webrtcProvider.awareness.on('change', () => {
        if (onUsersChange && webrtcProvider && isMounted) {
          const states = Array.from(webrtcProvider.awareness.getStates().values());
          const activeUsers = states.map(s => s.user).filter(Boolean);
          onUsersChange(activeUsers);
        }
      });

      if (isMounted) setProvider(webrtcProvider);

      const ytext = ydoc.getText("monaco");

      if (!initRef.current) {
        initRef.current = true;
        if (initialText) {
           if (ytext.toString() === "") ytext.insert(0, initialText);
        } else {
          try {
            const snap = await getDoc(doc(db, isDecoyMode ? "padSettings" : "notes", slug));
            if (snap.exists() && ytext.toString() === "") {
              let content = isDecoyMode ? snap.data().decoyContent : snap.data().content;
              if (content) {
                if (isLocked && password) {
                  try {
                    content = await decryptText(content, password);
                  } catch (e) {
                    console.warn("Failed to decrypt, treating as plaintext (migration fallback).");
                  }
                }
                ytext.insert(0, content);
              }
            }
          } catch (err) {
            console.error("Failed to load pad content", err);
          }
        }
      }

      observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
        const currentText = ytext.toString();
        const words = currentText.trim() === "" ? 0 : currentText.trim().split(/\s+/).length;
        onStatsChange(words, currentText.length, currentText);

        if (transaction.local && !isBurned) {
          if (!initRef.current) return;
          
          if (!sessionStorage.getItem(`snapshot-${slug}`)) {
            sessionStorage.setItem(`snapshot-${slug}`, 'true');
            // Snapshot on first edit of session
            (async () => {
              try {
                const saveText = (isLocked && password) ? await encryptText(currentText, password) : currentText;
                await setDoc(doc(db, "padVersions", slug, "snapshots", Date.now().toString()), {
                  text: saveText,
                  createdAt: new Date().toISOString(),
                  auto: true
                });
              } catch (e) { console.error("Snapshot error:", e); }
            })();
          }

          clearTimeout(timeout);
          timeout = setTimeout(async () => {
            try {
              let saveText = currentText;
              if (isLocked && password) {
                saveText = await encryptText(currentText, password);
              }
              
              if (isDecoyMode) {
                 const settingsSnap = await getDoc(doc(db, "padSettings", slug));
                 if (settingsSnap.exists()) {
                   await setDoc(doc(db, "padSettings", slug), {
                     ...settingsSnap.data(),
                     decoyContent: saveText
                   });
                 }
              } else {
                 await setDoc(doc(db, "notes", slug), { content: saveText, updatedAt: new Date().toISOString() });
              }
              toast("Pad Auto-Saved", "success");
            } catch (err: any) {
              console.error("Auto-save sync error:", err);
              toast("Sync Error: " + (err?.message || "Unknown error"), "error");
            }
          }, 1500);
        }
      };

      ytext.observe(observer);
    };

    setupSync();

    return () => {
      isMounted = false;
      const ytext = ydoc.getText("monaco");
      if (observer) ytext.unobserve(observer);
      if (webrtcProvider) webrtcProvider.destroy();
      if (bindingRef.current) bindingRef.current.destroy();
      clearTimeout(timeout);
    };
  }, [slug, isDecoyMode, isBurned, isLocked]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    if (provider) {
      const ytext = ydoc.getText("monaco");
      bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    }
  };

  const monacoTheme = theme === 'light' ? 'padX-light' : 'padX-dark';

  const mappedLanguage = language === 'plaintext' ? 'text' : language;

  // Evaluate Customizations
  let activeFontFamily = codeFont;
  let activeFontSize = fontSize;
  let activeLineHeight = lineHeight * fontSize;

  if (customization) {
    if (customization.font === 'serif') activeFontFamily = 'ui-serif, Georgia, serif';
    else if (customization.font === 'mono') activeFontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    else if (customization.font === 'cursive') activeFontFamily = 'cursive';

    if (customization.fontSize === 'small') activeFontSize = 12;
    else if (customization.fontSize === 'large') activeFontSize = 18;
    else if (customization.fontSize === 'xl') activeFontSize = 22;
    else if (customization.fontSize === 'default') activeFontSize = 14;

    if (customization.lineSpacing === 'compact') activeLineHeight = activeFontSize * 1.2;
    else if (customization.lineSpacing === 'relaxed') activeLineHeight = activeFontSize * 1.75;
    else if (customization.lineSpacing === 'loose') activeLineHeight = activeFontSize * 2.0;
    else if (customization.lineSpacing === 'normal') activeLineHeight = activeFontSize * 1.5;
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!provider) return <div className="animate-pulse flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  return (
    <div className="w-full flex-1 flex flex-col custom-monaco-wrapper relative">
      {isMobile ? (
        <textarea
          readOnly={isBurned}
          className="w-full h-full flex-1 resize-none bg-transparent outline-none p-4"
          style={{
            fontFamily: activeFontFamily,
            fontSize: activeFontSize,
            lineHeight: activeLineHeight,
            letterSpacing: letterSpacing
          }}
          value={ydoc.getText("monaco").toString()}
          onChange={(e) => {
            if (isBurned) return;
            const ytext = ydoc.getText("monaco");
            const val = e.target.value;
            // Simple replacement for mobile typing (not perfect sync but works for single user typing)
            ydoc.transact(() => {
              ytext.delete(0, ytext.length);
              ytext.insert(0, val);
            });
          }}
          placeholder="Start typing..."
        />
      ) : (
        <Editor
          height="100%"
          language={mappedLanguage}
          theme={monacoTheme}
          onMount={handleEditorDidMount}
          options={{
            readOnly: isBurned,
            fontFamily: activeFontFamily,
            fontSize: activeFontSize,
            lineHeight: activeLineHeight,
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
      )}
    </div>
  );
}

