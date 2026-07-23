"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { X, Terminal as TerminalIcon, Play } from "lucide-react";

interface InteractiveTerminalProps {
  code: string;
  language: string;
  onClose: () => void;
}

const WANDBOX_COMPILERS: Record<string, string> = {
  javascript: "nodejs-head",
  python: "cpython-3.10.6",
  cpp: "gcc-12.1.0-c++",
  c: "gcc-12.1.0-c",
  java: "openjdk-19",
};

export default function InteractiveTerminal({ code, language, onClose }: InteractiveTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [status, setStatus] = useState("Ready");
  const [stdin, setStdin] = useState("");

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: "#1a1a1a",
        foreground: "#4ade80",
        cursor: "#4ade80",
        selectionBackground: "rgba(74, 222, 128, 0.3)",
      },
      fontFamily: "monospace",
      fontSize: 14,
      cursorBlink: true,
      convertEol: true,
      disableStdin: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
      term.writeln("\x1b[33m[PadX] Standard Execution Engine Ready.\x1b[0m");
      term.writeln("\x1b[36mNote: Free tier JDoodle does not support interactive step-by-step inputs.\x1b[0m");
      term.writeln("\x1b[36mPlease provide any inputs required by your program in the Standard Input box below, then click Run.\x1b[0m\n");
    }
    
    xtermRef.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, []);

  const executeCode = async () => {
    const term = xtermRef.current;
    if (!term) return;

    setStatus("Running...");
    term.write("\x1b[2J\x1b[H"); // Clear terminal
    term.writeln("\x1b[33m[PadX] Sending to execution engine...\x1b[0m");

    try {
      const compiler = WANDBOX_COMPILERS[language] || "cpython-3.10.6";
      
      const res = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler,
          code,
          stdin: stdin
        })
      });

      const data = await res.json();

      if (data.status !== "0" && !data.program_output) {
        term.writeln(`\n\x1b[31m[PadX] Compiler Error:\x1b[0m\n${data.compiler_error || data.compiler_message || 'Unknown Error'}`);
        setStatus("Error");
        return;
      }

      term.writeln("\x1b[32m[PadX] Execution Completed:\x1b[0m\n");
      term.write((data.program_output || data.program_message || "").replace(/\n/g, "\r\n"));
      
      setStatus("Finished");

    } catch (err: any) {
      term.writeln(`\n\x1b[31m[PadX] Internal Error: ${err.message}\x1b[0m`);
      setStatus("Error");
    }
  };

  return (
    <div className="h-80 sm:h-96 shrink-0 bg-[#0d0d0d] border-t border-[#333] rounded-b-3xl -mx-6 sm:-mx-12 -mb-6 sm:-mb-12 mt-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
          <TerminalIcon size={14} /> Execution Terminal
          <span className="ml-2 px-2 py-0.5 rounded-full bg-black/50 text-xs border border-[#333] flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${status === 'Running...' ? 'bg-green-500 animate-pulse' : status === 'Finished' ? 'bg-gray-500' : status === 'Error' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
             {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col sm:flex-row relative overflow-hidden">
        {/* Left: Terminal Output */}
        <div className="flex-[2] p-2 relative bg-[#0d0d0d] overflow-hidden min-h-[150px]">
           <div ref={terminalRef} className="absolute inset-0 p-2" />
        </div>
        
        {/* Right: Standard Input & Controls */}
        <div className="flex-1 bg-[#111] border-l border-[#333] flex flex-col p-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Standard Input</label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Enter all inputs here..."
            className="flex-1 bg-black/50 border border-[#333] rounded-xl p-3 text-sm text-gray-300 font-mono focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none resize-none transition-all"
          />
          <button
            onClick={executeCode}
            disabled={status === "Running..."}
            className="mt-4 w-full py-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {status === "Running..." ? (
               <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
            ) : <Play size={16} />}
            Run Code
          </button>
        </div>
      </div>
    </div>
  );
}
