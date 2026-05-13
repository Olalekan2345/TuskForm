// TuskForm encryption layer
//
// v2 (ECIES): legacy — ECDH P-256 + AES-256-GCM, private key in localStorage.
//   Used for forms that were created without a Seal package ID.
//   Format: "seal:v2:<base64(ephPub[65] + iv[12] + ciphertext)>"
//
// v3 (Seal): real Mysten Seal threshold IBE encryption.
//   The encrypted object is stored as BCS bytes and base64-encoded.
//   Only the creator can decrypt by presenting a valid seal_approve transaction.
//   Format: "seal:v3:<base64(encryptedObject)>"

import { SealClient, SessionKey } from "@mysten/seal";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";

// ── Network / key server config ──────────────────────────────────────────────

export const SEAL_NETWORK = "mainnet";

// Verified Seal mainnet key servers (NodeInfra, both confirmed to exist on-chain).
// Override via NEXT_PUBLIC_SEAL_SERVER_* env vars.
const DEFAULT_SERVER_1 = "0x1afb3a57211ceff8f6781757821847e3ddae73f64e78ec8cd9349914ad985475";
const DEFAULT_SERVER_2 = "0x9fa1c86659a98201d464962b8344c6948f3fb2572d585d57a028973c6357e2db";

function getSealServerConfigs() {
  const s1 = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SEAL_SERVER_1) || DEFAULT_SERVER_1;
  const s2 = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SEAL_SERVER_2) || DEFAULT_SERVER_2;
  return [
    { objectId: s1, weight: 1 },
    { objectId: s2, weight: 1 },
  ];
}

// Lazy singleton SuiJsonRpcClient (client-side only)
let _suiClient: SuiJsonRpcClient | null = null;
function getSuiClient(): SuiJsonRpcClient {
  if (!_suiClient) {
    _suiClient = new SuiJsonRpcClient({
      network: "mainnet",
      url: getJsonRpcFullnodeUrl("mainnet"),
    });
  }
  return _suiClient;
}

// Lazy singleton SealClient (client-side only)
let _sealClient: SealClient | null = null;
export function getSealClient(): SealClient {
  if (!_sealClient) {
    _sealClient = new SealClient({
      suiClient: getSuiClient(),
      serverConfigs: getSealServerConfigs(),
      verifyKeyServers: false, // Skip until we know server keys are stable
    });
  }
  return _sealClient;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const result = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2) {
    result[i / 2] = parseInt(h.slice(i, i + 2), 16);
  }
  return result;
}

// ── Value-format detection ────────────────────────────────────────────────────

const V2_PREFIX = "seal:v2:";
const V3_PREFIX = "seal:v3:";

export function isSealedValue(value: string): boolean {
  return typeof value === "string" && (value.startsWith(V2_PREFIX) || value.startsWith(V3_PREFIX));
}

export function isSealV3Value(value: string): boolean {
  return typeof value === "string" && value.startsWith(V3_PREFIX);
}

export function isSealV2Value(value: string): boolean {
  return typeof value === "string" && value.startsWith(V2_PREFIX);
}

export function isEncryptedField(privacy: "public" | "encrypted" | "admin_only"): boolean {
  return privacy === "encrypted" || privacy === "admin_only";
}

// ── v3 Seal encryption (respondent side) ─────────────────────────────────────

/**
 * Encrypts plaintext using Mysten Seal threshold IBE.
 * Identity = creator's Sui address (32-byte hex, no 0x).
 * Returns "seal:v3:<base64(encryptedObject)>".
 */
export async function encryptFieldSeal(
  plaintext: string,
  creatorAddress: string,
  packageId: string,
): Promise<string> {
  const sealClient = getSealClient();
  const id = creatorAddress.startsWith("0x") ? creatorAddress.slice(2) : creatorAddress;
  const data = new TextEncoder().encode(plaintext);

  const { encryptedObject } = await sealClient.encrypt({
    threshold: 2,
    packageId,
    id,
    data,
  });

  return V3_PREFIX + toB64(encryptedObject.buffer as ArrayBuffer);
}

// ── v3 Seal approval transaction ──────────────────────────────────────────────

/**
 * Builds the transaction bytes that call address_gate::seal_approve.
 * The Seal key servers simulate this to verify the caller is the creator.
 */
export async function buildSealApprovalTx(
  packageId: string,
  creatorAddress: string,
): Promise<Uint8Array> {
  const idBytes = hexToBytes(creatorAddress);
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::address_gate::seal_approve`,
    arguments: [tx.pure.vector("u8", Array.from(idBytes))],
  });
  // Build only the transaction kind bytes (no gas needed for simulation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tx.build({ client: getSuiClient() as any, onlyTransactionKind: true });
}

// ── v3 Seal decryption (creator dashboard) ────────────────────────────────────

/**
 * Creates and authenticates a SessionKey.
 * Returns the SessionKey after the user signs the personal message.
 * `signPersonalMessage(bytes)` should call the wallet adapter's signPersonalMessage.
 */
export async function createAuthenticatedSessionKey(
  creatorAddress: string,
  packageId: string,
  signPersonalMessage: (bytes: Uint8Array) => Promise<{ signature: string }>,
): Promise<SessionKey> {
  const sessionKey = await SessionKey.create({
    address: creatorAddress,
    packageId,
    ttlMin: 10,
    suiClient: getSuiClient(),
  });

  const message = sessionKey.getPersonalMessage();
  const { signature } = await signPersonalMessage(message);
  await sessionKey.setPersonalMessageSignature(signature);

  return sessionKey;
}

/**
 * Decrypts a "seal:v3:…" ciphertext using the creator's authenticated SessionKey.
 * Returns the decrypted plaintext, or null on failure.
 */
export async function decryptFieldSeal(
  ciphertext: string,
  sessionKey: SessionKey,
  txBytes: Uint8Array,
): Promise<string | null> {
  if (!ciphertext.startsWith(V3_PREFIX)) return null;
  try {
    const encrypted = fromB64(ciphertext.slice(V3_PREFIX.length));
    const plain = await getSealClient().decrypt({ data: encrypted, sessionKey, txBytes });
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ── v2 ECIES (legacy / fallback) ─────────────────────────────────────────────

const PRIV_PREFIX = "tuskform_ecdhpriv_";

export function hasPrivateKey(formBlobId: string): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PRIV_PREFIX + formBlobId);
}

export function getPrivateKeyB64(formBlobId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PRIV_PREFIX + formBlobId);
}

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
  return toB64(pubRaw);
}

export async function encryptField(plaintext: string, publicKeyB64: string): Promise<string> {
  const creatorPub = await crypto.subtle.importKey(
    "raw", fromB64(publicKeyB64),
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );
  const ephKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveBits"]
  );
  const ephPubRaw = await crypto.subtle.exportKey("raw", ephKP.publicKey);
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
  const payload = new Uint8Array(65 + 12 + ct.byteLength);
  payload.set(new Uint8Array(ephPubRaw), 0);
  payload.set(iv, 65);
  payload.set(new Uint8Array(ct), 77);
  return V2_PREFIX + toB64(payload.buffer as ArrayBuffer);
}

export async function decryptField(ciphertext: string, privateKeyB64: string): Promise<string | null> {
  if (!ciphertext.startsWith(V2_PREFIX)) return null;
  try {
    const payload     = fromB64(ciphertext.slice(V2_PREFIX.length));
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

// ── Legacy shims ──────────────────────────────────────────────────────────────

const LEGACY_PREFIX = "tuskform_formkey_";

export function hasFormKey(formBlobId: string): boolean {
  if (typeof window === "undefined") return false;
  return hasPrivateKey(formBlobId) || !!localStorage.getItem(LEGACY_PREFIX + formBlobId);
}

export async function registerFormKey(_formBlobId: string): Promise<void> {
  // No-op: replaced by generateFormKeyPair / sealPackageId in builder
}
