// TuskForm encryption layer
//
// Encrypted fields use AES-256-GCM. A unique key is derived per form from a
// random seed generated at form-creation time and persisted in localStorage.
// The key never leaves the creator's device without explicit export, so only
// the creator can read private responses in the dashboard.
//
// Full Seal threshold encryption (across devices, wallet-gated) requires:
//   1. A Move access-policy package deployed on Sui mainnet
//   2. @mysten/seal key-server integration (installed: @mysten/seal ^1.1.3)
// When those are wired up, replace the AES helpers below with SealClient
// encrypt/decrypt calls — the rest of the app is already structured for it.

export const SEAL_NETWORK = "mainnet";

export function isEncryptedField(privacy: "public" | "encrypted" | "admin_only"): boolean {
  return privacy === "encrypted" || privacy === "admin_only";
}

// ── Key management ──────────────────────────────────────────────────────────

const STORE_PREFIX = "tuskform_formkey_";

function storageKey(formBlobId: string): string {
  return `${STORE_PREFIX}${formBlobId}`;
}

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKeyBase64(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Returns (or creates) the AES-256 key for a given form. Persisted in localStorage. */
export async function getFormKey(formBlobId: string): Promise<CryptoKey> {
  if (typeof window === "undefined") throw new Error("Keys are client-only");
  const stored = localStorage.getItem(storageKey(formBlobId));
  if (stored) return importKeyBase64(stored);
  const key = await generateKey();
  localStorage.setItem(storageKey(formBlobId), await exportKeyBase64(key));
  return key;
}

/** Used by the builder to pre-register a key when a new form is first created. */
export async function registerFormKey(formBlobId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(storageKey(formBlobId))) return; // already exists
  const key = await generateKey();
  localStorage.setItem(storageKey(formBlobId), await exportKeyBase64(key));
}

/** True if this device holds the encryption key for the given form. */
export function hasFormKey(formBlobId: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(storageKey(formBlobId));
}

// ── Encrypt / Decrypt ────────────────────────────────────────────────────────

const ENC_PREFIX = "seal:v1:";

/** Encrypts a plaintext string. Returns a base64 payload prefixed with "seal:v1:". */
export async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  // Encode iv + ciphertext together
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
}

/** Decrypts a "seal:v1:..." payload. Returns null on failure (wrong key / corrupt). */
export async function decryptField(ciphertext: string, key: CryptoKey): Promise<string | null> {
  if (!ciphertext.startsWith(ENC_PREFIX)) return null;
  try {
    const combined = Uint8Array.from(atob(ciphertext.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Returns true if a stored value is a sealed ciphertext. */
export function isSealedValue(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}
