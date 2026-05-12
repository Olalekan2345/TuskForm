import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";

// Module-level singletons survive across warm Lambda invocations.
// WASM is instantiated once; system state (n_shards, node list) is cached.
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
      storageNodeClientOptions: { timeout: 8_000 },
    });
  }
  return { walrusClient: _walrusClient! };
}

// Walrus SDK relay protocol: POST /v1/blob-upload-relay?blob_id=<id>
// The browser sends the raw blob bytes after the user has signed the register TX.
// We encode slivers server-side (avoiding browser CORS issues with storage nodes),
// upload to the Walrus network, and return the confirmation certificate so the
// browser can submit the on-chain certify transaction.
export async function POST(req: NextRequest) {
  try {
    const blobId = req.nextUrl.searchParams.get("blob_id");
    if (!blobId) {
      return NextResponse.json({ error: "blob_id required" }, { status: 400 });
    }

    const blobBytes = new Uint8Array(await req.arrayBuffer());
    if (!blobBytes.length) {
      return NextResponse.json({ error: "empty blob body" }, { status: 400 });
    }

    const { walrusClient } = await getClients();

    // Full RS erasure encoding — the heavy WASM step
    const encoded = await walrusClient.encodeBlob(blobBytes);

    // Upload slivers in parallel to all storage nodes (server-to-node, no CORS)
    const confirmations = await walrusClient.writeEncodedBlobToNodes({
      blobId,
      metadata: encoded.metadata,
      sliversByNode: encoded.sliversByNode,
      deletable: false,
    });

    // Build BLS aggregate certificate from node confirmations
    const certificate = await walrusClient.certificateFromConfirmations({
      confirmations,
      blobId,
      deletable: false,
    });

    // Return certificate in the format the SDK relay client expects
    return NextResponse.json({
      confirmation_certificate: {
        signers: certificate.signers,
        serialized_message: Array.from(certificate.serializedMessage),
        signature: Buffer.from(certificate.signature).toString("base64url"),
      },
    });
  } catch (err) {
    console.error("[blob-upload-relay] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Relay upload failed" },
      { status: 500 }
    );
  }
}
