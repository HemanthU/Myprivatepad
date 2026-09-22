import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { hashPassword, verifyPassword, isLegacyPassword, isHashedPassword } from '@/lib/padCrypto';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Invalid pad' }, { status: 400 });
  }
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { password } = body;
  if (!password || typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }
  if (password.length > 512) {
    return NextResponse.json({ error: 'Password too long' }, { status: 400 });
  }
  try {
    const settingsRef = doc(db, 'padSettings', slug);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      return NextResponse.json({ error: 'Pad not found' }, { status: 404 });
    }
    const settings = settingsSnap.data();
    if (!settings.locked) {
      return NextResponse.json({ error: 'Pad is not locked' }, { status: 400 });
    }
    let mainMatch = false;
    let decoyMatch = false;

    if (isHashedPassword(settings)) {
      mainMatch = await verifyPassword(password, settings.passwordHash, settings.passwordSalt, settings.passwordIter ?? 200000);
      if (!mainMatch && settings.decoyPasswordAlgo === 'pbkdf2' && settings.decoyPasswordHash) {
        decoyMatch = await verifyPassword(password, settings.decoyPasswordHash, settings.decoyPasswordSalt, settings.decoyPasswordIter ?? 200000);
      }
    }

    if (!mainMatch && !decoyMatch && isLegacyPassword(settings)) {
      if (password === settings.password) {
        mainMatch = true;
        try {
          const hashed = await hashPassword(password);
          await updateDoc(settingsRef, {
            passwordHash: hashed.hash, passwordSalt: hashed.salt,
            passwordIter: hashed.iter, passwordAlgo: hashed.algo,
            password: deleteField(),
          });
        } catch (migErr) { console.error('Password migration failed:', migErr); }
      } else if (settings.decoyPassword && password === settings.decoyPassword) {
        decoyMatch = true;
        try {
          const hashedDecoy = await hashPassword(settings.decoyPassword);
          await updateDoc(settingsRef, {
            decoyPasswordHash: hashedDecoy.hash, decoyPasswordSalt: hashedDecoy.salt,
            decoyPasswordIter: hashedDecoy.iter, decoyPasswordAlgo: hashedDecoy.algo,
            decoyPassword: deleteField(),
          });
        } catch (migErr) { console.error('Decoy migration failed:', migErr); }
      }
    }

    if (!mainMatch && !decoyMatch) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const cookieName = decoyMatch ? `padx_decoy_${slug}` : `padx_unlocked_${slug}`;
    cookieStore.set(cookieName, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return NextResponse.json({ success: true, decoy: decoyMatch });
  } catch (error) {
    console.error('Unlock error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
