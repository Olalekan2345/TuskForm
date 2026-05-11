export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus.space";

// Browser-side singleton — cached after first encode call to amortize WASM init
let _browserWalrusClient: import("@mysten/walrus").WalrusClient | null = null;

// Stores a JSON blob on Walrus entirely in the browser.
// All WASM encoding and sliver upload happen client-side, eliminating server
// timeout issues. Storage nodes return CORS *, so direct browser upload works.
// Falls back to storeOnWalrus (publisher REST API) if no wallet is connected.
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

  const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
  const epochs = parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS ?? "52", 10);
  const suiRpcUrl =
    network === "mainnet"
      ? "https://fullnode.mainnet.sui.io:443"
      : "https://fullnode.testnet.sui.io:443";

  // Step 1: encode the blob with WASM (runs in the browser, no server timeout)
  onStatus?.("Encoding blob…");
  if (!_browserWalrusClient) {
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiClient } = await import("@mysten/sui/client");
    const suiClient = new SuiClient({ url: suiRpcUrl });
    _browserWalrusClient = new WalrusClient({
      network,
      suiClient,
      storageNodeClientOptions: { timeout: 10_000 },
    });
  }

  const blob = new TextEncoder().encode(JSON.stringify(data));
  const flow = _browserWalrusClient.writeBlobFlow({ blob });
  const encoded = await flow.encode();

  // Step 2: build register TX — coinWithBalance resolved by dapp-kit at sign time
  onStatus?.("Preparing Walrus transaction…");
  const tx = flow.register({ owner, epochs, deletable: false });

  // Step 3: wallet signs and pays WAL (dapp-kit resolves coinWithBalance)
  onStatus?.("Approve WAL payment in your wallet…");
  const { digest } = await signAndExecuteAsync(tx);

  // Step 4: upload slivers directly from the browser to storage nodes (CORS *)
  onStatus?.("Uploading to Walrus storage nodes…");
  await flow.upload({ digest });

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
