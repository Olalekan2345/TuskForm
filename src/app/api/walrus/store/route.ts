import { NextRequest, NextResponse } from "next/server";
import { hasServerWallet, storeWithServerWallet } from "@/lib/serverWallet";
import { checkInternalAuth } from "@/lib/internalAuth";

const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS ?? "52";

const PUBLISHERS = [
  process.env.WALRUS_PUBLISHER_URL,
  "https://publisher.walrus-mainnet.walrus.space",
  "https://walrus-mainnet-publisher-1.staketab.org:443",
  "https://walrus.globalstake.io:9001",
].filter(Boolean) as string[];

async function tryPublisher(publisher: string, body: Uint8Array): Promise<string | null> {
  try {
    const res = await fetch(`${publisher}/v1/blobs?epochs=${WALRUS_EPOCHS}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: body as unknown as BodyInit,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[store] ${publisher} → HTTP ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const blobId = data?.newlyCreated?.blobObject?.blobId ?? data?.alreadyCertified?.blobId;
    if (!blobId) {
      console.warn(`[store] ${publisher} → no blobId:`, JSON.stringify(data).slice(0, 200));
    }
    return blobId ?? null;
  } catch (err) {
    console.warn(`[store] ${publisher} → error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authError = checkInternalAuth(req);
  if (authError) return authError;
  try {
    const body = Buffer.from(await req.text(), "utf-8");

    // Try publishers first (fast, free)
    for (const publisher of PUBLISHERS) {
      const blobId = await tryPublisher(publisher, body);
      if (blobId) return NextResponse.json({ blobId });
    }

    // Fall back to server wallet (server pays WAL)
    console.log("[store] all publishers failed. SERVER_WALLET_KEY set:", hasServerWallet());
    if (hasServerWallet()) {
      console.log("[store] trying server wallet…");
      const blobId = await storeWithServerWallet(body);
      return NextResponse.json({ blobId });
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
