/**
 * Deploys address_gate to Sui testnet by re-publishing the mainnet bytecode
 * (with the self-address zeroed out so the chain assigns a fresh address).
 *
 * Run: bunx tsx scripts/deploy-testnet.ts
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

// ── Config ────────────────────────────────────────────────────────────────────

const SERVER_WALLET_KEY = process.env.SERVER_WALLET_KEY ||
  "suiprivkey1qrncf27kl0r0e0acpv2t9cyaev8uqcstn2tku28vx9z7yt09szuhymvnj66";

// Patched bytecode: original mainnet module with self-address zeroed (0x0000...0000)
// This is the address_gate::seal_approve module compiled with Move bytecode v7.
const MODULE_BYTECODE_B64 =
  "oRzrCwcAAAUHAQAGAgYEAwoPBRkSBytJCHRADLQBQgACAQEBBgIAAgAABAABAAEDBAIAAgUFAgACCgIGCAAAAQUBAgEKAgEGCAAJVHhDb250ZXh0B2FkZHJlc3MMYWRkcmVzc19nYXRlCmZyb21fYnl0ZXMMc2VhbF9hcHByb3ZlBnNlbmRlcgp0eF9jb250ZXh0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAABAACFg4AQQMGIAAAAAAAAAAhBAYFCgsBAQYAAAAAAAAAACcLABEBDAILARECCwIhBBMFFQYAAAAAAAAAACcCAAA=";

// Standard Sui framework package addresses (same on testnet and mainnet)
const DEPENDENCIES = [
  "0x0000000000000000000000000000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000000000000000000000000000002",
];

// ── Deploy ────────────────────────────────────────────────────────────────────

async function main() {
  const testnet = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" });

  const { secretKey } = decodeSuiPrivateKey(SERVER_WALLET_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.getPublicKey().toSuiAddress();

  console.log(`Deploying from address: ${address}`);

  // Check balance and request faucet if needed
  const coins = await testnet.getCoins({ owner: address, coinType: "0x2::sui::SUI" });
  const balance = coins.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
  console.log(`Testnet SUI balance: ${balance / 1_000_000_000n} SUI`);

  if (balance < 100_000_000n) {
    console.log("Requesting testnet SUI from faucet...");
    const faucetRes = await fetch("https://faucet.testnet.sui.io/gas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
    });
    const faucetData = await faucetRes.json();
    console.log("Faucet response:", JSON.stringify(faucetData));

    // Wait for the coin to arrive
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Build publish transaction
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules: [MODULE_BYTECODE_B64],
    dependencies: DEPENDENCIES,
  });
  tx.transferObjects([upgradeCap], tx.pure.address(address));
  tx.setGasBudget(100_000_000);

  console.log("Submitting publish transaction...");
  const result = await testnet.signAndExecuteTransaction({
    transaction: tx as never,
    signer: keypair,
    options: { showObjectChanges: true, showEffects: true },
  });

  if (result.effects?.status.status !== "success") {
    console.error("Transaction failed:", JSON.stringify(result.effects?.status, null, 2));
    process.exit(1);
  }

  const packageObj = result.objectChanges?.find((c) => c.type === "published");
  if (!packageObj || packageObj.type !== "published") {
    console.error("No published package found in object changes");
    process.exit(1);
  }

  const packageId = packageObj.packageId;
  console.log("\n✓ Deployed successfully!");
  console.log(`Package ID (testnet): ${packageId}`);
  console.log(`Transaction digest: ${result.digest}`);
  console.log(`\nAdd to .env.local and Railway:\nNEXT_PUBLIC_SEAL_PACKAGE_ID=${packageId}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
