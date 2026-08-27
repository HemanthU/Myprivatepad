import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAdminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    // Verify using the existing shared Admin password logic
    if (password === "sams") {
      const token = await signAdminToken();
      
      const cookieStore = await cookies();
      cookieStore.set("padx_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
