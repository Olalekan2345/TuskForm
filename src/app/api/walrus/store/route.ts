import { NextRequest, NextResponse } from "next/server";

const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS ?? "52";

// Official Mysten Labs publisher first — most reliable.
// Community publishers as fallbacks. Env override goes to front of the list.
const PUBLISHERS = [
  process.env.WALRUS_PUBLISHER_URL,
  "https://publisher.walrus.space",
  "https://walrus-mainnet-publisher-1.staketab.org:443",
  "https://walrus.globalstake.io:9001",
].filter(Boolean) as string[];

async function tryPublisher(publisher: string, body: Uint8Array): Promise<{ blobId: string; alreadyExisted: boolean } | null> {
  try {
    const res = await fetch(`${publisher}/v1/blobs?epochs=${WALRUS_EPOCHS}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const blobId =
      data?.newlyCreated?.blobObject?.blobId ??
      data?.alreadyCertified?.blobId;
    if (!blobId) return null;
    return { blobId, alreadyExisted: !!data?.alreadyCertified };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = Buffer.from(await req.text(), "utf-8");

    for (const publisher of PUBLISHERS) {
      const result = await tryPublisher(publisher, body);
      if (result) {
        return NextResponse.json(result);
      }
    }

    return NextResponse.json(
      { error: "All Walrus publishers failed. Check network or try again." },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
