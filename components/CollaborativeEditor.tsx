"use client";

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { WifiOff, Search, ArrowUp, ArrowDown, Replace, X } from "lucide-react";
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

function applySplice(ytext: Y.Text, newVal: string) {
  const oldVal = ytext.toString();
  if (oldVal === newVal) return;

  let start = 0;
  while (start < oldVal.length && start < newVal.length && oldVal[start] === newVal[start]) {
    start++;
  }

  let endOld = oldVal.length;
  let endNew = newVal.length;
  while (endOld > start && endNew > start && oldVal[endOld - 1] === newVal[endNew - 1]) {
    endOld--;
    endNew--;
  }

  const deleteCount = endOld - start;
  const insertText = newVal.substring(start, endNew);

  ytext.doc?.transact(() => {
    if (deleteCount > 0) {
      ytext.delete(start, deleteCount);
    }
    if (insertText.length > 0) {
      ytext.insert(start, insertText);
    }
  });
}

export interface CollaborativeEditorProps {
  slug: string;
  isBurned: boolean;
  isDecoyMode: boolean;
  isLocked: boolean;
  initialText?: string;
  language?: string;
  customization?: any;
  onStatsChange: (words: number, chars: number, text: string) => void;
  onUsersChange?: (users: any[]) => void;
  onStatusChange?: (status: "Synced" | "Saving..." | "Connecting..." | "Offline" | "Sync Error") => void;
}

export interface CollaborativeEditorHandle {
  selectAll: () => void;
  copy: () => void;
  paste: () => void;
  toggleFind: () => void;
}

const CollaborativeEditor = forwardRef<CollaborativeEditorHandle, CollaborativeEditorProps>(function CollaborativeEditor(
  {
    slug,
    isBurned,
    isDecoyMode,
    isLocked,
    initialText,
    language = "plaintext",
    customization,
    onStatsChange,
    onUsersChange,
    onStatusChange
  },
  ref
) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider>();
  const { toast } = useToast();
  const initRef = useRef(false);
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const monaco = useMonaco();
  const { theme, editorTheme, setEditorTheme, codeFont, fontSize, lineHeight, letterSpacing, wordWrap, minimap } = useAppStore();

  const [mobileText, setMobileText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Floating Find & Replace State
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matchesCount, setMatchesCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Expose imperative handle for toolbar buttons
  useImperativeHandle(ref, () => ({
    selectAll: () => {
      if (isMobile && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      } else if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          editorRef.current.setSelection(model.getFullModelRange());
          editorRef.current.focus();
        }
      }
      toast("All text selected", "info");
    },
    copy: () => {
      let textToCopy = "";
      if (isMobile && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
          textToCopy = textareaRef.current.value.substring(start, end);
        } else {
          textToCopy = textareaRef.current.value;
        }
      } else if (editorRef.current) {
        const sel = editorRef.current.getSelection();
        if (sel && !sel.isEmpty()) {
          textToCopy = editorRef.current.getModel()?.getValueInRange(sel) || "";
        } else {
          textToCopy = editorRef.current.getValue();
        }
      }
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        toast("Copied to clipboard!", "success");
      }
    },
    paste: async () => {
      try {
        const clip = await navigator.clipboard.readText();
        if (!clip) return;
        if (isMobile && textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const oldVal = textareaRef.current.value;
          const newVal = oldVal.substring(0, start) + clip + oldVal.substring(end);
          setMobileText(newVal);
          const ytext = ydoc.getText("monaco");
          applySplice(ytext, newVal);
          setTimeout(() => {
            textareaRef.current?.setSelectionRange(start + clip.length, start + clip.length);
            textareaRef.current?.focus();
          }, 10);
        } else if (editorRef.current) {
          const sel = editorRef.current.getSelection();
          editorRef.current.executeEdits('paste', [{ range: sel, text: clip }]);
          editorRef.current.focus();
        }
        toast("Pasted from clipboard!", "success");
      } catch (e) {
        toast("Clipboard access denied or unsupported", "error");
      }
    },
    toggleFind: () => {
      setIsFindOpen((prev) => {
        const next = !prev;
        if (next) {
          setTimeout(() => searchInputRef.current?.focus(), 60);
        }
        return next;
      });
    }
  }));

  // Register custom Monaco themes
  const registerThemes = (monacoInstance: any) => {
    if (!monacoInstance) return;
    monacoInstance.editor.defineTheme('padX-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'ffffff' },
        { token: 'text', foreground: 'ffffff' },
        { token: 'keyword', foreground: 'f472b6' },
        { token: 'string', foreground: 'e2e8f0' },
        { token: 'number', foreground: '38bdf8' },
        { token: 'comment', foreground: '94a3b8' },
        { token: 'type', foreground: 'a78bfa' },
        { token: 'function', foreground: '60a5fa' },
        { token: 'variable', foreground: 'ffffff' },
      ],
      colors: {
        'editor.background': '#070b14',
        'editor.foreground': '#ffffff',
        'editorGutter.background': '#070b14',
        'editorLineNumber.foreground': 'rgba(255, 255, 255, 0.4)',
        'editorLineNumber.activeForeground': '#ffffff',
        'editorCursor.foreground': '#ffffff',
        'editor.selectionBackground': 'rgba(255, 255, 255, 0.25)',
        'editor.lineHighlightBackground': '#00000000',
        'editor.lineHighlightBorder': '#00000000',
        'editorOverviewRuler.border': '#00000000',
        'focusBorder': '#00000000',
        'editor.focusBorder': '#00000000',
        'editorWidget.border': 'rgba(255, 255, 255, 0.15)',
        'editorWidget.background': '#070b14',
      }
    });
    monacoInstance.editor.defineTheme('padX-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '0f172a' },
        { token: 'text', foreground: '0f172a' },
        { token: 'keyword', foreground: 'c026d3' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: '0284c7' },
        { token: 'comment', foreground: '64748b' },
        { token: 'type', foreground: '7c3aed' },
        { token: 'function', foreground: '2563eb' },
        { token: 'variable', foreground: '0f172a' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editorGutter.background': '#ffffff',
        'editorLineNumber.foreground': 'rgba(15, 23, 42, 0.45)',
        'editorLineNumber.activeForeground': '#0f172a',
        'editorCursor.foreground': '#0f172a',
        'editor.selectionBackground': 'rgba(0, 0, 0, 0.12)',
        'editor.lineHighlightBackground': '#00000000',
        'editor.lineHighlightBorder': '#00000000',
        'editorOverviewRuler.border': '#00000000',
        'focusBorder': '#00000000',
        'editor.focusBorder': '#00000000',
        'editorWidget.border': 'rgba(0, 0, 0, 0.1)',
        'editorWidget.background': '#ffffff',
      }
    });
    defineMonacoThemes(monacoInstance);
  };

  useEffect(() => {
    if (monaco) {
      registerThemes(monaco);
    }
  }, [monaco]);

  const customThemes = ['amoled', 'nord', 'dracula', 'solarized', 'catppuccin', 'cyberpunk', 'glass'];
  const monacoTheme = editorTheme === 'light' ? 'padX-light' : customThemes.includes(theme) ? theme : 'padX-dark';

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme, monaco]);

  // Synchronize language syntax dynamically
  useEffect(() => {
    if (editorRef.current && monaco) {
      const model = editorRef.current.getModel();
      if (model) {
        const lang = language === 'plaintext' ? 'text' : language;
        monaco.editor.setModelLanguage(model, lang);
      }
    }
  }, [language, monaco]);

  // Global Ctrl+F / Cmd+F & Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 60);
      } else if (e.key === 'Escape' && isFindOpen) {
        setIsFindOpen(false);
        if (editorRef.current) editorRef.current.focus();
        else if (textareaRef.current) textareaRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFindOpen]);

  // Find logic for Monaco Editor
  const handleFind = (term: string, forward = true) => {
    if (!editorRef.current || !term) {
      setMatchesCount(0);
      setCurrentMatchIndex(0);
      return;
    }
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(term, false, false, false, null, true, 2000);
    setMatchesCount(matches.length);

    if (matches.length === 0) {
      setCurrentMatchIndex(0);
      return;
    }

    const nextIndex = forward
      ? (currentMatchIndex + 1) % matches.length
      : (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(nextIndex);
    editor.setSelection(matches[nextIndex].range);
    editor.revealRangeInCenter(matches[nextIndex].range);
  };

  const handleReplace = () => {
    if (!editorRef.current || !searchTerm) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(searchTerm, false, false, false, null, true, 2000);
    if (matches.length === 0) return;
    const match = matches[currentMatchIndex] || matches[0];
    editor.executeEdits('find-replace', [{ range: match.range, text: replaceTerm }]);
    handleFind(searchTerm, true);
  };

  const handleReplaceAll = () => {
    if (!editorRef.current || !searchTerm) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(searchTerm, false, false, false, null, true, 2000);
    if (matches.length === 0) return;
    const edits = matches.map((m: any) => ({ range: m.range, text: replaceTerm }));
    editor.executeEdits('find-replace', edits);
    toast(`Replaced ${matches.length} occurrences`, "success");
    handleFind(searchTerm, true);
  };

  // Find & Replace logic for mobile textarea
  const handleMobileFind = (term: string, forward = true) => {
    if (!textareaRef.current || !term) {
      setMatchesCount(0);
      return;
    }
    const val = textareaRef.current.value.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const indices: number[] = [];
    let pos = 0;
    while ((pos = val.indexOf(lowerTerm, pos)) !== -1) {
      indices.push(pos);
      pos += lowerTerm.length;
    }
    setMatchesCount(indices.length);
    if (indices.length === 0) return;
    const nextIdx = forward
      ? (currentMatchIndex + 1) % indices.length
      : (currentMatchIndex - 1 + indices.length) % indices.length;
    setCurrentMatchIndex(nextIdx);
    const targetPos = indices[nextIdx];
    textareaRef.current.setSelectionRange(targetPos, targetPos + term.length);
    textareaRef.current.focus();
  };

  const handleMobileReplace = (all = false) => {
    if (!textareaRef.current || !searchTerm) return;
    const val = textareaRef.current.value;
    let newVal = val;
    if (all) {
      newVal = val.split(searchTerm).join(replaceTerm);
      toast("Replaced all occurrences", "success");
    } else {
      const selStart = textareaRef.current.selectionStart;
      const selEnd = textareaRef.current.selectionEnd;
      if (selStart !== selEnd && val.substring(selStart, selEnd) === searchTerm) {
        newVal = val.substring(0, selStart) + replaceTerm + val.substring(selEnd);
      } else {
        const idx = val.indexOf(searchTerm);
        if (idx !== -1) {
          newVal = val.substring(0, idx) + replaceTerm + val.substring(idx + searchTerm.length);
        }
      }
    }
    setMobileText(newVal);
    const ytext = ydoc.getText("monaco");
    applySplice(ytext, newVal);
  };

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
          const activeUsers = states.map((s) => s.user).filter(Boolean);
          onUsersChange(activeUsers);
        }
      });

      if (isMounted) setProvider(webrtcProvider);

      const ytext = ydoc.getText("monaco");

      if (!initRef.current) {
        if (initialText) {
          if (ytext.toString() === "") ytext.insert(0, initialText);
          setMobileText(initialText);
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
                setMobileText(content);
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
        setMobileText(currentText);

        if (transaction.local && !isBurned) {
          if (!initRef.current) return;

          onStatusChange?.("Saving...");

          if (!sessionStorage.getItem(`snapshot-${slug}`)) {
            sessionStorage.setItem(`snapshot-${slug}`, 'true');
            (async () => {
              try {
                const saveText = isLocked && password ? await encryptText(currentText, password) : currentText;
                await setDoc(doc(db, "padVersions", slug, "snapshots", Date.now().toString()), {
                  text: saveText,
                  createdAt: new Date().toISOString(),
                  auto: true
                });
              } catch (e) {
                console.error("Snapshot error:", e);
              }
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

  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;

    // Bind Ctrl+F inside Monaco
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyF, () => {
      setIsFindOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    });

    if (provider) {
      const ytext = ydoc.getText("monaco");
      if (bindingRef.current) bindingRef.current.destroy();
      bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);
    }
  };

  // Re-bind Monaco when provider becomes available asynchronously
  useEffect(() => {
    if (!editorRef.current || !provider) return;

    const ytext = ydoc.getText("monaco");
    const model = editorRef.current.getModel();
    if (!model) return;

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editorRef.current]),
      provider.awareness
    );

    // Initial content and stats synchronization
    const initialContent = model.getValue() || ytext.toString();
    if (!model.getValue() && ytext.toString()) {
      model.setValue(ytext.toString());
    }
    const words = initialContent.trim() === "" ? 0 : initialContent.trim().split(/\s+/).length;
    onStatsChange(words, initialContent.length, initialContent);

    // Live listener on Monaco model changes to guarantee instant stats update
    const disposable = editorRef.current.onDidChangeModelContent(() => {
      const text = editorRef.current.getValue();
      const w = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
      onStatsChange(w, text.length, text);
    });

    return () => {
      disposable.dispose();
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [provider, ydoc]);

  const mappedLanguage = language === 'plaintext' ? 'text' : language;

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
        selectionHighlight: false,
        occurrencesHighlight: "off",
        matchBrackets: "never",
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderWhitespace: "none",
        stickyScroll: { enabled: false },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false,
        }
      });
    }
  }, [activeFontFamily, activeFontSize, activeLineHeight, letterSpacing, minimap, wordWrap]);

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
    <div
      className={`w-full flex-1 flex flex-col custom-monaco-wrapper relative transition-all duration-300 rounded-2xl overflow-hidden ${
        editorTheme === 'light'
          ? 'editor-theme-light bg-white text-slate-900 shadow-md'
          : 'editor-theme-dark bg-[#070b14] text-white'
      }`}
    >
      {isOffline && (
        <div className="absolute top-2 right-2 z-50 glass-frosted text-yellow-500 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-semibold shadow-md backdrop-blur-md">
          <WifiOff size={14} />
          Offline - Saving Locally
        </div>
      )}

      {/* Floating Find & Replace Bar */}
      {isFindOpen && (
        <div className={`absolute top-3 right-3 z-30 flex flex-col gap-2 p-3 rounded-2xl backdrop-blur-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 w-[90vw] sm:w-[360px] ${
          editorTheme === 'light'
            ? 'bg-white/95 border-slate-300 text-slate-900 shadow-[0_15px_40px_rgba(0,0,0,0.15)]'
            : 'glass-frosted border-white/20 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
        }`}>
          {/* Search Row */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search size={14} className="absolute left-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (isMobile) handleMobileFind(e.target.value);
                  else handleFind(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      if (isMobile) handleMobileFind(searchTerm, false);
                      else handleFind(searchTerm, false);
                    } else {
                      if (isMobile) handleMobileFind(searchTerm, true);
                      else handleFind(searchTerm, true);
                    }
                  }
                }}
                placeholder="Find in note..."
                className={`w-full pl-8 pr-16 py-1.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                  editorTheme === 'light'
                    ? 'bg-slate-100 text-slate-900 border-slate-300 focus:border-slate-500 placeholder:text-slate-400'
                    : 'bg-black/40 text-white border-white/10 focus:border-white/30 placeholder:text-gray-500'
                }`}
              />
              <span className="absolute right-2 text-[10px] font-mono text-gray-400">
                {matchesCount > 0 ? `${currentMatchIndex + 1}/${matchesCount}` : searchTerm ? "0/0" : ""}
              </span>
            </div>

            {/* Prev match */}
            <button
              onClick={() => (isMobile ? handleMobileFind(searchTerm, false) : handleFind(searchTerm, false))}
              disabled={matchesCount === 0}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Match (Shift+Enter)"
            >
              <ArrowUp size={14} />
            </button>

            {/* Next match */}
            <button
              onClick={() => (isMobile ? handleMobileFind(searchTerm, true) : handleFind(searchTerm, true))}
              disabled={matchesCount === 0}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Match (Enter)"
            >
              <ArrowDown size={14} />
            </button>

            {/* Toggle Replace */}
            <button
              onClick={() => setShowReplace(!showReplace)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showReplace
                  ? editorTheme === 'light'
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-white/20 text-white'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400'
              }`}
              title="Toggle Replace"
            >
              <Replace size={14} />
            </button>

            {/* Close */}
            <button
              onClick={() => setIsFindOpen(false)}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-foreground"
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Replace Row */}
          {showReplace && (
            <div className={`flex items-center gap-1.5 pt-1.5 border-t ${editorTheme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with..."
                className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none ${
                  editorTheme === 'light'
                    ? 'bg-slate-100 text-slate-900 border-slate-300 focus:border-slate-500 placeholder:text-slate-400'
                    : 'bg-black/40 text-white border-white/10 focus:border-white/30 placeholder:text-gray-500'
                }`}
              />
              <button
                onClick={() => (isMobile ? handleMobileReplace(false) : handleReplace())}
                disabled={matchesCount === 0}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-30 transition-all ${
                  editorTheme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                    : 'glass-clear hover:glass-frosted text-white border-white/20'
                }`}
              >
                Replace
              </button>
              <button
                onClick={() => (isMobile ? handleMobileReplace(true) : handleReplaceAll())}
                disabled={matchesCount === 0}
                className="px-2.5 py-1.5 rounded-xl bg-white text-black hover:bg-gray-200 text-xs font-bold shadow-sm disabled:opacity-30 transition-all"
              >
                All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Surface */}
      {isMobile ? (
        <textarea
          ref={textareaRef}
          readOnly={isBurned}
          className={`w-full h-full flex-1 resize-none outline-none p-4 transition-colors ${
            editorTheme === 'light'
              ? 'bg-white text-slate-900 selection:bg-slate-200'
              : 'bg-[#070b14] text-white selection:bg-white/20'
          }`}
          style={{
            fontFamily: activeFontFamily,
            fontSize: activeFontSize,
            lineHeight: `${activeLineHeight}px`,
            letterSpacing: letterSpacing,
            touchAction: 'pan-y',
            WebkitUserSelect: 'text',
            userSelect: 'text'
          }}
          value={mobileText}
          onChange={(e) => {
            if (isBurned) return;
            const val = e.target.value;
            setMobileText(val);
            const ytext = ydoc.getText("monaco");
            applySplice(ytext, val);
          }}
          placeholder="Start typing..."
        />
      ) : (
        <Editor
          beforeMount={registerThemes}
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
            renderLineHighlightOnlyWhenFocus: false,
            selectionHighlight: false,
            occurrencesHighlight: "off",
            matchBrackets: "never",
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            renderWhitespace: "none",
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: "always",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            stickyScroll: { enabled: false },
            padding: { top: 20, bottom: 20 },
            fixedOverflowWidgets: true,
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
});

export default CollaborativeEditor;
