export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-mainnet.walrus.space";

// Browser-side singleton for the relay flow — reused across calls
let _browserWalrusClient: import("@mysten/walrus").WalrusClient | null = null;

// Stores a JSON blob on Walrus using whichever method is available:
//
//   Method A — Publisher (tried first, fast):
//     Server proxies blob to publisher via PUT /v1/blobs.
//     Fast (<5 s), no WAL from the user.
//
//   Method B — Upload Relay (fallback when publisher is down):
//     Browser sends register TX (user pays WAL), our /v1/blob-upload-relay
//     endpoint handles WASM encode + sliver upload, then browser certifies.
//
// If neither works, the error from Method B propagates.
export async function storeOnWalrusWithWallet(
  data: object,
  owner: string,
  signAndExecuteAsync: ((tx: unknown) => Promise<{ digest: string }>) | null,
  onStatus?: (msg: string) => void
): Promise<string> {
  if (!signAndExecuteAsync) {
    onStatus?.("Storing on Walrus…");
    return storeOnWalrus(data);
  }

  // ── Method A: publisher proxy ──────────────────────────────────────────────
  // Try the publisher first — it's fast and doesn't require wallet interaction
  // beyond identity. No WAL deducted from the user.
  try {
    onStatus?.("Storing via Walrus publisher…");
    const blobId = await storeOnWalrus(data);
    return blobId;
  } catch {
    // Publisher is down or rate-limited — fall through to relay
    onStatus?.("Publisher unavailable, switching to relay…");
  }

  // ── Method B: upload relay (user pays WAL) ─────────────────────────────────
  // Only reached when every publisher in /api/walrus/store has failed.
  const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
  const epochs = parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS ?? "52", 10);
  const suiRpcUrl =
    network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443";
  const relayHost =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  onStatus?.("Preparing Walrus relay client…");
  if (!_browserWalrusClient) {
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
    const suiClient = new SuiJsonRpcClient({ url: suiRpcUrl });
    _browserWalrusClient = new WalrusClient({
      network,
      suiClient,
      uploadRelay: { host: relayHost, timeout: 55_000 },
    });
  }

  const blob = new TextEncoder().encode(JSON.stringify(data));
  const flow = _browserWalrusClient.writeBlobFlow({ blob });

  // With uploadRelay: encode() only computes metadata hash, not full slivers
  onStatus?.("Computing blob hash…");
  const encoded = await flow.encode();

  onStatus?.("Preparing Walrus transaction…");
  const tx = flow.register({ owner, epochs, deletable: false });

  // First wallet popup: pay WAL for on-chain blob registration
  onStatus?.("Approve WAL payment in your wallet…");
  const { digest } = await signAndExecuteAsync(tx);

  // Relay encodes slivers + uploads to nodes server-side (avoids CORS)
  onStatus?.("Uploading via relay…");
  await flow.upload({ digest });

  // Second wallet popup: submit BLS certificate on-chain to certify the blob
  onStatus?.("Certifying blob on-chain…");
  const certifyTx = flow.certify();
  await signAndExecuteAsync(certifyTx);

  return encoded.blobId;
}

export async function storeFileOnWalrus(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ blobId: string; fileName: string; fileType: string; fileSize: number }> {
  onProgress?.(10);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/walrus/upload", { method: "POST", body: form });
  onProgress?.(90);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }
  onProgress?.(100);
  return res.json();
}

export async function storeOnWalrus(data: object): Promise<string> {
  const res = await fetch("/api/walrus/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Walrus store failed (${res.status})`);
  }
  const { blobId } = await res.json();
  return blobId;
}

export async function fetchFromWalrus<T = unknown>(blobId: string): Promise<T> {
  const res = await fetch(`/api/walrus/${blobId}`);
  if (!res.ok) {
    throw new Error(`Walrus fetch failed (${res.status}) for blob: ${blobId}`);
  }
  return res.json();
}
