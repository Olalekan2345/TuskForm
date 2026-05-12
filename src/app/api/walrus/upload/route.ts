import { NextRequest, NextResponse } from "next/server";
import { hasServerWallet, storeWithServerWallet } from "@/lib/serverWallet";

const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS ?? "52";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

const PUBLISHERS = [
  process.env.WALRUS_PUBLISHER_URL,
  "https://publisher.walrus-mainnet.walrus.space",
  "https://walrus-mainnet-publisher-1.staketab.org:443",
  "https://walrus.globalstake.io:9001",
].filter(Boolean) as string[];

async function tryPublisher(publisher: string, bytes: ArrayBuffer): Promise<string | null> {
  try {
    const res = await fetch(`${publisher}/v1/blobs?epochs=${WALRUS_EPOCHS}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[upload] ${publisher} → HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const blobId = data?.newlyCreated?.blobObject?.blobId ?? data?.alreadyCertified?.blobId;
    if (!blobId) {
      console.warn(`[upload] ${publisher} → no blobId:`, JSON.stringify(data).slice(0, 200));
    }
    return blobId ?? null;
  } catch (err) {
    console.warn(`[upload] ${publisher} → error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds 10 MiB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MiB)` },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();

    // Try publishers first (fast, free)
    for (const publisher of PUBLISHERS) {
      const blobId = await tryPublisher(publisher, bytes);
      if (blobId) {
        return NextResponse.json({ blobId, fileName: file.name, fileType: file.type, fileSize: file.size });
      }
    }

    // Fall back to server wallet (server pays WAL)
    console.log("[upload] all publishers failed. SERVER_WALLET_KEY set:", hasServerWallet());
    if (hasServerWallet()) {
      console.log("[upload] trying server wallet…");
      const blobId = await storeWithServerWallet(new Uint8Array(bytes));
      return NextResponse.json({ blobId, fileName: file.name, fileType: file.type, fileSize: file.size });
    }

    return NextResponse.json(
      { error: "All Walrus publishers failed. SERVER_WALLET_KEY not configured on server." },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
