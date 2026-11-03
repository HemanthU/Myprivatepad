"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, Image as ImageIcon, Archive, File as FileIcon, X, Download, Trash, Eye, UploadCloud, Lock, FileArchive, Search, Folder, Flame, Star, Tag, Loader2, ScanText, Copy, ChevronLeft, Music, Video, Code } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePrompt } from "@/hooks/usePrompt";
import { useToast } from "@/hooks/useToast";
import PromptModal from "@/components/ui/PromptModal";
import Tesseract from "tesseract.js";

// 700KB per chunk — safely under Firestore's 1MB document limit
const CHUNK_SIZE = 700 * 1024;
// Max file size: 20MB (29 chunks max)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type FileMetadata = {
  fileId: string;
  padId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  storagePath: string;
  downloadUrl: string;
  isEncrypted: boolean;
  isBurnAfterRead: boolean;
  totalViews: number;
  totalDownloads: number;
  isFavorite?: boolean;
  tags?: string[];
  chunkCount?: number;
};

/** Convert a Uint8Array slice to a base64 string safely (no stack overflow) */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function PadFiles({ slug, isLocked }: { slug: string; isLocked: boolean }) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [search, setSearch] = useState("");
  const [encryptUploads, setEncryptUploads] = useState(false);
  const [burnUploads, setBurnUploads] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResultText, setOcrResultText] = useState<string | null>(null);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { prompt, confirm, alert: promptAlert, isOpen, config, handleClose } = usePrompt();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "files"), where("padId", "==", slug));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map((d) => d.data() as FileMetadata);
      setFiles(fetched.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    });
    return unsubscribe;
  }, [slug]);

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewBlobUrl) window.URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast(`"${file.name}" is too large. Max 20MB per file.`, "error");
          return;
        }

        const fileId = Math.random().toString(36).substring(2, 15);
        setUploadingFiles((prev) => [...prev, { id: fileId, name: file.name, progress: 0 }]);

        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const totalChunks = Math.ceil(bytes.byteLength / CHUNK_SIZE);

          if (totalChunks <= 1) {
            // Small file — store inline as a data URL
            const base64 = uint8ToBase64(bytes);
            const downloadUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
            setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 60 } : f)));

            const metadata: FileMetadata = {
              fileId,
              padId: slug,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              storagePath: "firestore-inline",
              downloadUrl,
              isEncrypted: encryptUploads,
              isBurnAfterRead: burnUploads,
              totalViews: 0,
              totalDownloads: 0,
            };
            await setDoc(doc(db, "files", fileId), metadata);
          } else {
            // Large file — chunk it into Firestore sub-documents
            // First write metadata (no downloadUrl — reconstructed on demand)
            const metadata: FileMetadata = {
              fileId,
              padId: slug,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              storagePath: "firestore-chunked",
              downloadUrl: "",
              isEncrypted: encryptUploads,
              isBurnAfterRead: burnUploads,
              totalViews: 0,
              totalDownloads: 0,
              chunkCount: totalChunks,
            };
            await setDoc(doc(db, "files", fileId), metadata);

            // Upload each chunk
            for (let i = 0; i < totalChunks; i++) {
              const start = i * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, bytes.byteLength);
              const chunkBytes = bytes.slice(start, end);
              const chunkBase64 = uint8ToBase64(chunkBytes);
              await setDoc(doc(db, "files", fileId, "chunks", i.toString()), { data: chunkBase64 });
              const progress = Math.round(((i + 1) / totalChunks) * 90);
              setUploadingFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)));
            }
          }

          setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
          toast(`"${file.name}" uploaded successfully!`, "success");
        } catch (error: any) {
          toast("Upload failed: " + (error?.message || "Unknown error"), "error");
          setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
        }
      });
    },
    [slug, encryptUploads, burnUploads]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: false });

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open]);

  const deleteFile = async (file: FileMetadata) => {
    const confirmed = await confirm({ title: "Delete File", message: `Delete "${file.fileName}" permanently?` });
    if (!confirmed) return;

    if (file.chunkCount) {
      for (let i = 0; i < file.chunkCount; i++) {
        await deleteDoc(doc(db, "files", file.fileId, "chunks", i.toString()));
      }
    }
    await deleteDoc(doc(db, "files", file.fileId));
    toast(`"${file.fileName}" deleted.`, "success");
  };

  /** Reassemble chunked file into a blob URL */
  const fetchFileBlob = async (file: FileMetadata, onProgress?: (p: number) => void): Promise<string> => {
    if (!file.chunkCount) {
      // Inline data URL — return directly
      return file.downloadUrl;
    }
    let fullBase64 = "";
    for (let i = 0; i < file.chunkCount; i++) {
      const chunkDoc = await getDoc(doc(db, "files", file.fileId, "chunks", i.toString()));
      if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data as string;
      if (onProgress) onProgress(Math.round(((i + 1) / file.chunkCount) * 100));
    }
    const byteCharacters = atob(fullBase64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([byteNumbers], { type: file.fileType });
    return window.URL.createObjectURL(blob);
  };

  const getFileCategory = (type: string) => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("audio/") || type.includes("mpeg") || type.includes("ogg") || type.includes("flac") || type.includes("wav")) return "audio";
    if (type.startsWith("video/") || type.includes("mp4") || type.includes("webm") || type.includes("quicktime")) return "video";
    if (type === "application/pdf") return "pdf";
    if (type.includes("word") || type.includes("excel") || type.includes("powerpoint") || type.includes("presentation") || type.includes("spreadsheet")) return "office";
    if (type.startsWith("text/") || type.includes("javascript") || type.includes("json") || type.includes("xml") || type.includes("yaml")) return "text";
    if (type.includes("zip") || type.includes("tar") || type.includes("rar") || type.includes("7z") || type.includes("gz")) return "archive";
    return "other";
  };

  const getFileIcon = (type: string) => {
    const cat = getFileCategory(type);
    if (cat === "image") return <ImageIcon size={24} className="text-blue-500" />;
    if (cat === "audio") return <Music size={24} className="text-purple-500" />;
    if (cat === "video") return <Video size={24} className="text-red-500" />;
    if (cat === "pdf") return <FileText size={24} className="text-orange-500" />;
    if (cat === "office") return <FileText size={24} className="text-green-500" />;
    if (cat === "text") return <Code size={24} className="text-cyan-500" />;
    if (cat === "archive") return <Archive size={24} className="text-yellow-500" />;
    return <FileIcon size={24} className="text-gray-500" />;
  };

  const handlePreview = async (file: FileMetadata) => {
    if (file.isBurnAfterRead) {
      const confirmed = await confirm({ title: "Burn After Read", message: "Viewing this file will delete it permanently. Continue?" });
      if (!confirmed) return;
    }

    setPreviewLoading(file.fileId);
    setTextPreviewContent(null);
    if (previewBlobUrl) { window.URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); }

    try {
      const category = getFileCategory(file.fileType);

      if (category === "other" || category === "archive") {
        // Just download — no preview
        setPreviewLoading(null);
        await handleDownload(file);
        return;
      }

      let blobUrl = await fetchFileBlob(file);

      // For text/code files, read the text content
      if (category === "text") {
        const response = await fetch(blobUrl);
        const text = await response.text();
        setTextPreviewContent(text);
      }

      setPreviewBlobUrl(blobUrl);
      setPreviewFile(file);
      await setDoc(doc(db, "files", file.fileId), { ...file, totalViews: (file.totalViews || 0) + 1 });
    } catch (e: any) {
      toast("Preview failed: " + (e?.message || "Unknown error"), "error");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    if (file.isBurnAfterRead) {
      const confirmed = await confirm({ title: "Burn After Read", message: "Downloading this file will delete it permanently. Continue?" });
      if (!confirmed) return;
    }

    setDownloadingFileId(file.fileId);
    try {
      let url = await fetchFileBlob(file);
      // If it's a data URL (inline), convert to blob for clean download
      if (url.startsWith("data:")) {
        const resp = await fetch(url);
        const blob = await resp.blob();
        url = window.URL.createObjectURL(blob);
      }
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      await setDoc(doc(db, "files", file.fileId), { ...file, totalDownloads: (file.totalDownloads || 0) + 1 });
      if (file.isBurnAfterRead) await deleteFile(file);
    } catch (e: any) {
      toast("Download failed: " + (e?.message || "Try again"), "error");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleClosePreview = () => {
    if (previewFile?.isBurnAfterRead) deleteFile(previewFile);
    if (previewBlobUrl) { window.URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); }
    setPreviewFile(null);
    setTextPreviewContent(null);
  };

  const handleScanText = async (file: FileMetadata) => {
    try {
      setOcrLoading(true);
      const url = previewBlobUrl || await fetchFileBlob(file);
      const { data: { text } } = await Tesseract.recognize(url, "eng");
      setOcrLoading(false);
      if (text?.trim()) setOcrResultText(text);
      else await promptAlert({ title: "Scanned Text", message: "No text found in image." });
    } catch {
      setOcrLoading(false);
      await promptAlert({ title: "OCR Failed", message: "Failed to scan text from image." });
    }
  };

  const toggleFavorite = async (file: FileMetadata) => {
    await setDoc(doc(db, "files", file.fileId), { ...file, isFavorite: !file.isFavorite });
  };

  const addTag = async (file: FileMetadata) => {
    const tag = await prompt({ title: "Add Tag", placeholder: "Enter a tag (e.g. urgent, draft)" });
    if (!tag) return;
    const currentTags = file.tags || [];
    if (!currentTags.includes(tag.toLowerCase())) {
      await setDoc(doc(db, "files", file.fileId), { ...file, tags: [...currentTags, tag.toLowerCase()] });
    }
  };

  const removeTag = async (file: FileMetadata, tagToRemove: string) => {
    await setDoc(doc(db, "files", file.fileId), { ...file, tags: (file.tags || []).filter((t) => t !== tagToRemove) });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.fileName.toLowerCase().includes(search.toLowerCase()) || (f.tags && f.tags.some((t) => t.includes(search.toLowerCase())));
    const matchesFavorite = showFavoritesOnly ? f.isFavorite : true;
    return matchesSearch && matchesFavorite;
  });

  const images = filteredFiles.filter((f) => getFileCategory(f.fileType) === "image");
  const audios = filteredFiles.filter((f) => getFileCategory(f.fileType) === "audio");
  const videos = filteredFiles.filter((f) => getFileCategory(f.fileType) === "video");
  const documents = filteredFiles.filter((f) => ["pdf", "office", "text"].includes(getFileCategory(f.fileType)));
  const archives = filteredFiles.filter((f) => getFileCategory(f.fileType) === "archive");
  const others = filteredFiles.filter((f) => getFileCategory(f.fileType) === "other");

  const FileCard = ({ f }: { f: FileMetadata }) => {
    const category = getFileCategory(f.fileType);
    return (
      <div className="glass-frosted border border-border rounded-2xl p-4 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center w-12 h-12 shrink-0">
            {category === "image" && f.downloadUrl?.startsWith("data:") && !f.isEncrypted ? (
              <img src={f.downloadUrl} alt={f.fileName} className="w-10 h-10 object-cover rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              getFileIcon(f.fileType)
            )}
          </div>
          <div className="flex gap-1 items-center ml-2">
            {f.isEncrypted && <Lock size={14} className="text-red-500" />}
            {f.isBurnAfterRead && <Flame size={14} className="text-orange-500" />}
            {f.chunkCount && <span className="text-[10px] text-gray-400 font-mono">{f.chunkCount}chunks</span>}
            <button onClick={() => toggleFavorite(f)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Star size={16} className={f.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"} />
            </button>
          </div>
        </div>
        <h4 className="font-semibold text-sm line-clamp-1 break-all mb-1" title={f.fileName}>{f.fileName}</h4>

        <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
          {f.tags?.map((t) => (
            <span key={t} className="px-2 py-0.5 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-md text-[10px] font-medium flex items-center gap-1 group">
              {t}
              <X size={10} className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); removeTag(f, t); }} />
            </span>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-4">{formatSize(f.fileSize)} • {formatDistanceToNow(new Date(f.uploadedAt))} ago</p>

        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border">
          <button onClick={() => handlePreview(f)} disabled={previewLoading === f.fileId} className="flex-1 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg text-xs font-semibold flex justify-center items-center gap-1 hover:bg-blue-200 transition-colors disabled:opacity-50">
            {previewLoading === f.fileId ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            {previewLoading === f.fileId ? "Loading..." : category === "archive" || category === "other" ? "Download" : "View"}
          </button>
          <button onClick={() => addTag(f)} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors" title="Add Tag"><Tag size={14} /></button>
          <button onClick={() => handleDownload(f)} disabled={downloadingFileId === f.fileId} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
            {downloadingFileId === f.fileId ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
          <button onClick={() => deleteFile(f)} className="p-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors"><Trash size={14} /></button>
        </div>
      </div>
    );
  };

  const FolderSection = ({ title, items, icon: Icon, iconClass }: any) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${iconClass}`}>
          <Icon size={20} /> {title} <span className="text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((f: FileMetadata) => <FileCard key={f.fileId} f={f} />)}
        </div>
      </div>
    );
  };

  const previewCategory = previewFile ? getFileCategory(previewFile.fileType) : null;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PromptModal isOpen={isOpen} config={config} onClose={handleClose} />

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`w-full border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-700 hover:border-gray-400 glass-frosted"}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-full">
            <UploadCloud size={40} />
          </div>
          <div>
            <p className="text-xl font-bold mb-1">Drag & Drop any file here</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Images · Music · Video · PDF · Code · Documents · Archives</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Max 20MB per file · Ctrl+U to open picker</p>
          </div>
          <div className="flex items-center gap-6 mt-2" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={encryptUploads} onChange={(e) => setEncryptUploads(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              Vault Mode (Encrypt)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={burnUploads} onChange={(e) => setBurnUploads(e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
              Burn After Read
            </label>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="w-full glass-frosted border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5 flex flex-col gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <Loader2 className="animate-spin" size={20} />
            <h4 className="font-bold text-sm">Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? "s" : ""}...</h4>
          </div>
          {uploadingFiles.map((f) => (
            <div key={f.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="truncate flex-1 max-w-[80%]">{f.name}</span>
                <span>{Math.round(f.progress)}%</span>
              </div>
              <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300 relative" style={{ width: `${f.progress}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      {files.length > 0 && (
        <div className="w-full flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or tags..." className="w-full pl-12 pr-4 py-3 rounded-2xl glass-frosted border border-border focus:border-gray-400 outline-none text-sm transition-all" />
          </div>
          <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`px-4 py-3 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${showFavoritesOnly ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400" : "glass-frosted border-border"}`}>
            <Star size={16} className={showFavoritesOnly ? "fill-current" : ""} /> Favorites
          </button>
        </div>
      )}

      {/* File Grid */}
      <div className="w-full">
        <FolderSection title="Images" items={images} icon={ImageIcon} iconClass="text-blue-600 dark:text-blue-400" />
        <FolderSection title="Music" items={audios} icon={Music} iconClass="text-purple-600 dark:text-purple-400" />
        <FolderSection title="Videos" items={videos} icon={Video} iconClass="text-red-600 dark:text-red-400" />
        <FolderSection title="Documents" items={documents} icon={FileText} iconClass="text-green-600 dark:text-green-400" />
        <FolderSection title="Archives" items={archives} icon={FileArchive} iconClass="text-yellow-600 dark:text-yellow-400" />
        <FolderSection title="Other" items={others} icon={Folder} iconClass="text-gray-600 dark:text-gray-400" />

        {files.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-border rounded-3xl flex flex-col items-center gap-3">
            <UploadCloud size={40} className="opacity-30" />
            <p>No files uploaded to this pad yet.</p>
            <p className="text-xs">Supports images, music, video, PDF, code, documents & more</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-full sm:max-h-[92vh] glass-frosted/90 backdrop-blur-3xl border border-white/20 dark:border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3 bg-transparent">
              <div className="flex items-center gap-3">
                <button onClick={handleClosePreview} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                  <ChevronLeft size={22} /> <span className="hidden sm:inline">Back</span>
                </button>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hidden sm:flex">{getFileIcon(previewFile.fileType)}</div>
                <div>
                  <h3 className="font-bold text-base leading-tight line-clamp-1">{previewFile.fileName}</h3>
                  <p className="text-xs text-gray-500">{formatSize(previewFile.fileSize)} · {previewFile.fileType} · {previewFile.totalViews} Views</p>
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {/* One-time share link */}
                <button onClick={async () => {
                  const id = Math.random().toString(36).substring(2, 10);
                  await setDoc(doc(db, "oneTimeFileLinks", id), { fileId: previewFile.fileId, used: false, createdAt: new Date().toISOString() });
                  const url = `${window.location.origin}/file/${id}`;
                  navigator.clipboard.writeText(url);
                  alert(`One-time link copied:\n${url}`);
                }} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm shrink-0">
                  <Download size={15} /> <span className="hidden sm:inline">Share 1-Time</span>
                </button>
                {/* OCR for images */}
                {previewCategory === "image" && (
                  <button onClick={() => handleScanText(previewFile)} disabled={ocrLoading} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm shrink-0">
                    <ScanText size={15} /> <span className="hidden sm:inline">{ocrLoading ? "Scanning..." : "Scan Text"}</span>
                  </button>
                )}
                <button onClick={() => handleDownload(previewFile)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm shrink-0">
                  <Download size={15} /> Download
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 w-full overflow-hidden relative flex items-center justify-center bg-black/10 dark:bg-black/30">
              {previewFile.isEncrypted ? (
                <div className="text-center p-8 max-w-md">
                  <Lock size={64} className="mx-auto mb-6 text-gray-400" />
                  <h2 className="text-2xl font-bold mb-2">Vault Mode File</h2>
                  <p className="text-gray-500 mb-6">This file is encrypted. Download and decrypt locally with your pad password.</p>
                  <button onClick={() => handleDownload(previewFile)} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl">Download Encrypted File</button>
                </div>
              ) : previewCategory === "image" && previewBlobUrl ? (
                <img src={previewBlobUrl} alt={previewFile.fileName} className="max-w-full max-h-full object-contain p-4" />
              ) : previewCategory === "audio" && previewBlobUrl ? (
                <div className="flex flex-col items-center gap-8 p-8 w-full max-w-md">
                  <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                    <Music size={64} className="text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl mb-1">{previewFile.fileName}</p>
                    <p className="text-gray-500 text-sm">{previewFile.fileType} · {formatSize(previewFile.fileSize)}</p>
                  </div>
                  <audio ref={audioRef} controls autoPlay src={previewBlobUrl} className="w-full rounded-xl" style={{ colorScheme: "dark" }} />
                </div>
              ) : previewCategory === "video" && previewBlobUrl ? (
                <video controls autoPlay src={previewBlobUrl} className="max-w-full max-h-full rounded-xl" style={{ maxHeight: "calc(92vh - 120px)" }} />
              ) : previewCategory === "pdf" && previewBlobUrl ? (
                <iframe src={`${previewBlobUrl}#view=FitH`} className="w-full h-full border-none bg-white rounded-xl" />
              ) : previewCategory === "office" && previewBlobUrl ? (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewBlobUrl)}`} className="w-full h-full border-none bg-white rounded-xl" />
              ) : previewCategory === "text" && textPreviewContent !== null ? (
                <div className="w-full h-full overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
                  <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{textPreviewContent}</pre>
                </div>
              ) : (
                <div className="text-center p-8">
                  <FileIcon size={64} className="mx-auto mb-6 text-gray-400" />
                  <h2 className="text-2xl font-bold mb-2">No Preview Available</h2>
                  <p className="text-gray-500 mb-6">This file type cannot be previewed in the browser.</p>
                  <button onClick={() => handleDownload(previewFile)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl">Download File</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OCR Result Modal */}
      {ocrResultText !== null && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-full sm:max-h-[90vh] glass-frosted/90 backdrop-blur-3xl border border-white/20 dark:border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-transparent">
              <div className="flex items-center gap-3">
                <button onClick={() => setOcrResultText(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                  <ChevronLeft size={24} /> <span className="hidden sm:inline">Back</span>
                </button>
                <ScanText className="text-indigo-600 hidden sm:block" size={24} />
                <h2 className="text-xl font-bold">Extracted Text</h2>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(ocrResultText); toast("Text copied!", "success"); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                <Copy size={16} /> Copy
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-black">
              <textarea value={ocrResultText} readOnly className="w-full h-full min-h-[400px] p-4 bg-transparent border-none outline-none resize-none text-lg leading-relaxed font-mono" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
