"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        const pwd = window.prompt("Enter Admin Password:");
        if (pwd === "sams") {
          sessionStorage.setItem("adminAuth", "true");
          router.push("/admin");
        } else if (pwd !== null) {
          alert("Incorrect password.");
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
