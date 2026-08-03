// Cifrado simétrico para tokens de terceros (GitHub) guardados en D1.
// AES-256-GCM con clave derivada de SESSION_SECRET (SHA-256). Sin secret nuevo.
// Formato de salida: base64url(iv).base64url(ciphertext+tag).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(
  plaintext: string,
  secret: string,
): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      encoder.encode(plaintext) as BufferSource,
    ),
  );
  return `${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
}

export async function decryptSecret(
  packed: string,
  secret: string,
): Promise<string | null> {
  try {
    const [ivPart, ctPart] = packed.split(".");
    if (!ivPart || !ctPart) return null;
    const key = await aesKey(secret);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64urlDecode(ivPart) as BufferSource },
      key,
      b64urlDecode(ctPart) as BufferSource,
    );
    return decoder.decode(pt);
  } catch {
    return null;
  }
}
