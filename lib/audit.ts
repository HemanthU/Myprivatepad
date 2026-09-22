import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

function scrubSensitiveData(data: any): any {
  if (!data) return {};
  const scrubbed = { ...data };
  const sensitiveKeys = ["password", "token", "jwt", "secret", "shadowKey"];
  
  for (const key of Object.keys(scrubbed)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      scrubbed[key] = "[REDACTED]";
    } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
      scrubbed[key] = scrubSensitiveData(scrubbed[key]);
    }
  }
  return scrubbed;
}

export async function logAdminAction(action: string, padId?: string, details?: any, sessionId?: string) {
  try {
    await addDoc(collection(db, "adminAuditLogs"), {
      action,
      padId: padId || "system",
      details: scrubSensitiveData(details),
      timestamp: new Date().toISOString(),
      actor: "Super Admin",
      sessionId: sessionId || "unknown",
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
