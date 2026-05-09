import { NextRequest, NextResponse } from "next/server";

const AGGREGATORS = [
  process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus.space",
  "https://walrus-mainnet-aggregator-1.staketab.org:443",
].filter(Boolean);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ blobId: string }> }
) {
  try {
    const { blobId } = await params;

    for (const aggregator of AGGREGATORS) {
      try {
        const res = await fetch(`${aggregator}/v1/blobs/${blobId}`, {
          headers: { Accept: "application/octet-stream" },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) continue;
        const bytes = await res.arrayBuffer();
        const text = Buffer.from(bytes).toString("utf-8");
        try {
          return NextResponse.json(JSON.parse(text));
        } catch {
          return new NextResponse(text, { status: 200, headers: { "Content-Type": "text/plain" } });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ error: "Blob not found on Walrus" }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
