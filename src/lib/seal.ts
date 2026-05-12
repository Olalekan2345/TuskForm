// TuskForm encryption layer — ECIES (ECDH P-256 + AES-256-GCM)
//
// Form creator generates an ECDH key pair at form-creation time.
// Public key is embedded in the form schema (stored on Walrus, readable by anyone).
// Private key stays in localStorage on the creator's device only.
//
// Respondents encrypt fields using the public key from the form schema.
// Only the creator can decrypt using their private key.
//
// Encrypted value format: "seal:v2:<base64(ephPub[65] + iv[12] + ciphertext)>"

export const SEAL_NETWORK = "mainnet";

export function isEncryptedField(privacy: "public" | "encrypted" | "admin_only"): boolean {
  return privacy === "encrypted" || privacy === "admin_only";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

const PRIV_PREFIX = "tuskform_ecdhpriv_";
const ENC_PREFIX  = "seal:v2:";

// ── Creator key management ────────────────────────────────────────────────────

/**
 * Generates an ECDH P-256 key pair for a form.
 * Stores the private key in localStorage. Returns the public key (goes in form schema).
 */
export async function generateFormKeyPair(formBlobId: string): Promise<string> {
  if (typeof window === "undefined") throw new Error("Keys are client-only");
  const kp = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const [pubRaw, privPkcs8] = await Promise.all([
    crypto.subtle.exportKey("raw", kp.publicKey),
    crypto.subtle.exportKey("pkcs8", kp.privateKey),
  ]);
  localStorage.setItem(PRIV_PREFIX + formBlobId, toB64(privPkcs8));
  return toB64(pubRaw); // public key — stored in form schema
}

/** Returns true if the creator's private key is available on this device. */
export function hasPrivateKey(formBlobId: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PRIV_PREFIX + formBlobId);
}

/** Retrieves the private key base64 from localStorage. */
export function getPrivateKeyB64(formBlobId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PRIV_PREFIX + formBlobId);
}

// ── Encryption (respondent side) ──────────────────────────────────────────────

/**
 * Encrypts plaintext using the form's public key (from the form schema).
 * Uses ECIES: ephemeral ECDH key exchange + AES-256-GCM.
 */
export async function encryptField(plaintext: string, publicKeyB64: string): Promise<string> {
  const creatorPub = await crypto.subtle.importKey(
    "raw", fromB64(publicKeyB64),
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );

  // Ephemeral key pair for this encryption
  const ephKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveBits"]
  );
  const ephPubRaw = await crypto.subtle.exportKey("raw", ephKP.publicKey);

  // Derive shared AES key via ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: creatorPub },
    ephKP.privateKey, 256
  );
  const aesKey = await crypto.subtle.importKey(
    "raw", sharedBits, { name: "AES-GCM" }, false, ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  );

  // Pack: ephPub (65 bytes) | iv (12 bytes) | ciphertext
  const payload = new Uint8Array(65 + 12 + ct.byteLength);
  payload.set(new Uint8Array(ephPubRaw), 0);
  payload.set(iv, 65);
  payload.set(new Uint8Array(ct), 77);

  return ENC_PREFIX + toB64(payload.buffer);
}

// ── Decryption (creator dashboard) ───────────────────────────────────────────

/**
 * Decrypts a "seal:v2:…" value using the creator's private key (from localStorage).
 * Returns null on failure (wrong key, corrupted data, etc).
 */
export async function decryptField(ciphertext: string, privateKeyB64: string): Promise<string | null> {
  if (!ciphertext.startsWith(ENC_PREFIX)) return null;
  try {
    const payload    = fromB64(ciphertext.slice(ENC_PREFIX.length));
    const ephPubBytes = payload.slice(0, 65);
    const iv          = payload.slice(65, 77);
    const ct          = payload.slice(77);

    const creatorPriv = await crypto.subtle.importKey(
      "pkcs8", fromB64(privateKeyB64),
      { name: "ECDH", namedCurve: "P-256" },
      false, ["deriveBits"]
    );
    const ephPub = await crypto.subtle.importKey(
      "raw", ephPubBytes,
      { name: "ECDH", namedCurve: "P-256" },
      false, []
    );

    const sharedBits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: ephPub },
      creatorPriv, 256
    );
    const aesKey = await crypto.subtle.importKey(
      "raw", sharedBits, { name: "AES-GCM" }, false, ["decrypt"]
    );

    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Returns true if a value is a sealed ciphertext. */
export function isSealedValue(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

// ── Legacy shim (v1 AES keys stored in localStorage) ─────────────────────────
// Forms created before this update used a symmetric AES key in localStorage.
// Those responses will show as unreadable — a re-submission is needed.
// Kept here so hasFormKey() doesn't crash existing code paths.

const LEGACY_PREFIX = "tuskform_formkey_";

export function hasFormKey(formBlobId: string): boolean {
  if (typeof window === "undefined") return false;
  return hasPrivateKey(formBlobId) || !!localStorage.getItem(LEGACY_PREFIX + formBlobId);
}

export async function registerFormKey(formBlobId: string): Promise<void> {
  // No-op: key pair is now generated in generateFormKeyPair() called from the builder.
  // Kept to avoid import errors in any code that still calls this.
}
