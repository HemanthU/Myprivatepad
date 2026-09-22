import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'Invalid pad' }, { status: 400 });
  try {
    const settingsSnap = await getDoc(doc(db, 'padSettings', slug));
    if (!settingsSnap.exists()) {
      return NextResponse.json({ accessible: true, locked: false, timeLocked: false });
    }
    const settings = settingsSnap.data();
    if (settings.timeLocked && settings.unlockAt) {
      const unlockAt = new Date(settings.unlockAt).getTime();
      const serverNow = Date.now(); // SERVER-SIDE — cannot be manipulated by client
      if (serverNow < unlockAt) {
        return NextResponse.json({ accessible: false, timeLocked: true, unlockAt: settings.unlockAt });
      }
    }
    if (settings.locked) {
      const cookieStore = await cookies();
      const unlockedCookie = cookieStore.get(`padx_unlocked_${slug}`);
      const decoyCookie = cookieStore.get(`padx_decoy_${slug}`);
      if (!unlockedCookie && !decoyCookie) {
        return NextResponse.json({ accessible: false, locked: true, timeLocked: false });
      }
    }
    return NextResponse.json({ accessible: true, locked: false, timeLocked: false });
  } catch (error) {
    console.error('Access check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
