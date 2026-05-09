"use client";

// Browser-only — dynamically imported, never SSR'd.
// Uses @mysten/walrus SDK directly for wallet-signed blob registration.

export interface WalrusWriteResult {
  blobId: string;
  digest: string;
}

const WALRUS_NETWORK = (process.env.NEXT_PUBLIC_WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
const WALRUS_EPOCHS = parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS ?? "5", 10);

// Returns the unsigned register Transaction and the blobId.
// The caller must sign + execute the transaction via dapp-kit, then call
// POST /api/walrus/commit with { data, digest } to upload slivers.
export async function buildWalrusRegisterTx(
  data: object,
  owner: string
): Promise<{ tx: unknown; blobId: string }> {
  const { WalrusClient } = await import("@mysten/walrus");
  const { SuiGrpcClient } = await import("@mysten/sui/grpc");

  const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
  const walrusClient = new WalrusClient({ network: WALRUS_NETWORK, suiClient });

  const blob = new TextEncoder().encode(JSON.stringify(data));
  const flow = walrusClient.writeBlobFlow({ blob });
  const encoded = await flow.encode();
  const tx = flow.register({ owner, epochs: WALRUS_EPOCHS, deletable: false });

  return { tx, blobId: encoded.blobId };
}
