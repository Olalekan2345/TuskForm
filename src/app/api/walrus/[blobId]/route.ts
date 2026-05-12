import { NextRequest, NextResponse } from "next/server";

const AGGREGATORS = [
  process.env.WALRUS_AGGREGATOR_URL,
  "https://aggregator.walrus-mainnet.walrus.space",
  "https://walrus-mainnet-aggregator-1.staketab.org:443",
  "https://walrus.globalstake.io:9000",
  "https://walrus-mainnet.nodeinfra.com",
  "https://walrus.bwarelabs.com",
].filter((v, i, a) => v && a.indexOf(v) === i) as string[]; // dedupe

async function tryAggregator(aggregator: string, blobId: string): Promise<Response | null> {
  try {
    const res = await fetch(`${aggregator}/v1/blobs/${blobId}`, {
      headers: { Accept: "application/octet-stream" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return res;
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ blobId: string }> }
) {
  try {
    const { blobId } = await params;

    // Try all aggregators. If all return 404, wait and retry twice —
    // blobs sometimes take 5-10s to propagate after certification.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(attempt * 3_000);

      for (const aggregator of AGGREGATORS) {
        const res = await tryAggregator(aggregator, blobId);
        if (!res) continue;

        const bytes = await res.arrayBuffer();
        const text = Buffer.from(bytes).toString("utf-8");
        try {
          return NextResponse.json(JSON.parse(text));
        } catch {
          return new NextResponse(text, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
      }
    }

    return NextResponse.json(
      { error: `Walrus fetch failed (404) for blob: ${blobId}` },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
