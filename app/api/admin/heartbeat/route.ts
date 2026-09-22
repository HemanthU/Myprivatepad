import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/audit";

export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  
  if (!adminSession.authorized || !("sessionId" in adminSession) || !(adminSession as any).sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = (adminSession as any).sessionId as string;

  try {
    const sessionRef = doc(db, "adminSessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const data = sessionDoc.data();
      if (data.status === "expired" || data.status === "ended") {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }

      await updateDoc(sessionRef, {
        lastActivity: new Date().toISOString()
      });
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
