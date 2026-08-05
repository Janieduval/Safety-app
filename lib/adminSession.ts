const SECRET = process.env.ADMIN_SESSION_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("ADMIN_SESSION_SECRET must be set in production");
}

// Signed, expiring session token: "<email>.<expiryEpoch>.<hmacHex>"
// Uses Web Crypto (SubtleCrypto) rather than Node's `crypto` module so this
// same code runs both in API routes (Node runtime) and in middleware (Edge
// runtime). No server-side session store: the signature is what prevents
// forgery, and the expiry limits the replay window. Rotate
// ADMIN_SESSION_SECRET to invalidate all sessions at once if needed.

async function hmacHex(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSessionToken(
  email: string,
  ttlSeconds = 60 * 60 * 8
): Promise<string> {
  const expiry = Date.now() + ttlSeconds * 1000;
  const payload = `${email}.${expiry}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [email, expiryStr, sig] = parts;
  const payload = `${email}.${expiryStr}`;
  const expectedSig = await hmacHex(payload);

  if (sig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  const expiry = Number(expiryStr);
  if (Number.isNaN(expiry) || Date.now() > expiry) return null;

  return email;
}
