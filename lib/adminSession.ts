const SECRET = process.env.ADMIN_SESSION_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("ADMIN_SESSION_SECRET must be set in production");
}

// Signed, expiring session token: "<email>.<expiryEpoch>.<hmacHex>"
//
// IMPORTANT: email addresses can contain dots (e.g. "j.duval@acle.com.au"),
// so this token is NOT parsed with a naive token.split(".") — that would
// shatter the email itself into extra pieces and always fail verification
// (this was a real bug: every login silently failed for exactly this
// reason). Instead we anchor from the end of the string: the HMAC-SHA256
// signature is always exactly 64 hex characters, so we peel that off first,
// then split the remainder on the LAST dot to separate email from expiry
// (the expiry is a plain integer and can never contain a dot itself).
//
// Uses Web Crypto (SubtleCrypto) rather than Node's `crypto` module so this
// same code runs both in API routes (Node runtime) and in middleware (Edge
// runtime). No server-side session store: the signature is what prevents
// forgery, and the expiry limits the replay window. Rotate
// ADMIN_SESSION_SECRET to invalidate all sessions at once if needed.

const SIG_HEX_LENGTH = 64; // SHA-256 -> 32 bytes -> 64 hex chars

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
  if (!token || token.length <= SIG_HEX_LENGTH + 1) return null;

  const sig = token.slice(-SIG_HEX_LENGTH);
  const payload = token.slice(0, -(SIG_HEX_LENGTH + 1)); // drop sig + its separating dot
  const lastDot = payload.lastIndexOf(".");
  if (lastDot === -1) return null;

  const email = payload.slice(0, lastDot);
  const expiryStr = payload.slice(lastDot + 1);
  if (!email || !/^\d+$/.test(expiryStr)) return null;

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
