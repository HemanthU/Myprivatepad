"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, Image as ImageIcon, Archive, File as FileIcon, X, Download, Trash, Eye, UploadCloud, Lock, FileArchive, Search, Folder, Flame, Star, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
};

export default function PadFiles({ slug, isLocked }: { slug: string, isLocked: boolean }) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string, name: string, progress: number }[]>([]);
  const [search, setSearch] = useState("");
  const [encryptUploads, setEncryptUploads] = useState(false);
  const [burnUploads, setBurnUploads] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "files"), where("padId", "==", slug));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(doc => doc.data() as FileMetadata);
      setFiles(fetched.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    });
    return unsubscribe;
  }, [slug]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const fileId = Math.random().toString(36).substring(2, 15);
      
      setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.cloudinary.com/v1_1/dz7papuhb/auto/upload", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const metadata: FileMetadata = {
            fileId,
            padId: slug,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            storagePath: response.public_id, // Store Cloudinary public_id here
            downloadUrl: response.secure_url,
            isEncrypted: encryptUploads,
            isBurnAfterRead: burnUploads,
            totalViews: 0,
            totalDownloads: 0
          };
          await setDoc(doc(db, "files", fileId), metadata);
        } else {
          console.error("Upload failed", xhr.responseText);
        }
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      };

      xhr.onerror = () => {
        console.error("Upload failed due to network error");
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      };

      xhr.send(formData);
    });
  }, [slug, encryptUploads, burnUploads]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const deleteFile = async (file: FileMetadata) => {
    if (!confirm(`Delete ${file.fileName} permanently?`)) return;
    // We remove the file from our database. (Cloudinary files will remain unlinked unless cleaned up via Admin API)
    await deleteDoc(doc(db, "files", file.fileId));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon size={24} className="text-blue-500" />;
    if (type.includes("pdf") || type.includes("word") || type.includes("text")) return <FileText size={24} className="text-green-500" />;
    if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return <Archive size={24} className="text-yellow-500" />;
    return <FileIcon size={24} className="text-gray-500" />;
  };

  const handlePreview = async (file: FileMetadata) => {
    if (file.isBurnAfterRead) {
      if (!confirm("This is a Burn After Read file. Viewing it will delete it permanently. Continue?")) return;
    }
    setPreviewFile(file);
    await setDoc(doc(db, "files", file.fileId), { ...file, totalViews: (file.totalViews || 0) + 1 });
  };

  const handleDownload = async (file: FileMetadata) => {
    if (file.isBurnAfterRead) {
      if (!confirm("This is a Burn After Read file. Downloading it will delete it permanently. Continue?")) return;
    }
    let downloadUrl = file.downloadUrl;
    if (downloadUrl.includes("cloudinary.com") && !downloadUrl.includes("fl_attachment")) {
      downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
    }
    window.open(downloadUrl, "_blank");
    await setDoc(doc(db, "files", file.fileId), { ...file, totalDownloads: (file.totalDownloads || 0) + 1 });
    
    if (file.isBurnAfterRead) {
      await deleteFile(file);
    }
  };

  const handleClosePreview = async () => {
    if (previewFile?.isBurnAfterRead) {
      await deleteFile(previewFile);
    }
    setPreviewFile(null);
  };

  const toggleFavorite = async (file: FileMetadata) => {
    await setDoc(doc(db, "files", file.fileId), { ...file, isFavorite: !file.isFavorite });
  };

  const addTag = async (file: FileMetadata) => {
    const tag = prompt("Enter a tag (e.g. urgent, draft):");
    if (!tag) return;
    const currentTags = file.tags || [];
    if (!currentTags.includes(tag.toLowerCase())) {
      await setDoc(doc(db, "files", file.fileId), { ...file, tags: [...currentTags, tag.toLowerCase()] });
    }
  };

  const removeTag = async (file: FileMetadata, tagToRemove: string) => {
    const currentTags = file.tags || [];
    await setDoc(doc(db, "files", file.fileId), { ...file, tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.fileName.toLowerCase().includes(search.toLowerCase()) || (f.tags && f.tags.some(t => t.includes(search.toLowerCase())));
    const matchesFavorite = showFavoritesOnly ? f.isFavorite : true;
    return matchesSearch && matchesFavorite;
  });

  // Group files into pseudo-folders
  const images = filteredFiles.filter(f => f.fileType.startsWith("image/"));
  const documents = filteredFiles.filter(f => f.fileType.includes("pdf") || f.fileType.includes("word") || f.fileType.includes("text") || f.fileType.includes("presentation") || f.fileType.includes("excel"));
  const archives = filteredFiles.filter(f => f.fileType.includes("zip") || f.fileType.includes("tar") || f.fileType.includes("rar"));
  const others = filteredFiles.filter(f => !images.includes(f) && !documents.includes(f) && !archives.includes(f));

  const FolderSection = ({ title, items, icon: Icon }: any) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Icon size={20} /> {title} ({items.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((f: FileMetadata) => (
            <div key={f.fileId} className="bg-card border border-border rounded-2xl p-4 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {getFileIcon(f.fileType)}
                </div>
                <div className="flex gap-1 items-center">
                  {f.isEncrypted && <Lock size={14} className="text-red-500" />}
                  {f.isBurnAfterRead && <Flame size={14} className="text-orange-500" />}
                  <button onClick={() => toggleFavorite(f)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Star size={16} className={f.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"} />
                  </button>
                </div>
              </div>
              <h4 className="font-semibold text-sm line-clamp-1 break-all mb-1" title={f.fileName}>{f.fileName}</h4>
              
              <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
                {f.tags?.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-md text-[10px] font-medium flex items-center gap-1 group">
                    {t}
                    <X size={10} className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); removeTag(f, t); }} />
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-500 mb-4">
                {(f.fileSize / 1024 / 1024).toFixed(2)} MB • {formatDistanceToNow(new Date(f.uploadedAt))} ago
              </p>
              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border">
                <button onClick={() => handlePreview(f)} className="flex-1 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg text-xs font-semibold flex justify-center items-center gap-1 hover:bg-blue-200 transition-colors"><Eye size={14} /> View</button>
                <button onClick={() => addTag(f)} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors" title="Add Tag"><Tag size={14} /></button>
                <button onClick={() => handleDownload(f)} className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"><Download size={14} /></button>
                <button onClick={() => deleteFile(f)} className="p-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors"><Trash size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div 
        {...getRootProps()} 
        className={`w-full border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-card hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-full">
            <UploadCloud size={40} />
          </div>
          <div>
            <p className="text-xl font-bold mb-1">Drag & Drop files here</p>
            <p className="text-gray-500 dark:text-gray-400">or click to browse from your device</p>
          </div>
          <div className="flex items-center gap-6 mt-4" onClick={e => e.stopPropagation()}>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={encryptUploads} onChange={e => setEncryptUploads(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              Vault Mode (Encrypt)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={burnUploads} onChange={e => setBurnUploads(e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
              Burn After Read
            </label>
          </div>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="w-full bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
          <h4 className="font-semibold text-sm">Uploading ({uploadingFiles.length})</h4>
          {uploadingFiles.map(f => (
            <div key={f.id} className="flex items-center gap-3">
              <span className="text-xs truncate flex-1">{f.name}</span>
              <div className="w-1/2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${f.progress}%` }}></div>
              </div>
              <span className="text-xs w-8 text-right">{Math.round(f.progress)}%</span>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="w-full flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or tags..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-card border border-border focus:border-gray-400 outline-none text-sm transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-3 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${showFavoritesOnly ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400' : 'bg-card border-border hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Star size={16} className={showFavoritesOnly ? "fill-current" : ""} /> Favorites
          </button>
        </div>
      )}

      <div className="w-full">
        <FolderSection title="Documents" items={documents} icon={FileText} />
        <FolderSection title="Images" items={images} icon={ImageIcon} />
        <FolderSection title="Archives" items={archives} icon={FileArchive} />
        <FolderSection title="Other" items={others} icon={Folder} />
        
        {files.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 border border-dashed border-border rounded-3xl">
            No files uploaded to this pad yet.
          </div>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-full max-h-[90vh] bg-card rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            
            <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {getFileIcon(previewFile.fileType)}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight line-clamp-1">{previewFile.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    {(previewFile.fileSize / 1024 / 1024).toFixed(2)} MB • {previewFile.fileType} • {previewFile.totalViews} Views
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={async () => {
                  const id = Math.random().toString(36).substring(2, 10);
                  await setDoc(doc(db, "oneTimeFileLinks", id), {
                    fileId: previewFile.fileId,
                    used: false,
                    createdAt: new Date().toISOString()
                  });
                  const url = `${window.location.origin}/file/${id}`;
                  navigator.clipboard.writeText(url);
                  alert(`One-time file link copied to clipboard:\n${url}`);
                }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                  <Download size={16} /> <span className="hidden sm:inline">Share 1-Time</span>
                </button>
                <button onClick={() => handleDownload(previewFile)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                  <Download size={16} /> <span className="hidden sm:inline">Download</span>
                </button>
                <button onClick={handleClosePreview} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-gray-100 dark:bg-black overflow-hidden relative flex items-center justify-center">
              {previewFile.isEncrypted ? (
                <div className="text-center p-8 max-w-md">
                  <Lock size={64} className="mx-auto mb-6 text-gray-400" />
                  <h2 className="text-2xl font-bold mb-2">Vault Mode File</h2>
                  <p className="text-gray-500 mb-6">This file is encrypted. Download it and use your pad password to decrypt it locally.</p>
                  <button onClick={() => handleDownload(previewFile)} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl">
                    Download Encrypted File
                  </button>
                </div>
              ) : previewFile.fileType.startsWith("image/") ? (
                <img src={previewFile.downloadUrl} alt={previewFile.fileName} className="max-w-full max-h-full object-contain" />
              ) : previewFile.fileType === "application/pdf" ? (
                <iframe src={`${previewFile.downloadUrl}#view=FitH`} className="w-full h-full border-none bg-white rounded-xl" />
              ) : (previewFile.fileType.includes("word") || previewFile.fileType.includes("presentation") || previewFile.fileType.includes("excel")) ? (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.downloadUrl)}`} className="w-full h-full border-none bg-white rounded-xl" />
              ) : (
                <div className="text-center p-8">
                  <FileIcon size={64} className="mx-auto mb-6 text-gray-400" />
                  <h2 className="text-2xl font-bold mb-2">No Preview Available</h2>
                  <p className="text-gray-500 mb-6">This file type cannot be previewed in the browser.</p>
                  <button onClick={() => handleDownload(previewFile)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl">
                    Download File
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
