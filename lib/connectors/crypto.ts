const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isEncryptionConfigured(): boolean {
  return !!process.env.CONNECTOR_ENCRYPTION_KEY;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CONNECTOR_ENCRYPTION_KEY is not set. Add it in Vercel environment variables."
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptJson(value: unknown): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value))
  );
  return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

export async function decryptJson<T>(payload: string): Promise<T> {
  const key = await getKey();
  const parts = payload.split(".");
  if (parts.length !== 2) throw new Error("Invalid encrypted payload");
  const iv = b64ToBytes(parts[0]);
  const data = b64ToBytes(parts[1]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );
  return JSON.parse(decoder.decode(plain)) as T;
}
