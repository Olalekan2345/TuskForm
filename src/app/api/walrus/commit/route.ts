import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";

// Publishers used as upload relays — they distribute slivers to storage nodes
// on our behalf, avoiding direct-node connectivity issues from Vercel servers.
const RELAY_PUBLISHERS = [
  process.env.WALRUS_PUBLISHER_URL ?? "https://walrus-mainnet-publisher-1.staketab.org:443",
  "https://walrus-publisher.brightlystake.com",
  "http://walrus.globalstake.io:9000",
].filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const { data, digest } = await req.json();
    if (!data || !digest) {
      return NextResponse.json({ error: "data and digest required" }, { status: 400 });
    }

    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");

    const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });

    // Wait for the register TX to be finalized so the SDK can find the blob object.
    await suiClient.waitForTransaction({ digest, timeout: 30_000 });

    const blob = new TextEncoder().encode(JSON.stringify(data));

    // Try each publisher as an upload relay. The relay accepts pre-encoded slivers
    // and distributes them to storage nodes — works where direct node connections fail.
    for (const relayHost of RELAY_PUBLISHERS) {
      try {
        const walrusClient = new WalrusClient({
          network: WALRUS_NETWORK,
          suiClient,
          uploadRelay: { host: relayHost, sendTip: null },
        });
        const flow = walrusClient.writeBlobFlow({ blob });
        const encoded = await flow.encode();
        await flow.upload({ digest });
        return NextResponse.json({ blobId: encoded.blobId });
      } catch (err) {
        console.warn(`[commit] relay ${relayHost} failed:`, err);
      }
    }

    // Last resort: attempt direct storage node connections
    try {
      const walrusClient = new WalrusClient({ network: WALRUS_NETWORK, suiClient });
      const flow = walrusClient.writeBlobFlow({ blob });
      const encoded = await flow.encode();
      await flow.upload({ digest });
      return NextResponse.json({ blobId: encoded.blobId });
    } catch (err) {
      console.error("[commit] direct node upload failed:", err);
      throw err;
    }
  } catch (err) {
    console.error("[commit] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload blob" },
      { status: 500 }
    );
  }
}
