import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

/**
 * GET /api/admin/logs
 * Returns adminAuditLogs and adminSessions for the admin activity page.
 * Requires valid admin JWT cookie.
 * This allows Firestore rules to lock these collections to if:false
 * while still allowing the admin UI to read them via server-side auth.
 */
export async function GET(req: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'logs';
    const limitCount = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);

    if (type === 'sessions') {
      const sessionsQuery = query(collection(db, 'adminSessions'), orderBy('startedAt', 'desc'), limit(limitCount));
      const sessionsSnap = await getDocs(sessionsQuery);
      const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ sessions });
    }

    // Default: audit logs
    const logsQuery = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const logsSnap = await getDocs(logsQuery);
    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Admin logs API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}