import { useState } from "react";
import { Download, FileText, FileCode, FileJson, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function ExportModal({ slug, content, metadata, isOpen, onClose }: { slug: string, content: string, metadata: any, isOpen: boolean, onClose: () => void }) {
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const generateContent = () => {
    let output = content;
    if (includeMetadata) {
      const meta = [
        `---`,
        `Pad: ${slug}`,
        `Exported At: ${new Date().toLocaleString()}`,
        `Characters: ${content.length}`,
        `---`,
        ``
      ].join('\n');
      output = meta + output;
    }
    return output;
  };

  const downloadFile = (data: string, type: string, extension: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-export.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported as .${extension}`, "success");
    onClose();
  };

  const handleExport = async (format: string) => {
    const finalContent = generateContent();
    if (format === "txt") downloadFile(finalContent, "text/plain", "txt");
    if (format === "md") downloadFile(finalContent, "text/markdown", "md");
    if (format === "html") {
      const htmlContent = `<!DOCTYPE html><html><head><title>${slug}</title><meta charset="utf-8"></head><body><pre style="white-space: pre-wrap;">${finalContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
      downloadFile(htmlContent, "text/html", "html");
    }
    if (format === "json") {
      const jsonContent = JSON.stringify({ slug, exportedAt: new Date().toISOString(), metadata: includeMetadata ? metadata : undefined, content }, null, 2);
      downloadFile(jsonContent, "application/json", "json");
    }
    if (format === "pdf") {
      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const element = document.createElement("div");
        element.innerHTML = `<h1 style="font-family: sans-serif; text-align: center; color: #333;">PadX: ${slug}</h1><hr/><pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; padding: 20px; line-height: 1.5; color: #000;">${finalContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
        html2pdf().set({
          margin: 15,
          filename: `${slug}-export.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
        toast("Exported as .pdf", "success");
        onClose();
      } catch (e) {
        console.error(e);
        toast("PDF export failed", "error");
      }
    }
    if (format === "clipboard") {
      navigator.clipboard.writeText(finalContent);
      toast("Copied to clipboard", "success");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download size={20} className="text-indigo-500" /> Export Pad
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" checked={includeMetadata} onChange={(e) => setIncludeMetadata(e.target.checked)} />
            <span className="text-sm font-medium">Include Pad Metadata header</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleExport("txt")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <FileText size={18} className="text-slate-500" /> .TXT
            </button>
            <button onClick={() => handleExport("md")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <FileText size={18} className="text-blue-500" /> .MD
            </button>
            <button onClick={() => handleExport("html")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <FileCode size={18} className="text-orange-500" /> .HTML
            </button>
            <button onClick={() => handleExport("json")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <FileJson size={18} className="text-yellow-500" /> .JSON
            </button>
            <button onClick={() => handleExport("pdf")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <FileText size={18} className="text-red-500" /> .PDF
            </button>
            <button onClick={() => handleExport("clipboard")} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm">
              <Copy size={18} className="text-green-500" /> Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
