import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
const WALRUS_EPOCHS = parseInt(process.env.WALRUS_EPOCHS ?? "52", 10);

// Encodes a JSON blob on the server, builds the Walrus register transaction
// using the caller's WAL coins, and returns pre-built BCS bytes for wallet signing.
// The caller signs with their wallet (paying WAL), then POSTs the tx digest to /api/walrus/commit.
export async function POST(req: NextRequest) {
  try {
    const { data, owner } = await req.json();
    if (!data || !owner) {
      return NextResponse.json({ error: "data and owner required" }, { status: 400 });
    }

    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");
    const { Transaction } = await import("@mysten/sui/transactions");

    const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
    const walrusClient = new WalrusClient({ network: WALRUS_NETWORK, suiClient });

    const blob = new TextEncoder().encode(JSON.stringify(data));
    const flow = walrusClient.writeBlobFlow({ blob });
    const encoded = await flow.encode();

    // Build register TX — CoinWithBalance resolved server-side using owner's address
    const tx = flow.register({ owner, epochs: WALRUS_EPOCHS, deletable: false });
    tx.setSenderIfNotSet(owner);

    // Build fully resolved BCS bytes (resolves CoinWithBalance using owner's real coins)
    const bytes = await tx.build({ client: suiClient });
    const txBase64 = Buffer.from(bytes).toString("base64");

    return NextResponse.json({ txBase64, blobId: encoded.blobId });
  } catch (err) {
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build register transaction" },
      { status: 500 }
    );
  }
}
