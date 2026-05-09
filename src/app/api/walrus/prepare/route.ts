import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
const WALRUS_EPOCHS = parseInt(process.env.WALRUS_EPOCHS ?? "5", 10);

// Returns estimated WAL cost for storing a blob of given size
export async function POST(req: NextRequest) {
  try {
    const { size } = await req.json();
    if (typeof size !== "number" || size <= 0) {
      return NextResponse.json({ error: "size required" }, { status: 400 });
    }

    // Lazy-import to avoid WASM loading at build time
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");

    const suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
    const walrusClient = new WalrusClient({ network: WALRUS_NETWORK, suiClient });
    const { writeCost } = await walrusClient.storageCost(size, WALRUS_EPOCHS);

    return NextResponse.json({
      writeCost: writeCost.toString(),
      epochs: WALRUS_EPOCHS,
      network: WALRUS_NETWORK,
    });
  } catch (err) {
    console.error("[prepare] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get storage cost" },
      { status: 500 }
    );
  }
}
