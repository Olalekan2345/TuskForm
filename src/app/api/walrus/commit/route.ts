import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";

// Module-level singletons — survive across requests in the same Lambda instance.
// WASM is instantiated at module load time; caching the client also caches the
// system state (n_shards) so encodeBlob drops from ~9 s cold to ~3 s warm.
let _walrusClient: import("@mysten/walrus").WalrusClient | null = null;
let _suiClient: import("@mysten/sui/grpc").SuiGrpcClient | null = null;

async function getClients() {
  if (!_suiClient || !_walrusClient) {
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");
    _suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
    _walrusClient = new WalrusClient({
      network: WALRUS_NETWORK,
      suiClient: _suiClient,
      storageNodeClientOptions: { timeout: 12_000 },
    });
  }
  return { suiClient: _suiClient!, walrusClient: _walrusClient! };
}

export async function POST(req: NextRequest) {
  try {
    const { data, digest } = await req.json();
    if (!data || !digest) {
      return NextResponse.json({ error: "data and digest required" }, { status: 400 });
    }

    const { suiClient, walrusClient } = await getClients();

    await suiClient.waitForTransaction({ digest, timeout: 30_000 });

    const blob = new TextEncoder().encode(JSON.stringify(data));
    const flow = walrusClient.writeBlobFlow({ blob });
    const encoded = await flow.encode();
    await flow.upload({ digest });

    return NextResponse.json({ blobId: encoded.blobId });
  } catch (err) {
    console.error("[commit] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload blob" },
      { status: 500 }
    );
  }
}
