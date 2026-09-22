"use client";

import { useEffect } from "react";

export default function AdminHeartbeat() {
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pingHeartbeat = async () => {
      try {
        await fetch("/api/admin/heartbeat", { method: "POST" });
      } catch (e) {
        // Ignore errors, if it fails it fails.
      }
    };

    // Ping immediately on mount
    pingHeartbeat();

    // Ping every 60 seconds
    interval = setInterval(pingHeartbeat, 60000);

    return () => clearInterval(interval);
  }, []);

  return null; // Invisible component
}
