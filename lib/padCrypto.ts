/**
 * padCrypto.ts
 * Secure password hashing for pad locks using the Web Crypto API.
 * Works in both Node.js (via globalThis.crypto) and browser environments.
 *
 * Storage format in padSettings:
 *   passwordHash: "<hex-encoded-hash>"
 *   passwordSalt: "<hex-encoded-salt>"
 *   passwordIter: 200000
 *   passwordAlgo: "pbkdf2"
 *
 * Legacy detection: if padSettings.password exists (plaintext), the
 * lazy-migration path in the unlock API upgrades it transparently.
 */

const ITERATIONS = 200_000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH = 32; // bytes

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexDecode(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

async function getCrypto(): Promise<Crypto> {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  const { webcrypto } = await import("crypto");
  return webcrypto as unknown as Crypto;
}

export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string; iter: number; algo: string }> {
  const crypto = await getCrypto();
  const saltBuf = crypto.getRandomValues(new Uint8Array(16));
  const salt = hexEncode(saltBuf.buffer);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuf as any, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial, KEY_LENGTH * 8
  );
  return { hash: hexEncode(derived), salt, iter: ITERATIONS, algo: "pbkdf2" };
}

export async function verifyPassword(
  password: string, storedHash: string, storedSalt: string, iterations: number = ITERATIONS
): Promise<boolean> {
  const crypto = await getCrypto();
  const enc = new TextEncoder();
  const saltBuf = hexDecode(storedSalt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuf as any, iterations, hash: HASH_ALGO },
    keyMaterial, KEY_LENGTH * 8
  );
  const candidateHash = hexEncode(derived);
  if (candidateHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function isLegacyPassword(settings: Record<string, any>): boolean {
  return typeof settings.password === "string" && settings.password.length > 0 && settings.passwordAlgo !== "pbkdf2";
}

export function isHashedPassword(settings: Record<string, any>): boolean {
  return settings.passwordAlgo === "pbkdf2" && typeof settings.passwordHash === "string";
}
