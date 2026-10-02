export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, password?: string | null): Promise<string> {
  if (!password) return text;
  
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(text)
  );

  const encryptedBytes = new Uint8Array(encrypted);
  
  // Pack: salt(16) + iv(12) + ciphertext
  const packed = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(encryptedBytes, salt.length + iv.length);
  
  return "E2EE:" + btoa(String.fromCharCode(...packed));
}

export async function decryptText(ciphertextBase64: string, password?: string | null): Promise<string> {
  if (!password) return ciphertextBase64;
  if (!ciphertextBase64.startsWith("E2EE:")) {
    // Migration fallback: If it's not prefixed, it's old plaintext
    return ciphertextBase64;
  }

  try {
    const b64 = ciphertextBase64.replace("E2EE:", "");
    const binaryStr = atob(b64);
    const packed = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) packed[i] = binaryStr.charCodeAt(i);

    const salt = packed.slice(0, 16);
    const iv = packed.slice(16, 28);
    const encryptedBytes = packed.slice(28);

    const key = await deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed. Invalid password or corrupted data.");
    throw e;
  }
}

export async function hashRoomName(slug: string, password?: string | null): Promise<string> {
  if (!password) return `padX-secure-${slug}`;
  const enc = new TextEncoder();
  const data = enc.encode(slug + ":" + password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `padX-secure-${slug}-${hashHex.substring(0, 16)}`;
}
