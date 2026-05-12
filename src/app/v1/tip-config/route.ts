import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Walrus SDK relay protocol: GET /v1/tip-config
// Returning a JSON string causes the SDK to treat this as "no tip required"
// (requiresTip=false). The register TX will still include the auth payload
// so the relay can verify the upload, but no WAL tip is charged.
export async function GET() {
  return NextResponse.json("no-tip-required");
}
