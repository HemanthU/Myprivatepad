import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const padDoc = await getDoc(doc(db, "notes", slug));
    const settingsDoc = await getDoc(doc(db, "padSettings", slug));
    
    const settings = settingsDoc.exists() ? settingsDoc.data() : {};
    const content = padDoc.exists() ? padDoc.data()?.text : null;

    let actionLabel = "Viewed protected pad";
    if (settings.shadowMode) actionLabel = "Viewed shadow pad";
    
    await logAdminAction(actionLabel, slug);

    return NextResponse.json({
      success: true,
      content: content,
      settings: settings
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pad" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const body = await req.json();
    const { action, updates } = body;

    const settingsRef = doc(db, "padSettings", slug);
    
    if (action === "updateSecurity") {
      await updateDoc(settingsRef, updates);
      await logAdminAction("Changed security", slug, updates);
    } else if (action === "updateLifecycle") {
      await updateDoc(settingsRef, updates);
      await logAdminAction("Restored expired pad", slug, updates);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update pad" }, { status: 500 });
  }
}
