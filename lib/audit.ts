import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export async function logAdminAction(action: string, padId: string, details?: any) {
  try {
    await addDoc(collection(db, "adminAuditLogs"), {
      action,
      padId,
      details: details || {},
      timestamp: new Date().toISOString(),
      actor: "Super Admin", // Could be tied to a specific admin session ID if available
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
