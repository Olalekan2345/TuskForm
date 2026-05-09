import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";

// After user signs the register transaction client-side, this endpoint
// uploads the blob slivers to Walrus storage nodes using the tx digest.
export async function POST(req: NextRequest) {
  try {
    const { data, digest } = await req.json();
    if (!data || !digest) {
      return NextResponse.json({ error: "data and digest required" }, { status: 400 });
    }

    // Lazy-import to avoid WASM loading at build time
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");

    const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
    const walrusClient = new WalrusClient({ network: WALRUS_NETWORK, suiClient });

    const blob = new TextEncoder().encode(JSON.stringify(data));
    const flow = walrusClient.writeBlobFlow({ blob });

    // Re-encode (deterministic — same data → same blobId)
    const encoded = await flow.encode();

    // Upload slivers to storage nodes using the on-chain blob object from the register tx
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
