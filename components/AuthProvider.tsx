"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).catch(console.error);
    }
  }, []);

  return <>{children}</>;
}
