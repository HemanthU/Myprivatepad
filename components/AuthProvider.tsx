"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).catch((err) => {
        // Anonymous auth is optional for unauthenticated pads
        if (err.code !== "auth/configuration-not-found") {
          console.warn("Auth error:", err);
        }
      });
    }
  }, []);

  return <>{children}</>;
}
