import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Vercel Pro/Enterprise: extend timeout to 60 s so the parallel node writes complete.
export const maxDuration = 60;

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";

export async function POST(req: NextRequest) {
  try {
    const { data, digest } = await req.json();
    if (!data || !digest) {
      return NextResponse.json({ error: "data and digest required" }, { status: 400 });
    }

    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");

    const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });

    // Wait for the register TX to land on-chain so the blob object is findable.
    await suiClient.waitForTransaction({ digest, timeout: 30_000 });

    const walrusClient = new WalrusClient({
      network: WALRUS_NETWORK,
      suiClient,
      // Cap per-node request timeout at 8 s. Nodes run in parallel so 98 nodes
      // still complete in ~8 s total; 30 s (default) would overflow Vercel limits.
      storageNodeClientOptions: { timeout: 8_000 },
    });

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
