export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus.space";

// Stores a JSON blob on Walrus using the user's wallet to pay WAL.
// Steps:
//   1. buildWalrusRegisterTx (browser SDK) → register Transaction + blobId
//   2. signAndExecuteAsync (dapp-kit via walletStore) → tx digest
//   3. POST /api/walrus/commit → uploads slivers to storage nodes
// Falls back to storeOnWalrus (publisher REST API) if wallet fn not available.
export async function storeOnWalrusWithWallet(
  data: object,
  owner: string,
  signAndExecuteAsync: ((tx: unknown) => Promise<{ digest: string }>) | null,
  onStatus?: (msg: string) => void
): Promise<string> {
  if (!signAndExecuteAsync) {
    // No wallet connected — fall back to publisher REST API
    onStatus?.("Storing on Walrus…");
    return storeOnWalrus(data);
  }

  // Wallet connected: use the on-chain WAL payment flow.
  // Errors propagate directly so the UI shows the real failure reason.

  // Step 1: server builds the register transaction using owner's WAL coins
  onStatus?.("Preparing Walrus transaction…");
  const regRes = await fetch("/api/walrus/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, owner }),
  });
  if (!regRes.ok) {
    const err = await regRes.json().catch(() => ({ error: "Register failed" }));
    throw new Error(err.error || `Register failed (${regRes.status})`);
  }
  const { txBase64, blobId } = await regRes.json();

  // Step 2: wallet signs the pre-built transaction bytes (pays WAL)
  onStatus?.("Approve WAL payment in your wallet…");
  const { digest } = await signAndExecuteAsync(txBase64);

  // Step 3: server uploads slivers to Walrus storage nodes
  onStatus?.("Uploading to Walrus storage nodes…");
  const commitRes = await fetch("/api/walrus/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, digest }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `Upload failed (${commitRes.status})`);
  }
  const result = await commitRes.json();
  return result.blobId ?? blobId;
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
