import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/audit";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const adminSession = await getAdminSession();
  
  if (adminSession.authorized && ("sessionId" in adminSession) && (adminSession as any).sessionId) {
    const sessionId = (adminSession as any).sessionId as string;
    
    try {
      const sessionRef = doc(db, "adminSessions", sessionId);
      await updateDoc(sessionRef, {
        status: "ended",
        endedAt: new Date().toISOString()
      });
      await logAdminAction("Admin logout", "system", {}, sessionId);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("padx_admin_token");

  return NextResponse.json({ success: true });
}
