"use client";

import { useEffect, useState, useRef } from "react";
import { WifiOff } from "lucide-react";
import Editor, { useMonaco } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { MonacoBinding } from "y-monaco";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/useToast";
import { useAppStore } from "@/lib/store";
import { encryptText, decryptText, hashRoomName } from "@/lib/clientCrypto";
import { defineMonacoThemes } from "@/lib/monacoThemes";

const getRandomColor = () => {
  const colors = ["#ef4444", "#ffffff", "#10b981", "#f59e0b", "#d946ef", "#a855f7", "#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function CollaborativeEditor({ 
  slug, isBurned, isDecoyMode, isLocked, initialText, language = "plaintext", customization, onStatsChange, onUsersChange, onStatusChange 
}: { 
  slug: string, isBurned: boolean, isDecoyMode: boolean, isLocked: boolean, initialText?: string, language?: string, customization?: any, onStatsChange: (words: number, chars: number, text: string) => void, onUsersChange?: (users: any[]) => void, onStatusChange?: (status: "Synced" | "Saving..." | "Connecting..." | "Offline" | "Sync Error") => void 
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
      const transparentBackground = '#00000000';
      monaco.editor.defineTheme('padX-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': transparentBackground,
          'editor.foreground': '#f8fafc',
          'editorGutter.background': transparentBackground,
          'editorLineNumber.foreground': 'rgba(255, 255, 255, 0.3)',
          'editorLineNumber.activeForeground': '#ffffff',
          'editorCursor.foreground': '#ffffff',
          'editor.selectionBackground': 'rgba(255, 255, 255, 0.15)',
          'editor.lineHighlightBackground': transparentBackground,
          'editor.lineHighlightBorder': transparentBackground,
          'editorOverviewRuler.border': transparentBackground,
        }
      });
      monaco.editor.defineTheme('padX-light', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ token: '', foreground: 'f8fafc' }],
        colors: {
          'editor.background': transparentBackground,
          'editor.foreground': '#f8fafc',
          'editorGutter.background': transparentBackground,
          'editorLineNumber.foreground': 'rgba(255, 255, 255, 0.3)',
          'editorLineNumber.activeForeground': '#ffffff',
          'editorCursor.foreground': '#ffffff',
          'editor.selectionBackground': 'rgba(255, 255, 255, 0.15)',
          'editor.lineHighlightBackground': transparentBackground,
          'editor.lineHighlightBorder': transparentBackground,
          'editorOverviewRuler.border': transparentBackground,
        }
      });
      defineMonacoThemes(monaco);
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
        if (initialText) {
          if (ytext.toString() === "") ytext.insert(0, initialText);
          initRef.current = true;
          onStatusChange?.("Synced");
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
          } finally {
            initRef.current = true;
            onStatusChange?.("Synced");
          }
        }
      }

      observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
        const currentText = ytext.toString();
        const words = currentText.trim() === "" ? 0 : currentText.trim().split(/\s+/).length;
        onStatsChange(words, currentText.length, currentText);

        if (transaction.local && !isBurned) {
          if (!initRef.current) return;
          
          // Instant feedback: notify UI that writing is in progress
          onStatusChange?.("Saving...");

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
          // High-speed 750ms debounce for lightning-fast auto-save
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
              onStatusChange?.("Synced");
              toast("Pad Auto-Saved", "success");
            } catch (err: any) {
              onStatusChange?.("Sync Error");
              console.error("Auto-save sync error:", err);
              toast("Sync Error: " + (err?.message || "Unknown error"), "error");
            }
          }, 750);
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

  const customThemes = ['amoled', 'nord', 'dracula', 'solarized', 'catppuccin', 'cyberpunk', 'glass'];
  const monacoTheme = customThemes.includes(theme) ? theme : (theme === 'light' ? 'padX-light' : 'padX-dark');

  const mappedLanguage = language === 'plaintext' ? 'text' : language;

  // Generous, beautiful typography for comfortable writing
  let activeFontFamily = codeFont || "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace";
  let activeFontSize = fontSize && fontSize >= 18 ? fontSize : 20;
  let activeLineHeight = Math.round(activeFontSize * 1.65);

  if (customization) {
    if (customization.font === 'serif') activeFontFamily = 'ui-serif, Georgia, serif';
    else if (customization.font === 'mono') activeFontFamily = "'JetBrains Mono', 'Fira Code', ui-monospace, monospace";
    else if (customization.font === 'cursive') activeFontFamily = 'cursive';

    if (customization.fontSize === 'small') activeFontSize = 16;
    else if (customization.fontSize === 'medium' || customization.fontSize === 'default') activeFontSize = 20;
    else if (customization.fontSize === 'large') activeFontSize = 22;
    else if (customization.fontSize === 'xl') activeFontSize = 26;

    activeLineHeight = Math.round(activeFontSize * 1.65);
  }

  // Dynamically update Monaco editor options on customization change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontFamily: activeFontFamily,
        fontSize: activeFontSize,
        lineHeight: activeLineHeight,
        letterSpacing: letterSpacing,
        minimap: { enabled: minimap },
        wordWrap: wordWrap ? "on" : "off",
        lineNumbers: "on",
        lineDecorationsWidth: 20,
        lineNumbersMinChars: 4,
        glyphMargin: false,
        folding: false,
        renderLineHighlight: "none",
        renderLineHighlightOnlyWhenFocus: false,
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderWhitespace: "none",
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false,
        }
      });
    }
  }, [activeFontFamily, activeFontSize, activeLineHeight, letterSpacing, minimap, wordWrap]);

  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!provider) return <div className="animate-pulse flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl" />;

  return (
    <div className="w-full flex-1 flex flex-col custom-monaco-wrapper relative">
      {isOffline && (
        <div className="absolute top-2 right-2 z-50 glass-frosted text-yellow-500 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-semibold shadow-md backdrop-blur-md">
          <WifiOff size={14} />
          Offline - Saving Locally
        </div>
      )}
      {isMobile ? (
        <textarea
          readOnly={isBurned}
          className="w-full h-full flex-1 resize-none bg-transparent outline-none p-4 text-foreground selection:bg-white/20"
          style={{
            fontFamily: activeFontFamily,
            fontSize: activeFontSize,
            lineHeight: `${activeLineHeight}px`,
            letterSpacing: letterSpacing
          }}
          defaultValue={ydoc.getText("monaco").toString()}
          onInput={(e: any) => {
            if (isBurned) return;
            const ytext = ydoc.getText("monaco");
            const val = e.target.value;
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
            lineNumbers: "on",
            lineDecorationsWidth: 20,
            lineNumbersMinChars: 4,
            glyphMargin: false,
            folding: false,
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            renderWhitespace: "none",
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            padding: { top: 20, bottom: 20 },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: false,
            }
          }}
          className="w-full h-full rounded-b-xl overflow-hidden"
        />
      )}
    </div>
  );
}

