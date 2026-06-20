"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { X, Terminal as TerminalIcon } from "lucide-react";

interface InteractiveTerminalProps {
  code: string;
  language: string;
  onClose: () => void;
}

const JDOODLE_LANGUAGES: Record<string, { id: string, version: string }> = {
  javascript: { id: "nodejs", version: "4" },
  python: { id: "python3", version: "3" },
  cpp: { id: "cpp17", version: "1" },
  c: { id: "c", version: "5" },
  java: { id: "java", version: "4" },
};

export default function InteractiveTerminal({ code, language, onClose }: InteractiveTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const stompClientRef = useRef<Client | null>(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    // 1. Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: "#1a1a1a",
        foreground: "#4ade80", // text-green-400
        cursor: "#4ade80",
        selectionBackground: "rgba(74, 222, 128, 0.3)",
      },
      fontFamily: "monospace",
      fontSize: 14,
      cursorBlink: true,
      convertEol: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }
    
    xtermRef.current = term;

    // Handle Resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    // 2. Fetch Token and Connect to JDoodle
    const startExecution = async () => {
      try {
        term.writeln("\x1b[33m[PadX] Fetching secure execution token...\x1b[0m");
        const res = await fetch("/api/jdoodle", { method: "POST" });
        if (!res.ok) throw new Error("Failed to authenticate");
        const { token } = await res.json();

        term.writeln("\x1b[33m[PadX] Connecting to execution engine...\x1b[0m");
        setStatus("Connecting...");

        const client = new Client({
          webSocketFactory: () => new SockJS("https://api.jdoodle.com/v1/stomp"),
          debug: (str) => {
            // Optional: console.log(str);
          },
          reconnectDelay: 0,
        });

        client.onConnect = () => {
          setStatus("Running");
          term.writeln("\x1b[32m[PadX] Connected! Program starting...\x1b[0m\n");

          // Subscribe to receive output
          client.subscribe("/user/queue/execute-i", (message) => {
            try {
              const msg = JSON.parse(message.body);
              if (msg.statusCode === 200 && msg.message) {
                term.write(msg.message);
              } else if (msg.statusCode === 429) {
                term.writeln("\n\x1b[31m[PadX] Rate Limit Exceeded.\x1b[0m");
              }
            } catch {
              term.write(message.body);
            }
          });

          // Prepare Code
          let finalCode = code;
          if (language === 'java') {
             finalCode = finalCode.replace(/public\s+class\s+[a-zA-Z0-9_]+/g, "public class Main");
          }

          const langConfig = JDOODLE_LANGUAGES[language] || { id: language, version: "0" };

          // Send execution payload
          client.publish({
            destination: "/app/execute-ws-api-token",
            headers: {
              message_type: 'execute',
              token: token
            },
            body: JSON.stringify({
              script: finalCode,
              language: langConfig.id,
              versionIndex: langConfig.version
            }),
          });
        };

        client.onStompError = (frame) => {
          term.writeln("\n\x1b[31m[PadX] Broker Error: " + frame.headers["message"] + "\x1b[0m");
          setStatus("Error");
        };

        client.onWebSocketClose = () => {
          term.writeln("\n\x1b[33m[PadX] Connection closed.\x1b[0m");
          setStatus("Finished");
        };

        client.activate();
        stompClientRef.current = client;

        // 3. Handle Keystrokes for standard input
        let inputBuffer = "";
        term.onData((data) => {
          if (!stompClientRef.current || !stompClientRef.current.connected) return;

          term.write(data); // Local echo
          inputBuffer += data;

          if (data === "\r" || data === "\n") {
            // Send input to JDoodle
            stompClientRef.current.publish({
              destination: "/app/execute-ws-api-token",
              headers: {
                message_type: 'input'
              },
              body: inputBuffer
            });
            inputBuffer = "";
          }
        });

      } catch (err: any) {
        term.writeln(`\n\x1b[31m[PadX] Error: ${err.message}\x1b[0m`);
        setStatus("Error");
      }
    };

    startExecution();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (stompClientRef.current) stompClientRef.current.deactivate();
      term.dispose();
    };
  }, [code, language]);

  return (
    <div className="h-64 sm:h-80 shrink-0 bg-[#0d0d0d] border-t border-[#333] rounded-b-3xl -mx-6 sm:-mx-12 -mb-6 sm:-mb-12 mt-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
          <TerminalIcon size={14} /> Interactive Terminal
          <span className="ml-2 px-2 py-0.5 rounded-full bg-black/50 text-xs border border-[#333] flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${status === 'Running' ? 'bg-green-500 animate-pulse' : status === 'Finished' ? 'bg-gray-500' : status === 'Error' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
             {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 p-2 bg-[#0d0d0d] relative overflow-hidden">
        <div ref={terminalRef} className="absolute inset-0 p-2" />
      </div>
    </div>
  );
}
