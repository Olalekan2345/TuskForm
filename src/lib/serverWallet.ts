// Server-side Walrus storage using a funded server wallet.
// Set SERVER_WALLET_KEY in Railway env vars (export from Sui Wallet as suiprivkey1…).
// The wallet needs SUI (gas) and WAL (storage) tokens.

const WALRUS_NETWORK = (process.env.WALRUS_NETWORK ?? "mainnet") as "mainnet" | "testnet";
const SUI_GRPC_URL =
  WALRUS_NETWORK === "mainnet"
    ? "https://fullnode.mainnet.sui.io:443"
    : "https://fullnode.testnet.sui.io:443";
const WALRUS_EPOCHS = parseInt(process.env.WALRUS_EPOCHS ?? "52", 10);

let _walrusClient: import("@mysten/walrus").WalrusClient | null = null;
let _suiClient: import("@mysten/sui/grpc").SuiGrpcClient | null = null;

async function getClients() {
  if (!_walrusClient || !_suiClient) {
    const { WalrusClient } = await import("@mysten/walrus");
    const { SuiGrpcClient } = await import("@mysten/sui/grpc");
    _suiClient = new SuiGrpcClient({ network: WALRUS_NETWORK, baseUrl: SUI_GRPC_URL });
    _walrusClient = new WalrusClient({
      network: WALRUS_NETWORK,
      suiClient: _suiClient,
      storageNodeClientOptions: { timeout: 12_000 },
    });
  }
  return _walrusClient!;
}

export function hasServerWallet(): boolean {
  return !!process.env.SERVER_WALLET_KEY;
}

export async function storeWithServerWallet(bytes: Uint8Array): Promise<string> {
  const { decodeSuiPrivateKey } = await import("@mysten/sui/cryptography");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");

  const raw = process.env.SERVER_WALLET_KEY!;
  let keypair: InstanceType<typeof Ed25519Keypair>;

  if (raw.startsWith("suiprivkey")) {
    const { secretKey } = decodeSuiPrivateKey(raw);
    keypair = Ed25519Keypair.fromSecretKey(secretKey);
  } else {
    // Fallback: treat as raw base64
    keypair = Ed25519Keypair.fromSecretKey(raw);
  }

  const walrusClient = await getClients();
  const { blobId } = await walrusClient.writeBlob({
    blob: bytes,
    signer: keypair,
    epochs: WALRUS_EPOCHS,
    deletable: false,
  });

  return blobId;
}
