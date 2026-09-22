import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAdminToken } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // Verify using the existing shared Admin password logic
    if (password === "sams") {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Create session in Firestore
      await setDoc(doc(db, "adminSessions", sessionId), {
        sessionId,
        status: "active",
        startedAt: now,
        lastActivity: now,
      });

      const token = await signAdminToken(sessionId);
      
      const cookieStore = await cookies();
      cookieStore.set("padx_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      await logAdminAction("Admin login", "system", {}, sessionId);

      return NextResponse.json({ success: true, sessionId });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
