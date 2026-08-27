"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        const pwd = window.prompt("Enter Admin Password:");
        if (pwd) {
          try {
            const res = await fetch("/api/admin/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: pwd })
            });
            
            if (res.ok) {
              sessionStorage.setItem("adminAuth", "true");
              router.push("/admin");
            } else {
              alert("Incorrect password.");
            }
          } catch (e) {
            alert("Auth error.");
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
