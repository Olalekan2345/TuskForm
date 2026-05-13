import { NextRequest, NextResponse } from "next/server";

const AGGREGATOR =
  process.env.WALRUS_AGGREGATOR_URL ||
  "https://aggregator.walrus-mainnet.walrus.space";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const blobId   = searchParams.get("blobId");
  const fileName = searchParams.get("fileName") || "download";
  const fileType = searchParams.get("fileType") || "application/octet-stream";
  const inline   = searchParams.get("inline") === "1";

  if (!blobId) {
    return NextResponse.json({ error: "blobId required" }, { status: 400 });
  }

  const upstream = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, {
    headers: { Accept: "application/octet-stream" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Blob not found: ${blobId}` },
      { status: upstream.status }
    );
  }

  const disposition = inline
    ? `inline; filename="${fileName}"`
    : `attachment; filename="${fileName}"`;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": fileType,
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
