// Estado firmado para el flujo OAuth de GitHub (anti-CSRF + liga al socio).
// HMAC-SHA256 con SESSION_SECRET. Formato: base64url(json).base64url(sig).

const encoder = new TextEncoder();

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
async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

interface StatePayload {
  uid: string;
  nonce: string;
  exp: number; // unix seconds
}

export async function signState(uid: string, secret: string): Promise<string> {
  const payload: StatePayload = {
    uid,
    nonce: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 600, // 10 min
  };
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body)),
  );
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyState(
  state: string | null,
  secret: string,
): Promise<StatePayload | null> {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body)),
  );
  const got = b64urlDecode(sig);
  if (expected.length !== got.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ got[i];
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as StatePayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
