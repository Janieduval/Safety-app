const SECRET = process.env.SUPERVISOR_SESSION_SECRET ?? "";
if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SUPERVISOR_SESSION_SECRET must be set in production");
}

// Signed, expiring session token: "<supervisorId>.<expiryEpoch>.<hmacHex>"
// Same anchor-from-the-end parsing as adminSession.ts, so this stays safe
// even if supervisor IDs ever contain dots. Uses Web Crypto so it works in
// both the Node runtime (API routes) and the Edge runtime.

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

export async function createSupervisorSessionToken(
  supervisorId: string,
  ttlSeconds = 60 * 60 * 12 // safety net expiry even though the cookie itself is session-only
): Promise<string> {
  const expiry = Date.now() + ttlSeconds * 1000;
  const payload = `${supervisorId}.${expiry}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifySupervisorSessionToken(
  token: string | undefined | null
): Promise<string | null> {
  if (!token || token.length <= SIG_HEX_LENGTH + 1) return null;
  const sig = token.slice(-SIG_HEX_LENGTH);
  const payload = token.slice(0, -(SIG_HEX_LENGTH + 1));
  const lastDot = payload.lastIndexOf(".");
  if (lastDot === -1) return null;
  const supervisorId = payload.slice(0, lastDot);
  const expiryStr = payload.slice(lastDot + 1);
  if (!supervisorId || !/^\d+$/.test(expiryStr)) return null;
  const expectedSig = await hmacHex(payload);
  if (sig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;
  const expiry = Number(expiryStr);
  if (Number.isNaN(expiry) || Date.now() > expiry) return null;
  return supervisorId;
}
