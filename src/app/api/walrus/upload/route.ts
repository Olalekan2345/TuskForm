import { NextRequest, NextResponse } from "next/server";

const WALRUS_EPOCHS = process.env.WALRUS_EPOCHS ?? "52";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB

const PUBLISHERS = [
  process.env.WALRUS_PUBLISHER_URL ?? "https://walrus-mainnet-publisher-1.staketab.org:443",
  "http://walrus.globalstake.io:9000",
].filter(Boolean);

async function tryPublisher(publisher: string, bytes: ArrayBuffer, contentType: string): Promise<{ blobId: string } | null> {
  try {
    const res = await fetch(`${publisher}/v1/blobs?epochs=${WALRUS_EPOCHS}`, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const blobId =
      data?.newlyCreated?.blobObject?.blobId ??
      data?.alreadyCertified?.blobId;
    return blobId ? { blobId } : null;
  } catch {
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
    const contentType = file.type || "application/octet-stream";

    for (const publisher of PUBLISHERS) {
      const result = await tryPublisher(publisher, bytes, contentType);
      if (result) {
        return NextResponse.json({
          blobId: result.blobId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
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
