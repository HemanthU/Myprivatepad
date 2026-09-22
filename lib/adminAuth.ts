import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(process.env.ADMIN_SECRET || "default_dev_secret_pad_x_super_admin_v1");

export async function signAdminToken(sessionId: string) {
  const token = await new SignJWT({ role: "super_admin", sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
  return token;
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role === "super_admin") {
      return { authorized: true, sessionId: payload.sessionId as string };
    }
    return { authorized: false };
  } catch (e) {
    return { authorized: false };
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("padx_admin_token")?.value;
  if (!token) return { authorized: false };
  return await verifyAdminToken(token);
}
