import { NextResponse } from "next/server";

// In-memory store for rate limiting (in production, use Redis or Firestore)
const rateLimitStore = new Map<string, { attempts: number, lockUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const { email, ip } = await req.json();
    const identifier = ip || email || "unknown";

    const record = rateLimitStore.get(identifier);

    if (record) {
      if (record.lockUntil > Date.now()) {
        return NextResponse.json({ 
          error: "Account temporarily locked due to too many failed attempts. Please try again later.",
          locked: true,
          lockUntil: record.lockUntil
        }, { status: 429 });
      }

      // If lock has expired, reset attempts
      if (record.lockUntil > 0 && record.lockUntil <= Date.now()) {
        rateLimitStore.delete(identifier);
      }
    }

    // In a real app, you would verify the password here.
    // We are simulating a failed login attempt for demonstration of brute force protection.
    const isSuccess = false; // Simulated failure

    if (!isSuccess) {
      const currentRecord = rateLimitStore.get(identifier) || { attempts: 0, lockUntil: 0 };
      currentRecord.attempts += 1;

      if (currentRecord.attempts >= MAX_ATTEMPTS) {
        currentRecord.lockUntil = Date.now() + LOCKOUT_DURATION;
      }

      rateLimitStore.set(identifier, currentRecord);

      return NextResponse.json({ 
        error: "Invalid credentials.",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - currentRecord.attempts)
      }, { status: 401 });
    }

    // On successful login, clear the rate limit
    rateLimitStore.delete(identifier);
    return NextResponse.json({ success: true, message: "Login successful" });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
