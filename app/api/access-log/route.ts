import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ALLOWED_ACTIONS = new Set([
  'pad_created', 'pad_viewed', 'pad_unlocked', 'unlock_failed',
  'pad_shared', 'sharing_changed', 'pad_exported', 'pad_deleted',
  'pad_restored', 'version_restored', 'time_lock_configured', 'pad_locked'
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, padId, success, device, details } = body;

    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!padId || typeof padId !== 'string' || padId.length > 200) {
      return NextResponse.json({ error: 'Invalid padId' }, { status: 400 });
    }

    // Scrub sensitive keys from details before persisting
    const sensitiveKeys = ['password', 'token', 'jwt', 'secret', 'hash', 'salt', 'shadowKey'];
    const safeDetails: Record<string, any> = {};
    if (details && typeof details === 'object') {
      for (const [k, v] of Object.entries(details)) {
        if (!sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
          safeDetails[k] = v;
        }
      }
    }

    await addDoc(collection(db, 'accessLogs'), {
      action,
      padId,
      timestamp: serverTimestamp(),
      device: typeof device === 'string' ? device.slice(0, 50) : 'unknown',
      success: success === false ? false : true,
      ...(Object.keys(safeDetails).length > 0 ? { details: safeDetails } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Access log API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}